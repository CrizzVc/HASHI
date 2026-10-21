use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::paths;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
  name: String,
  avatar: Option<String>,
}

#[tauri::command]
pub fn get_profile(app: AppHandle) -> Profile {
  paths::read_json(&app, "profile.json")
    .and_then(|value| serde_json::from_value(value).ok())
    .unwrap_or(Profile { name: String::new(), avatar: None })
}

#[tauri::command]
pub fn save_profile(app: AppHandle, profile: Profile) -> Value {
  let value = match serde_json::to_value(&profile) {
    Ok(value) => value,
    Err(err) => return paths::failure(err.to_string()),
  };
  match paths::write_json(&app, "profile.json", &value) {
    Ok(()) => paths::success(),
    Err(err) => paths::failure(err),
  }
}

#[tauri::command]
pub async fn select_profile_image(app: AppHandle) -> Option<String> {
  let picked = app
    .dialog()
    .file()
    .add_filter("Imágenes", &["jpg", "jpeg", "png", "webp", "bmp", "gif"])
    .blocking_pick_file()?;
  let path = picked.into_path().ok()?;
  paths::file_to_data_url(&path)
}
