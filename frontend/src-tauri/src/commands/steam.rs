use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::AppHandle;

use crate::paths;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SteamAccount {
  linked: bool,
  api_key: String,
  steam_id: String,
  account_name: String,
  steam_id64: Option<String>,
}

impl Default for SteamAccount {
  fn default() -> Self {
    Self {
      linked: false,
      api_key: String::new(),
      steam_id: String::new(),
      account_name: String::new(),
      steam_id64: None,
    }
  }
}

#[tauri::command]
pub fn get_steam_account(app: AppHandle) -> SteamAccount {
  paths::read_json(&app, "steam-account.json")
    .and_then(|value| serde_json::from_value(value).ok())
    .unwrap_or_default()
}

#[tauri::command]
pub fn save_steam_account(app: AppHandle, steam_account: SteamAccount) -> Value {
  let value = match serde_json::to_value(&steam_account) {
    Ok(value) => value,
    Err(err) => return paths::failure(err.to_string()),
  };
  match paths::write_json(&app, "steam-account.json", &value) {
    Ok(()) => paths::success(),
    Err(err) => paths::failure(err),
  }
}

/// Fase 4: servidor loopback en `127.0.0.1:8765` + apertura del flujo OpenID
/// de Steam (equivale al `http.createServer` del proceso principal de Electron).
#[tauri::command]
pub async fn open_steam_openid() -> Result<Value, String> {
  Err("Pendiente (fase 4): vinculación con Steam OpenID".to_string())
}

/// Fase 3: barrido de unidades + parseo de `libraryfolders.vdf`.
#[tauri::command]
pub fn get_steam_installation_status(app_ids: Vec<String>) -> Value {
  let _ = app_ids;
  json!({})
}

/// Fase 3: parseo de `appmanifest_*.acf` + `content_log.txt` con watcher.
#[tauri::command]
pub fn get_steam_download_progress() -> Value {
  json!([])
}
