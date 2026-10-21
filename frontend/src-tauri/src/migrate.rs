//! Migra los datos de la app Electron (`%APPDATA%\HASHI` / `%APPDATA%\hashi`)
//! al directorio de datos de Tauri la primera vez que arranca la rama Tauri.
//!
//! Nota: el `localStorage` del renderer NO se migra (WebView2 usa otra carpeta
//! de perfil); solo contiene el puerto del backend, con valor por defecto 3000.

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

const FILES: [&str; 6] = [
  "games.json",
  "profile.json",
  "steam-account.json",
  "extensions-state.json",
  "wallpaper-folder.json",
  "backend-port.json",
];

const DIRS: [&str; 4] = [
  "extensions",
  "splash",
  "wallpaper-thumb-cache",
  "wallpaper-preview-cache",
];

fn old_candidates() -> Vec<PathBuf> {
  let mut candidates = Vec::new();
  #[cfg(windows)]
  {
    if let Ok(appdata) = std::env::var("APPDATA") {
      candidates.push(PathBuf::from(&appdata).join("HASHI"));
      candidates.push(PathBuf::from(&appdata).join("hashi"));
    }
  }
  #[cfg(all(unix, not(target_os = "macos")))]
  {
    let base = std::env::var("XDG_CONFIG_HOME")
      .map(PathBuf::from)
      .unwrap_or_else(|_| {
        let home = std::env::var("HOME").unwrap_or_default();
        PathBuf::from(home).join(".config")
      });
    candidates.push(base.join("HASHI"));
    candidates.push(base.join("hashi"));
  }
  candidates
}

pub fn migrate_electron_data(app: &AppHandle) {
  let Ok(dest) = app.path().app_data_dir() else {
    return;
  };
  // Marca de "ya migrado": si hay biblioteca guardada, no volvemos a copiar.
  if dest.join("games.json").exists() || dest.join(".hashi-migrated").exists() {
    return;
  }
  let _ = std::fs::create_dir_all(&dest);

  for src in old_candidates() {
    if src == dest || !src.is_dir() {
      continue;
    }
    copy_missing(&src, &dest, true);
  }

  let _ = std::fs::write(dest.join(".hashi-migrated"), b"1");
}

fn is_relevant(name: &str) -> bool {
  FILES.contains(&name) || DIRS.contains(&name) || name.starts_with("background.")
}

fn copy_missing(src: &Path, dest: &Path, top_level: bool) {
  let Ok(entries) = std::fs::read_dir(src) else {
    return;
  };
  let _ = std::fs::create_dir_all(dest);
  for entry in entries.flatten() {
    let name = entry.file_name().to_string_lossy().to_string();
    if top_level && !is_relevant(&name) {
      continue;
    }
    let from = entry.path();
    let to = dest.join(&name);
    let Ok(meta) = entry.metadata() else {
      continue;
    };
    if meta.is_dir() {
      if !to.exists() {
        copy_dir_recursive(&from, &to);
      }
    } else if !to.exists() {
      let _ = std::fs::copy(&from, &to);
    }
  }
}

fn copy_dir_recursive(src: &Path, dest: &Path) {
  let _ = std::fs::create_dir_all(dest);
  let Ok(entries) = std::fs::read_dir(src) else {
    return;
  };
  for entry in entries.flatten() {
    let from = entry.path();
    let to = dest.join(entry.file_name());
    let Ok(meta) = entry.metadata() else {
      continue;
    };
    if meta.is_dir() {
      copy_dir_recursive(&from, &to);
    } else if !to.exists() {
      let _ = std::fs::copy(&from, &to);
    }
  }
}
