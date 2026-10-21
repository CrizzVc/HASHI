use std::path::Path;
use std::process::Command;

use serde_json::Value;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

use crate::paths;

const HEROIC_CANDIDATES: [&str; 5] = [
  "/usr/bin/heroic",
  "/usr/local/bin/heroic",
  "/opt/Heroic/heroic",
  "~/.local/bin/heroic",
  "~/Applications/Heroic",
];

struct StoreDef {
  id: &'static str,
  name: &'static str,
  exe_candidates: Vec<String>,
  path_binaries: Vec<&'static str>,
  flatpak_apps: Vec<&'static str>,
}

fn expand_home(value: &str) -> String {
  if let Some(rest) = value.strip_prefix("~/") {
    let home = if cfg!(windows) {
      std::env::var("USERPROFILE").unwrap_or_default()
    } else {
      std::env::var("HOME").unwrap_or_default()
    };
    if !home.is_empty() {
      return format!("{home}/{rest}");
    }
  }
  value.to_string()
}

fn first_existing(candidates: &[String]) -> Option<String> {
  candidates
    .iter()
    .map(|value| expand_home(value))
    .find(|path| Path::new(path).exists())
}

#[cfg(unix)]
fn find_in_path(binary: &str) -> Option<String> {
  let path = std::env::var("PATH").ok()?;
  std::env::split_paths(&path)
    .map(|dir| dir.join(binary))
    .find(|candidate| candidate.exists())
    .map(|found| found.to_string_lossy().to_string())
}

#[cfg(not(unix))]
fn find_in_path(_binary: &str) -> Option<String> {
  None
}

#[cfg(unix)]
fn is_flatpak_installed(app_id: &str) -> bool {
  if find_in_path("flatpak").is_none() {
    return false;
  }
  Command::new("flatpak")
    .args(["info", app_id])
    .stdout(std::process::Stdio::null())
    .stderr(std::process::Stdio::null())
    .status()
    .map(|status| status.success())
    .unwrap_or(false)
}

#[cfg(not(unix))]
fn is_flatpak_installed(_app_id: &str) -> bool {
  false
}

fn stores() -> Vec<StoreDef> {
  if cfg!(windows) {
    let program_files = std::env::var("ProgramFiles").unwrap_or_else(|_| r"C:\Program Files".to_string());
    let program_files_x86 =
      std::env::var("ProgramFiles(x86)").unwrap_or_else(|_| r"C:\Program Files (x86)".to_string());
    let local_app_data = std::env::var("LocalAppData").unwrap_or_default();
    let app_data = std::env::var("APPDATA").unwrap_or_default();

    vec![
      StoreDef {
        id: "steam",
        name: "Steam",
        exe_candidates: vec![
          format!(r"{program_files_x86}\Steam\steam.exe"),
          format!(r"{program_files}\Steam\steam.exe"),
          format!(r"{program_files_x86}\steam\steam.exe"),
          format!(r"{local_app_data}\Steam\steam.exe"),
        ],
        path_binaries: vec![],
        flatpak_apps: vec![],
      },
      StoreDef {
        id: "epic",
        name: "Epic Games",
        exe_candidates: vec![
          format!(r"{program_files_x86}\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe"),
          format!(r"{program_files_x86}\Epic Games\Launcher\Portal\Binaries\Win32\EpicGamesLauncher.exe"),
          format!(r"{program_files}\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe"),
        ],
        path_binaries: vec![],
        flatpak_apps: vec![],
      },
      StoreDef {
        id: "gog",
        name: "GOG Galaxy",
        exe_candidates: vec![
          format!(r"{program_files_x86}\GOG Galaxy\GalaxyClient.exe"),
          format!(r"{program_files}\GOG Galaxy\GalaxyClient.exe"),
          format!(r"{app_data}\GOG.com\Galaxy\GalaxyClient.exe"),
        ],
        path_binaries: vec![],
        flatpak_apps: vec![],
      },
    ]
  } else {
    let heroics: Vec<String> = HEROIC_CANDIDATES.iter().map(|value| value.to_string()).collect();
    vec![
      StoreDef {
        id: "steam",
        name: "Steam",
        exe_candidates: vec![
          "/usr/bin/steam".to_string(),
          "/usr/local/bin/steam".to_string(),
          "/usr/lib/steam/steam".to_string(),
          "/snap/bin/steam".to_string(),
          "~/.local/share/Steam/steam.sh".to_string(),
          "~/.steam/steam/steam.sh".to_string(),
          "~/.steam/root/steam.sh".to_string(),
        ],
        path_binaries: vec!["steam"],
        flatpak_apps: vec!["com.valvesoftware.Steam"],
      },
      StoreDef {
        id: "epic",
        name: "Heroic (Epic)",
        exe_candidates: heroics.clone(),
        path_binaries: vec!["heroic"],
        flatpak_apps: vec!["com.heroicgameslauncher.hgl"],
      },
      StoreDef {
        id: "gog",
        name: "Heroic (GOG)",
        exe_candidates: heroics,
        path_binaries: vec!["heroic"],
        flatpak_apps: vec!["com.heroicgameslauncher.hgl"],
      },
    ]
  }
}

