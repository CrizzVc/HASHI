use std::path::{Path, PathBuf};

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

pub const IMAGE_EXTS: [&str; 6] = ["jpg", "jpeg", "png", "webp", "bmp", "gif"];

/// Directorio de datos de la app (`%APPDATA%\com.hashi.app` en Windows).
pub fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
  let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
  let _ = std::fs::create_dir_all(&dir);
  Ok(dir)
}

pub fn data_file(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
  Ok(data_dir(app)?.join(name))
}

pub fn read_json(app: &AppHandle, name: &str) -> Option<Value> {
  let path = data_file(app, name).ok()?;
  let raw = std::fs::read_to_string(path).ok()?;
  serde_json::from_str(&raw).ok()
}

pub fn write_json(app: &AppHandle, name: &str, value: &Value) -> Result<(), String> {
  let path = data_file(app, name)?;
  let text = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
  std::fs::write(path, text).map_err(|e| e.to_string())
}

pub fn mime_for_ext(ext: &str) -> &'static str {
  match ext {
    "png" => "image/png",
    "webp" => "image/webp",
    "gif" => "image/gif",
    "bmp" => "image/bmp",
    _ => "image/jpeg",
  }
}

pub fn file_to_data_url(path: &Path) -> Option<String> {
  let ext = path.extension()?.to_str()?.to_lowercase();
  let data = std::fs::read(path).ok()?;
  Some(format!("data:{};base64,{}", mime_for_ext(&ext), BASE64.encode(data)))
}

/// Convierte un `SystemTime` en milisegundos (equivalente a `mtimeMs` de Node).
pub fn system_time_ms(t: std::time::SystemTime) -> u64 {
  t.duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

pub fn mtime_ms(path: &Path) -> Option<u64> {
  std::fs::metadata(path).ok()?.modified().ok().map(system_time_ms)
}

pub fn success() -> Value {
  json!({ "success": true })
}

pub fn failure(error: impl Into<String>) -> Value {
  json!({ "success": false, "error": error.into() })
}
