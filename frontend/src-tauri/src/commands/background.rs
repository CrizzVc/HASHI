use std::path::PathBuf;

use serde_json::{json, Value};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::paths;

fn background_base(app: &AppHandle) -> Result<PathBuf, String> {
  paths::data_file(app, "background")
}

fn remove_existing_backgrounds(app: &AppHandle) {
  if let Ok(base) = background_base(app) {
    for ext in paths::IMAGE_EXTS {
      let _ = std::fs::remove_file(base.with_extension(ext));
    }
  }
}

fn current_background(app: &AppHandle) -> Option<PathBuf> {
  let base = background_base(app).ok()?;
  paths::IMAGE_EXTS
    .iter()
    .map(|ext| base.with_extension(ext))
    .find(|path| path.exists())
}

#[tauri::command]
pub async fn select_background_image(app: AppHandle) -> Option<String> {
  let picked = app
    .dialog()
    .file()
    .add_filter("Imágenes", &["jpg", "jpeg", "png", "webp", "bmp", "gif"])
    .blocking_pick_file()?;
  let src = picked.into_path().ok()?;
  let ext = src
    .extension()
    .and_then(|value| value.to_str())
    .unwrap_or("")
    .to_lowercase();

  remove_existing_backgrounds(&app);

  let base = background_base(&app).ok()?;
  let dest = if ext.is_empty() { base.clone() } else { base.with_extension(&ext) };
  std::fs::copy(&src, &dest).ok()?;
  paths::file_to_data_url(&dest)
}

#[tauri::command]
pub fn get_background_image(app: AppHandle) -> Option<String> {
  current_background(&app).and_then(|path| paths::file_to_data_url(&path))
}

#[tauri::command]
pub fn clear_background_image(app: AppHandle) -> Value {
  remove_existing_backgrounds(&app);
  json!({ "success": true })
}
