use std::time::Duration;

use serde_json::{json, Value};
use tauri::AppHandle;

use crate::paths;

fn port_open(port: i32) -> bool {
  if !(1..=65535).contains(&port) {
    return false;
  }
  let addr = std::net::SocketAddr::from(([127, 0, 0, 1], port as u16));
  std::net::TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok()
}

async fn is_hashi_backend(port: i32) -> bool {
  let Ok(client) = reqwest::Client::builder().timeout(Duration::from_millis(1500)).build() else {
    return false;
  };
  client
    .get(format!("http://127.0.0.1:{port}/api/health"))
    .send()
    .await
    .map(|response| response.status().is_success())
    .unwrap_or(false)
}

#[tauri::command]
pub fn get_backend_port(app: AppHandle) -> Value {
  // Fase 2: el backend Axum en proceso escogerá y persistirá su puerto real;
  // hasta entonces se devuelve el persistido o el 3000 por defecto (igual que
  // el fallback de `utils/backendUrl.ts`).
  let port = paths::read_json(&app, "backend-port.json")
    .and_then(|value| value.get("port").and_then(Value::as_u64))
    .unwrap_or(3000);
  json!({ "port": port })
}

#[tauri::command]
pub async fn set_backend_port(app: AppHandle, port: i32) -> Value {
  if !(1..=65535).contains(&port) {
    return paths::failure("Invalid port number");
  }
  // Si en ese puerto ya corre un backend HASHI es reutilizable.
  if port_open(port) && !is_hashi_backend(port).await {
    return paths::failure("port_in_use");
  }
  match paths::write_json(&app, "backend-port.json", &json!({ "port": port })) {
    Ok(()) => {
      // Fase 2: reiniciar el backend Axum en el nuevo puerto.
      paths::success()
    }
    Err(err) => paths::failure(err),
  }
}

#[tauri::command]
pub fn check_port_in_use(port: i32) -> Value {
  json!({ "inUse": port_open(port) })
}
