use std::io::Read;
use std::path::Path;

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};

use crate::paths;

pub const MEDIA_SCHEME: &str = "hashi-media";

/// Equivalente a `encodeURIComponent` de JavaScript (percent-encoding UTF-8
/// sobre los bytes, dejando sin escapar `A-Za-z0-9-_.!~*'()`).
fn encode_uri_component(value: &str) -> String {
  let mut out = String::with_capacity(value.len());
  for byte in value.bytes() {
    match byte {
      b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'!' | b'~' | b'*' | b'\''
      | b'(' | b')' => out.push(byte as char),
      _ => out.push_str(&format!("%{byte:02X}")),
    }
  }
  out
}

/// Convierte una ruta absoluta en una URL servible por `hashi-media://`
/// (misma forma que `toMediaUrl` de Electron: host `local-file`, path
/// percent-encoded y `?v=<mtime>` como cache-busting).
pub fn to_media_url(abs_path: &Path) -> String {
  let version = paths::mtime_ms(abs_path)
    .map(|mtime| format!("?v={mtime}"))
    .unwrap_or_default();
  format!(
    "{MEDIA_SCHEME}://local-file/{}{version}",
    encode_uri_component(&abs_path.to_string_lossy())
  )
}

fn splash_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
  Ok(paths::data_dir(app)?.join("splash"))
}

fn splash_file(app: &AppHandle, target: &str) -> Option<std::path::PathBuf> {
  Some(splash_dir(app).ok()?.join(format!("{target}.webm")))
}

#[tauri::command]
pub fn get_boot_video_path(app: AppHandle) -> Value {
  let boot = splash_file(&app, "boot").filter(|path| path.exists()).map(|path| to_media_url(&path));
  let suspend = splash_file(&app, "suspend").filter(|path| path.exists()).map(|path| to_media_url(&path));
  json!({ "boot": boot, "suspend": suspend })
}

