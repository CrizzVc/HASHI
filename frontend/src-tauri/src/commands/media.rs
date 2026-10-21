use serde_json::{json, Value};

/// Fase 4: sesiones de reproducción del sistema (Windows:
/// GlobalSystemMediaTransportControls vía crate `windows`; Linux:
/// `playerctl`/`busctl`). Devuelve vacío hasta entonces.
#[tauri::command]
pub fn get_media_sessions() -> Value {
  json!([])
}

#[tauri::command]
pub fn media_control(action: String, target: Option<Value>) -> Value {
  let _ = (action, target);
  json!({ "success": false, "error": "Pendiente (fase 4): control de medios del sistema" })
}

#[tauri::command]
pub fn get_system_media() -> Value {
  json!({ "hasMedia": false })
}

#[tauri::command]
pub fn control_system_media(action: String, target: Option<Value>) -> Value {
  let _ = (action, target);
  json!({ "success": false, "error": "Pendiente (fase 4): control de medios del sistema" })
}
