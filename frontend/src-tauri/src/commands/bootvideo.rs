use std::path::Path;

use serde_json::{json, Value};
use tauri::AppHandle;

use crate::paths;

const MEDIA_SCHEME: &str = "hashi-media";

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

/// Fase 4: descarga streaming con progreso por chunks + evento
/// `boot-video-progress`.
#[tauri::command]
pub fn download_boot_video(url: String, target: String, video_id: Option<String>) -> Value {
  let _ = (url, video_id);
  let _ = target;
  paths::failure("Pendiente (fase 4): descarga de boot/suspend videos")
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