/// Descarga streaming de un boot/suspend video desde una URL (SteamDeckRepo)
/// emitiendo eventos `boot-video-progress` por cada chunk para que el frontend
/// muestre la barra de progreso.
#[tauri::command]
pub async fn download_boot_video(
  app: AppHandle,
  url: String,
  target: String,
  video_id: Option<String>,
) -> Value {
  if target != "boot" && target != "suspend" {
    return paths::failure(format!("Target inválido: {target}"));
  }
  if !url.starts_with("http://") && !url.starts_with("https://") {
    return paths::failure("URL de descarga inválida.");
  }

  let dir = match splash_dir(&app) {
    Ok(dir) => dir,
    Err(err) => return paths::failure(err),
  };
  if let Err(err) = std::fs::create_dir_all(&dir) {
    return paths::failure(err.to_string());
  }

  // Progreso inicial: 0%
  let _ = app.emit(
    "boot-video-progress",
    json!({
      "target": &target,
      "percent": 0,
      "receivedBytes": 0,
      "totalBytes": 0,
      "videoId": &video_id
    }),
  );

  let client = match reqwest::Client::builder()
    .user_agent("HASHI/1.0")
    .timeout(std::time::Duration::from_secs(120))
    .build()
  {
    Ok(client) => client,
    Err(err) => return paths::failure(err.to_string()),
  };

  let response = match client.get(&url).send().await {
    Ok(response) => response,
    Err(err) => return paths::failure(err.to_string()),
  };

  if !response.status().is_success() {
    return paths::failure(format!(
      "SteamDeckRepo respondió {} {}",
      response.status().as_u16(),
      response.status().canonical_reason().unwrap_or("")
    ));
  }

  // Validar que no es HTML (página de error)
  if let Some(ct) = response.headers().get("content-type").and_then(|v| v.to_str().ok()) {
    if ct.contains("text/html") {
      return paths::failure(
        "La URL no devolvió un archivo de video (recibido HTML). Intente con otro video.",
      );
    }
  }

  let total_bytes = response.content_length().unwrap_or(0);
  let dest_path = dir.join(format!("{target}.webm"));
  let tmp_path = dir.join(format!("{target}.webm.tmp"));

  // Streaming por chunks con progreso
  let mut received_bytes: u64 = 0;
  let mut stream = response.bytes_stream();

  {
    use futures_util::StreamExt;
    let mut file = match std::fs::File::create(&tmp_path) {
      Ok(file) => file,
      Err(err) => return paths::failure(err.to_string()),
    };

    while let Some(chunk_result) = stream.next().await {
      let chunk = match chunk_result {
        Ok(chunk) => chunk,
        Err(err) => {
          let _ = std::fs::remove_file(&tmp_path);
          return paths::failure(err.to_string());
        }
      };
      if let Err(err) = std::io::Write::write_all(&mut file, &chunk) {
        let _ = std::fs::remove_file(&tmp_path);
        return paths::failure(err.to_string());
      }
      received_bytes += chunk.len() as u64;
      let percent = if total_bytes > 0 {
        std::cmp::min(99, (received_bytes * 100 / total_bytes) as u64)
      } else {
        0
      };
      let _ = app.emit(
        "boot-video-progress",
        json!({
          "target": &target,
          "percent": percent,
          "receivedBytes": received_bytes,
          "totalBytes": total_bytes,
          "videoId": &video_id
        }),
      );
    }
  }

  // Sanity check: archivo de al menos 1 KB
  if received_bytes < 1024 {
    let _ = std::fs::remove_file(&tmp_path);
    return paths::failure("El archivo descargado es demasiado pequeño para ser un video válido.");
  }

  // Renombrado seguro (con fallback a copy si EPERM/EBUSY en Windows)
  if dest_path.exists() {
    let _ = std::fs::remove_file(&dest_path);
  }
  if let Err(err) = std::fs::rename(&tmp_path, &dest_path) {
    // Fallback: copy + remove
    if let Err(copy_err) = std::fs::copy(&tmp_path, &dest_path) {
      let _ = std::fs::remove_file(&tmp_path);
      return paths::failure(copy_err.to_string());
    }
    let _ = std::fs::remove_file(&tmp_path);
    log::warn!(
      "[BootVideo] rename falló ({err}), se usó copy como fallback"
    );
  }

  // Progreso final: 100%
  let _ = app.emit(
    "boot-video-progress",
    json!({
      "target": &target,
      "percent": 100,
      "receivedBytes": total_bytes,
      "totalBytes": total_bytes,
      "videoId": &video_id
    }),
  );

  json!({ "success": true, "path": to_media_url(&dest_path) })
}

#[tauri::command]
pub fn delete_boot_video(app: AppHandle, target: String) -> Value {
  if target != "boot" && target != "suspend" {
    return paths::failure("Target inválido");
  }
  let Some(path) = splash_file(&app, &target) else {
    return paths::failure("Archivo no encontrado");
  };
  if path.exists() {
    match std::fs::remove_file(&path) {
      Ok(()) => paths::success(),
      Err(err) => paths::failure(err.to_string()),
    }
  } else {
    paths::failure("Archivo no encontrado")
  }
}

