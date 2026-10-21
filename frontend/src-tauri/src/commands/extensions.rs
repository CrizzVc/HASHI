use std::collections::HashMap;
use std::path::{Path, PathBuf};

use regex::Regex;
use serde::Serialize;
use serde_json::Value;
#[allow(unused_imports)]
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;
use url::Url;

use crate::paths;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherExtension {
  id: String,
  name: String,
  description: String,
  version: String,
  #[serde(rename = "type")]
  ext_type: String,
  entry_url: Option<String>,
  view_id: Option<String>,
  backend_entry: Option<String>,
  dir_path: String,
  sidebar: bool,
  enabled: bool,
}

fn user_extensions_dir(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(paths::data_dir(app)?.join("extensions"))
}

fn bundled_extensions_dir(_app: &AppHandle) -> PathBuf {
  #[cfg(debug_assertions)]
  {
    // En desarrollo los ejemplos viven en `frontend/resources/extensions`.
    PathBuf::from(concat!(env!("CARGO_MANIFEST_DIR"), "/../resources/extensions"))
  }
  #[cfg(not(debug_assertions))]
  {
    _app.path().resource_dir().map(|dir| dir.join("extensions")).unwrap_or_default()
  }
}

fn extensions_state_path(app: &AppHandle) -> Result<PathBuf, String> {
  paths::data_file(app, "extensions-state.json")
}

fn read_extensions_state(app: &AppHandle) -> std::collections::HashMap<String, bool> {
  let mut state = std::collections::HashMap::new();
  let Some(path) = extensions_state_path(app).ok() else {
    return state;
  };
  let Ok(raw) = std::fs::read_to_string(path) else {
    return state;
  };
  let Ok(parsed) = serde_json::from_str::<Value>(&raw) else {
    return state;
  };
  if let Some(obj) = parsed.as_object() {
    for (key, value) in obj {
      if let Some(enabled) = value.as_bool() {
        state.insert(key.clone(), enabled);
      }
    }
  }
  state
}

fn is_safe_extension_url(value: &str) -> bool {
  Url::parse(value)
    .map(|url| matches!(url.scheme(), "https" | "http" | "file"))
    .unwrap_or(false)
}

fn truncate(value: &str, max: usize) -> String {
  value.chars().take(max).collect()
}

fn file_url(path: &Path) -> Option<String> {
  Url::from_file_path(path).ok().map(|url| url.to_string())
}

fn read_extensions_from(dir: &Path) -> Vec<LauncherExtension> {
  let Ok(entries) = std::fs::read_dir(dir) else {
    return Vec::new();
  };
  let id_re = Regex::new(r"(?i)^[a-z0-9][a-z0-9-]{1,63}$").expect("valid id regex");

  entries
    .flatten()
    .filter(|entry| entry.path().is_dir())
    .filter_map(|entry| {
      let manifest_path = entry.path().join("manifest.json");
      let raw = std::fs::read_to_string(manifest_path).ok()?;
      let manifest: Value = serde_json::from_str(&raw).ok()?;

      let id = manifest.get("id").and_then(Value::as_str).unwrap_or("").to_string();
      let name = manifest.get("name").and_then(Value::as_str).unwrap_or("").to_string();
      let description = manifest.get("description").and_then(Value::as_str).unwrap_or("").to_string();
      let version = manifest.get("version").and_then(Value::as_str).unwrap_or("").to_string();
      let raw_type = manifest.get("type").and_then(Value::as_str).unwrap_or("external");
      let ext_type = match raw_type {
        "native" | "embedded" => raw_type,
        _ => "external",
      }
      .to_string();
      let raw_entry_url = manifest
        .get("entryUrl")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);
      let view_id = manifest
        .get("viewId")
        .and_then(Value::as_str)
        .map(str::to_string)
        .filter(|value| !value.is_empty());
      let backend_entry = manifest
        .get("backendEntry")
        .and_then(Value::as_str)
        .map(str::to_string)
        .or_else(|| manifest.get("backend").and_then(Value::as_str).map(str::to_string));
      let sidebar = manifest.get("sidebar").and_then(Value::as_bool).unwrap_or(false);
      let enabled = manifest.get("enabled").and_then(Value::as_bool).unwrap_or(true);

      // Auto-detección de frontend local si no se especifica entryUrl.
      let mut entry_url = raw_entry_url;
      if entry_url.is_none() && ext_type == "external" {
        let frontend_index = entry.path().join("frontend").join("index.html");
        let root_index = entry.path().join("index.html");
        if frontend_index.exists() {
          entry_url = file_url(&frontend_index);
        } else if root_index.exists() {
          entry_url = file_url(&root_index);
        }
      }

      let valid_entry = if ext_type == "external" {
        entry_url.as_deref().map(is_safe_extension_url).unwrap_or(false)
      } else if ext_type == "embedded" {
        view_id.is_some()
      } else {
        false
      };
      if !id_re.is_match(&id) || name.is_empty() || version.is_empty() || !valid_entry {
        return None;
      }

      let is_external = ext_type == "external";
      let is_embedded = ext_type == "embedded";
      Some(LauncherExtension {
        id,
        name: truncate(&name, 80),
        description: truncate(&description, 240),
        version: truncate(&version, 32),
        ext_type,
        entry_url: if is_external { entry_url } else { None },
        view_id: if is_embedded { view_id } else { None },
        backend_entry,
        dir_path: entry.path().to_string_lossy().to_string(),
        sidebar,
        enabled,
      })
    })
    .collect()
}