fn find_store_exe(store: &StoreDef) -> Option<String> {
  if let Some(found) = first_existing(&store.exe_candidates) {
    return Some(found);
  }
  if cfg!(unix) {
    for binary in &store.path_binaries {
      if let Some(found) = find_in_path(binary) {
        return Some(found);
      }
    }
  }
  None
}

fn store_installed(store: &StoreDef) -> bool {
  find_store_exe(store).is_some()
    || store.flatpak_apps.iter().any(|app_id| is_flatpak_installed(app_id))
}

#[tauri::command]
pub fn get_stores() -> Value {
  let stores: Vec<Value> = stores()
    .iter()
    .map(|store| {
      let exe_path = find_store_exe(store);
      serde_json::json!({
        "id": store.id,
        "name": store.name,
        "installed": store_installed(store),
        "exePath": exe_path,
      })
    })
    .collect();
  Value::Array(stores)
}

#[tauri::command]
pub fn open_store(app: AppHandle, store_id: String) -> Value {
  let Some(store) = stores().into_iter().find(|store| store.id == store_id) else {
    return paths::failure("Tienda desconocida");
  };

  if cfg!(windows) {
    let Some(exe_path) = find_store_exe(&store) else {
      return paths::failure("Tienda no instalada");
    };
    return match app.opener().open_path(&exe_path, None::<&str>) {
      Ok(()) => paths::success(),
      Err(err) => paths::failure(err.to_string()),
    };
  }

  // Linux: binario nativo (script de Steam, AppImage/binario de Heroic…)
  if let Some(exe_path) = find_store_exe(&store) {
    return match Command::new(&exe_path).spawn() {
      Ok(_) => paths::success(),
      Err(err) => paths::failure(err.to_string()),
    };
  }

  // …o instalación Flatpak
  let flatpak_app = store.flatpak_apps.iter().find(|app_id| is_flatpak_installed(app_id));
  if let (Some(app_id), Some(flatpak_bin)) = (flatpak_app, find_in_path("flatpak")) {
    return match Command::new(flatpak_bin).args(["run", app_id]).spawn() {
      Ok(_) => paths::success(),
      Err(err) => paths::failure(err.to_string()),
    };
  }

  paths::failure("Tienda no instalada")
}

#[tauri::command]
pub fn open_external(app: AppHandle, url: String) -> Value {
  let lower = url.to_lowercase();
  if !(lower.starts_with("http://") || lower.starts_with("https://") || lower.starts_with("steam:")) {
    return paths::failure("URL no permitida");
  }
  match app.opener().open_url(&url, None::<&str>) {
    Ok(()) => paths::success(),
    Err(err) => paths::failure(err.to_string()),
  }
}
