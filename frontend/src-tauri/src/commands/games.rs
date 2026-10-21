use serde_json::{json, Value};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::paths;

#[tauri::command]
pub fn get_games(app: AppHandle) -> Value {
  paths::read_json(&app, "games.json").unwrap_or_else(|| json!([]))
}

#[tauri::command]
pub fn save_games(app: AppHandle, games: Value) -> Value {
  match paths::write_json(&app, "games.json", &games) {
    Ok(()) => paths::success(),
    Err(err) => paths::failure(err),
  }
}

#[tauri::command]
pub async fn select_game_file(app: AppHandle) -> Option<String> {
  #[cfg(windows)]
  let builder = app
    .dialog()
    .file()
    .add_filter("Ejecutables y Accesos Directos", &["exe", "lnk", "bat", "cmd", "sh", "app"]);
  #[cfg(not(windows))]
  let builder = app
    .dialog()
    .file()
    .add_filter("Ejecutables y accesos directos", &["sh", "run", "AppImage", "desktop", "bin", "exe"]);

  let picked = builder
    .add_filter("Todos los archivos", &["*"])
    .blocking_pick_file()?;
  picked.into_path().ok().map(|path| path.to_string_lossy().to_string())
}

/// Fase 4: implementar con `SHGetFileInfo` + GDI en Windows y lookup
/// freedesktop en Linux. Devuelve `null` (igual que el handler de Electron
/// cuando falla) para que el renderer use su icono de respaldo.
#[tauri::command]
pub async fn get_file_icon(_file_path: String) -> Option<String> {
  None
}

/// Fase 3: spawn de juegos, Wine/Proton, steam:// y monitoreo de sesión.
#[tauri::command]
pub fn launch_game(_game_id: String, _exe_path: String, _launch_method: Option<String>) -> Value {
  json!({
    "success": false,
    "tracked": false,
    "startTime": 0,
    "error": "Pendiente (fase 3): lanzamiento de juegos"
  })
}
