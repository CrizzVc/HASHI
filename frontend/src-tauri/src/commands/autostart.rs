use serde_json::{json, Value};
use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;

use crate::paths;

/// Nota: Electron creaba un `.lnk` en la carpeta de Inicio **y** usaba
/// `setLoginItemSettings`. Aquí usamos el registro de autoarranque del plugin
/// (equivalente en comportamiento para el usuario final).
#[tauri::command]
pub fn create_startup_shortcut(app: AppHandle) -> Value {
  match app.autolaunch().enable() {
    Ok(()) => paths::success(),
    Err(err) => paths::failure(err.to_string()),
  }
}

#[tauri::command]
pub fn get_startup_status(app: AppHandle) -> Value {
  match app.autolaunch().is_enabled() {
    Ok(enabled) => json!({ "enabled": enabled }),
    Err(_) => json!({ "enabled": false }),
  }
}

#[tauri::command]
pub fn remove_startup_shortcut(app: AppHandle) -> Value {
  match app.autolaunch().disable() {
    Ok(()) => paths::success(),
    Err(err) => paths::failure(err.to_string()),
  }
}
