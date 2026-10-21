use serde::Serialize;
use serde_json::Value;
use tauri::AppHandle;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
  platform: String,
  arch: String,
  cpus: String,
  total_memory: String,
  free_memory: String,
  uptime: String,
}

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
  let mut sys = sysinfo::System::new();
  sys.refresh_cpu_all();
  sys.refresh_memory();

  let cpus = sys
    .cpus()
    .first()
    .map(|cpu| cpu.brand().to_string())
    .unwrap_or_else(|| "Procesador Desconocido".to_string());
  let total = (sys.total_memory() as f64 / 1024f64.powi(3)).round();
  let free = (sys.free_memory() as f64 / 1024f64.powi(3)).round();
  let uptime_hours = (sysinfo::System::uptime() as f64 / 3600.0).round();

  let platform = if cfg!(windows) {
    "Windows"
  } else if cfg!(target_os = "macos") {
    "macOS"
  } else {
    "Linux"
  };
  let arch = match std::env::consts::ARCH {
    "x86_64" => "x64",
    "aarch64" => "arm64",
    other => other,
  };

  SystemInfo {
    platform: platform.to_string(),
    arch: arch.to_string(),
    cpus,
    total_memory: format!("{total} GB"),
    free_memory: format!("{free} GB"),
    uptime: format!("{uptime_hours} horas"),
  }
}

#[tauri::command]
pub fn get_app_version(app: AppHandle) -> String {
  app.package_info().version.to_string()
}

#[tauri::command]
pub async fn check_for_updates() -> Result<Value, String> {
  let response = reqwest::get("https://crizzvc.github.io/Hashi-API/api.json")
    .await
    .map_err(|_| "Error en la red".to_string())?;
  if !response.status().is_success() {
    return Err("Error en la red".to_string());
  }
  response.json::<Value>().await.map_err(|_| "Error parseando JSON".to_string())
}