fn read_extensions(app: &AppHandle) -> Vec<LauncherExtension> {
  let state = read_extensions_state(app);
  let mut merged: std::collections::HashMap<String, LauncherExtension> = HashMap::new();
  for extension in read_extensions_from(&bundled_extensions_dir(app)) {
    merged.insert(extension.id.clone(), extension);
  }
  if let Ok(user_dir) = user_extensions_dir(app) {
    for extension in read_extensions_from(&user_dir) {
      merged.insert(extension.id.clone(), extension);
    }
  }

  let mut list: Vec<LauncherExtension> = merged.into_values().collect();
  for extension in &mut list {
    if let Some(enabled) = state.get(&extension.id) {
      extension.enabled = *enabled;
    }
  }
  list.sort_by(|a, b| a.id.cmp(&b.id));
  list
}

#[tauri::command]
pub fn get_extensions(app: AppHandle) -> Result<Value, String> {
  serde_json::to_value(read_extensions(&app)).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn set_extension_enabled(app: AppHandle, id: String, enabled: bool) -> Value {
  let mut state_value = paths::read_json(&app, "extensions-state.json")
    .and_then(|value| value.as_object().cloned())
    .unwrap_or_else(serde_json::Map::new);
  state_value.insert(id, Value::Bool(enabled));
  match paths::write_json(&app, "extensions-state.json", &Value::Object(state_value)) {
    Ok(()) => paths::success(),
    Err(err) => paths::failure(err),
  }
}

/// Fase posterior: los backends de extensiones se ejecutan con `node` (script
/// `backendEntry` del manifest). Sin runtime Node empaquetado no pueden
/// arrancar en la rama Tauri; se devuelve un error claro al renderer.
#[tauri::command]
pub fn open_extension_session(_id: String) -> Value {
  paths::failure("Los backends Node de extensiones aún no están soportados en la rama Tauri")
}

#[tauri::command]
pub fn close_extension_session(_id: String) -> Value {
  // No hay procesos de extensiones en esta fase.
  paths::success()
}

#[tauri::command]
pub async fn open_extensions_directory(app: AppHandle) -> Value {
  let dir = match user_extensions_dir(&app) {
    Ok(dir) => dir,
    Err(err) => return paths::failure(err),
  };
  if !dir.exists() && std::fs::create_dir_all(&dir).is_err() {
    return paths::failure("No se pudo crear la carpeta de extensiones");
  }
  match app.opener().open_path(dir.to_string_lossy().to_string(), None::<&str>) {
    Ok(()) => paths::success(),
    Err(err) => paths::failure(err.to_string()),
  }
}