/// Handler del protocolo `hashi-media://`. Sirve archivos locales restringidos
/// a la carpeta `app_data_dir` (equivale al `protocol.handle` de Electron).
/// Soporta HTTP Range requests para que `<video>` pueda hacer seek.
pub fn handle_media_protocol(
  app: &AppHandle,
  request: http::Request<Vec<u8>>,
) -> http::Response<Vec<u8>> {
  let uri = request.uri().to_string();

  // Extraer la ruta del archivo de la URL hashi-media://local-file/<encoded-path>?v=...
  let file_path = (|| -> Option<std::path::PathBuf> {
    let after_scheme = uri.strip_prefix(&format!("{MEDIA_SCHEME}://local-file/"))?;
    let path_part = after_scheme.split('?').next()?;
    let decoded = urlencoding::decode(path_part).ok()?;
    Some(std::path::PathBuf::from(decoded.as_ref()))
  })();

  let Some(file_path) = file_path else {
    return http::Response::builder()
      .status(400)
      .body(b"Bad request".to_vec())
      .unwrap_or_default();
  };

  // Restringir al directorio de datos de la app
  let data_dir = match app.path().app_data_dir() {
    Ok(dir) => dir,
    Err(_) => {
      return http::Response::builder()
        .status(500)
        .body(b"Internal error".to_vec())
        .unwrap_or_default();
    }
  };

  let canonical_file = std::fs::canonicalize(&file_path).unwrap_or_else(|_| file_path.clone());
  let canonical_data = std::fs::canonicalize(&data_dir).unwrap_or_else(|_| data_dir.clone());
  if !canonical_file.starts_with(&canonical_data) {
    return http::Response::builder()
      .status(403)
      .body(b"Forbidden".to_vec())
      .unwrap_or_default();
  }

  if !file_path.exists() {
    return http::Response::builder()
      .status(404)
      .body(b"Not found".to_vec())
      .unwrap_or_default();
  }

  let file_size = std::fs::metadata(&file_path)
    .map(|m| m.len())
    .unwrap_or(0);

  let content_type = if file_path.to_string_lossy().ends_with(".webm") {
    "video/webm"
  } else if file_path.to_string_lossy().ends_with(".mp4") {
    "video/mp4"
  } else {
    "application/octet-stream"
  };

  // Parsear Range header para soporte de seek en <video>
  let range_header = request
    .headers()
    .get("range")
    .and_then(|v| v.to_str().ok())
    .unwrap_or("");

  if let Some(range_str) = range_header.strip_prefix("bytes=") {
    let parts: Vec<&str> = range_str.split('-').collect();
    let start: u64 = parts.first().and_then(|s| s.parse().ok()).unwrap_or(0);
    let end: u64 = parts
      .get(1)
      .and_then(|s| if s.is_empty() { None } else { s.parse().ok() })
      .unwrap_or(file_size.saturating_sub(1));
    let end = std::cmp::min(end, file_size.saturating_sub(1));
    let length = end - start + 1;

    let mut file = match std::fs::File::open(&file_path) {
      Ok(file) => file,
      Err(_) => {
        return http::Response::builder()
          .status(500)
          .body(b"Read error".to_vec())
          .unwrap_or_default();
      }
    };

    if let Err(_) = std::io::Seek::seek(&mut file, std::io::SeekFrom::Start(start)) {
      return http::Response::builder()
        .status(500)
        .body(b"Seek error".to_vec())
        .unwrap_or_default();
    }

    let mut buf = vec![0u8; length as usize];
    if let Err(_) = file.read_exact(&mut buf) {
      // Si no pudimos leer exactamente length bytes, intenta leer lo que se pueda
      let _ = std::io::Seek::seek(&mut file, std::io::SeekFrom::Start(start));
      buf.clear();
      buf.resize(length as usize, 0);
      let _ = file.read(&mut buf);
    }

    return http::Response::builder()
      .status(206)
      .header("Content-Type", content_type)
      .header("Content-Length", length.to_string())
      .header("Content-Range", format!("bytes {start}-{end}/{file_size}"))
      .header("Accept-Ranges", "bytes")
      .header("Cache-Control", "no-store, must-revalidate")
      .body(buf)
      .unwrap_or_default();
  }

  // Sin Range: devolver el archivo completo
  let body = std::fs::read(&file_path).unwrap_or_default();
  http::Response::builder()
    .status(200)
    .header("Content-Type", content_type)
    .header("Content-Length", file_size.to_string())
    .header("Accept-Ranges", "bytes")
    .header("Cache-Control", "no-store, must-revalidate")
    .body(body)
    .unwrap_or_default()
}
