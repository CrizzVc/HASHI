use std::path::{Path, PathBuf};
use std::sync::atomic::Ordering;

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use crate::paths;
use crate::state::AppState;
use crate::window;

const KNOWN_STEAM_PROCESSES: [&str; 15] = [
  "steam.exe",
  "steamwebhelper.exe",
  "gameoverlayui.exe",
  "cef.helper.exe",
  "crashhandler.exe",
  "steamservice.exe",
  "steam",
  "steamwebhelper",
  "gameoverlayui",
  "cef.helper",
  "crashhandler",
  "steamservice",
  "steamerrorreporter",
  "steamsessionhelper",
  "reaper",
];

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

/// Extraer icono de archivo ejecutable. Si no es posible, devuelve `None` para
/// que el frontend use el fallback.
#[tauri::command]
pub async fn get_file_icon(_file_path: String) -> Option<String> {
  None
}

fn add_steam_root(
  root: &Path,
  roots: &mut Vec<PathBuf>,
  seen: &mut std::collections::HashSet<PathBuf>,
) {
  let canonical = std::fs::canonicalize(root).unwrap_or_else(|_| root.to_path_buf());
  if seen.contains(&canonical) {
    return;
  }
  seen.insert(canonical.clone());
  roots.push(canonical.clone());

  let vdf = canonical.join("steamapps").join("libraryfolders.vdf");
  if let Ok(content) = std::fs::read_to_string(vdf) {
    if let Ok(re) = regex::Regex::new(r#""(?:path|[0-9]+)"\s+"([^"]+)""#) {
      for cap in re.captures_iter(&content) {
        if let Some(m) = cap.get(1) {
          let p = PathBuf::from(m.as_str());
          if p.exists() {
            add_steam_root(&p, roots, seen);
          }
        }
      }
    }
  }
}

fn steam_roots() -> Vec<PathBuf> {
  let mut roots = Vec::new();
  let mut seen = std::collections::HashSet::new();

  #[cfg(windows)]
  {
    for drive in b'A'..=b'Z' {
      let root = format!("{}:\\", drive as char);
      let p = PathBuf::from(&root);
      if p.exists() {
        for sub in &["Steam", "steam", "Games\\Steam", "Games\\steam"] {
          let candidate = p.join(sub);
          if candidate.exists() {
            add_steam_root(&candidate, &mut roots, &mut seen);
          }
        }
      }
    }
    for env_var in &["ProgramFiles", "ProgramFiles(x86)", "LocalAppData"] {
      if let Ok(val) = std::env::var(env_var) {
        let candidate = PathBuf::from(val).join("Steam");
        if candidate.exists() {
          add_steam_root(&candidate, &mut roots, &mut seen);
        }
      }
    }
    for fixed in &["C:\\Program Files (x86)\\Steam", "C:\\Program Files\\Steam"] {
      let candidate = PathBuf::from(fixed);
      if candidate.exists() {
        add_steam_root(&candidate, &mut roots, &mut seen);
      }
    }
  }

  #[cfg(not(windows))]
  {
    let home = std::env::var("HOME").unwrap_or_default();
    let posix_candidates = [
      format!("{home}/.steam/steam"),
      format!("{home}/.steam/root"),
      format!("{home}/.steam/debian-installation"),
      format!("{home}/.local/share/Steam"),
      format!("{home}/.var/app/com.valvesoftware.Steam/.local/share/Steam"),
      format!("{home}/snap/steam/common/.local/share/Steam"),
      "/usr/lib/steam".to_string(),
      "/usr/share/steam".to_string(),
    ];
    for cand in posix_candidates {
      let p = PathBuf::from(cand);
      if p.exists() {
        add_steam_root(&p, &mut roots, &mut seen);
      }
    }
  }

  roots
}

struct SteamGameInfo {
  names: Vec<String>,
  #[allow(dead_code)]
  roots: Vec<PathBuf>,
}

fn find_steam_game(app_id: &str) -> SteamGameInfo {
  let mut names = Vec::new();
  let mut roots = Vec::new();
  let all_roots = steam_roots();

  let manifest_name = format!("appmanifest_{app_id}.acf");
  for root in all_roots {
    let manifest_path = root.join("steamapps").join(&manifest_name);
    if !manifest_path.exists() {
      continue;
    }
    let Ok(content) = std::fs::read_to_string(&manifest_path) else {
      continue;
    };
    let Ok(re) = regex::Regex::new(r#""installdir"\s+"([^"]+)""#) else {
      continue;
    };
    let Some(cap) = re.captures(&content) else {
      continue;
    };
    let Some(dir_match) = cap.get(1) else {
      continue;
    };
    let game_dir = root.join("steamapps").join("common").join(dir_match.as_str());
    if !game_dir.exists() {
      continue;
    }
    roots.push(game_dir.clone());

    let mut dirs_to_visit = vec![game_dir];
    while let Some(current_dir) = dirs_to_visit.pop() {
      if let Ok(entries) = std::fs::read_dir(current_dir) {
        for entry in entries.flatten() {
          let path = entry.path();
          if path.is_dir() {
            dirs_to_visit.push(path);
          } else if let Some(file_name) = path.file_name() {
            let lower = file_name.to_string_lossy().to_lowercase();
            if lower.ends_with(".exe") {
              names.push(lower);
            }
          }
        }
      }
    }
    break;
  }

  SteamGameInfo { names, roots }
}

#[cfg(not(windows))]
fn find_wine() -> Option<PathBuf> {
  let candidates = [
    "/usr/bin/wine",
    "/usr/local/bin/wine",
    "/opt/wine-stable/bin/wine",
    "/opt/wine/bin/wine",
  ];
  for c in candidates {
    let p = PathBuf::from(c);
    if p.exists() {
      return Some(p);
    }
  }
  None
}

#[cfg(not(windows))]
fn find_proton() -> Option<PathBuf> {
  let home = std::env::var("HOME").unwrap_or_default();
  let search_dirs = [
    format!("{home}/.local/share/Steam/steamapps/common"),
    format!("{home}/.local/share/Steam/compatibilitytools.d"),
    format!("{home}/.steam/root/compatibilitytools.d"),
    format!("{home}/.steam/steam/steamapps/common"),
    format!("{home}/.var/app/com.valvesoftware.Steam/data/Steam/steamapps/common"),
    format!("{home}/.var/app/com.valvesoftware.Steam/data/Steam/compatibilitytools.d"),
    "/usr/share/steam/compatibilitytools.d".to_string(),
  ];
  for dir in search_dirs {
    let p = PathBuf::from(dir);
    if let Ok(entries) = std::fs::read_dir(p) {
      for entry in entries.flatten() {
        let proton_bin = entry.path().join("proton");
        if proton_bin.exists() {
          return Some(proton_bin);
        }
      }
    }
  }
  None
}

fn monitor_steam_game(
  app: AppHandle,
  game_id: String,
  app_id: String,
  start_instant: std::time::Instant,
) {
  std::thread::spawn(move || {
    let target = find_steam_game(&app_id);
    let specific_exes: std::collections::HashSet<String> = target.names.into_iter().collect();
    let known_steam: std::collections::HashSet<&str> = KNOWN_STEAM_PROCESSES.into_iter().collect();

    let mut sys = sysinfo::System::new_all();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    let before_names: std::collections::HashSet<String> = sys
      .processes()
      .values()
      .map(|p| p.name().to_string_lossy().to_lowercase())
      .collect();

    let mut game_detected = false;
    let mut locked_exe_name: Option<String> = None;
    let mut stable_count = 0;
    let max_checks = 4 * 60 * 12; // 4 hours maximum (5-sec check interval)

    for _ in 0..max_checks {
      std::thread::sleep(std::time::Duration::from_secs(5));
      if !app.state::<AppState>().is_game_running.load(Ordering::SeqCst) {
        return;
      }

      sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
      let current_names: std::collections::HashSet<String> = sys
        .processes()
        .values()
        .map(|p| p.name().to_string_lossy().to_lowercase())
        .collect();

      if !game_detected {
        for name in &current_names {
          if !before_names.contains(name) && !known_steam.contains(name.as_str()) {
            if specific_exes.is_empty() || specific_exes.contains(name) {
              game_detected = true;
              locked_exe_name = Some(name.clone());
              break;
            }
          }
        }
        if !game_detected && !specific_exes.is_empty() {
          for name in &specific_exes {
            if current_names.contains(name) {
              game_detected = true;
              locked_exe_name = Some(name.clone());
              break;
            }
          }
        }
      } else {
        let is_running = if let Some(ref locked) = locked_exe_name {
          current_names.contains(locked)
        } else {
          false
        };

        if !is_running {
          stable_count += 1;
          if stable_count >= 2 {
            break;
          }
        } else {
          stable_count = 0;
        }
      }
    }

    let duration = std::cmp::max(1, start_instant.elapsed().as_secs() / 60);
    app.state::<AppState>().is_game_running.store(false, Ordering::SeqCst);
    window::show_after_game(&app);
    let _ = app.emit(
      "game-exited",
      json!({
        "gameId": game_id,
        "durationMinutes": duration
      }),
    );
  });
}

fn handle_shortcut_launch(
  app: AppHandle,
  game_id: String,
  exe_path: String,
  start_ms: u64,
) -> Value {
  if let Some(win) = app.get_webview_window("main") {
    let _ = win.minimize();
  }
  match app.opener().open_path(&exe_path, None::<&str>) {
    Err(err) => {
      let _ = app.emit(
        "game-launch-error",
        json!({
          "gameId": &game_id,
          "code": "spawn_failed",
          "detail": err.to_string()
        }),
      );
      window::show_after_game(&app);
      let _ = app.emit(
        "game-exited",
        json!({
          "gameId": &game_id,
          "durationMinutes": 0
        }),
      );
      json!({ "success": false, "error": "spawn_failed", "tracked": false, "startTime": start_ms })
    }
    Ok(()) => {
      let app_clone = app.clone();
      let game_id_clone = game_id.clone();
      std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(6));
        window::show_after_game(&app_clone);
        let _ = app_clone.emit(
          "game-exited",
          json!({
            "gameId": game_id_clone,
            "durationMinutes": 5
          }),
        );
      });
      json!({ "success": true, "tracked": false, "startTime": start_ms })
    }
  }
}

/// Lanzamiento y seguimiento de juegos locales, Steam y accesos directos.
#[tauri::command]
pub fn launch_game(
  app: AppHandle,
  game_id: String,
  exe_path: String,
  launch_method: Option<String>,
) -> Value {
  let _ = &launch_method;
  let start_instant = std::time::Instant::now();
  let start_ms = paths::system_time_ms(std::time::SystemTime::now());

  let has_executable = !exe_path.trim().is_empty();
  let lower_path = exe_path.to_lowercase();
  let is_steam_protocol = lower_path.starts_with("steam://");

  // Protocolo Steam
  if is_steam_protocol {
    if lower_path.starts_with("steam://install/") {
      let _ = app.opener().open_url(&exe_path, None::<&str>);
      return json!({
        "success": true,
        "tracked": false,
        "startTime": start_ms,
        "steamProtocol": true,
        "installOnly": true
      });
    }

    app.state::<AppState>().is_game_running.store(true, Ordering::SeqCst);
    window::hide_for_game(&app);
    let _ = app.emit("game-session-start", json!({ "gameId": &game_id }));
    let _ = app.opener().open_url(&exe_path, None::<&str>);

    // Reintentos de ocultamiento para garantizar que el launcher no robe foco a Steam
    let app_clone = app.clone();
    std::thread::spawn(move || {
      for delay_ms in [500, 1500, 3000] {
        std::thread::sleep(std::time::Duration::from_millis(delay_ms));
        if app_clone.state::<AppState>().is_game_running.load(Ordering::SeqCst) {
          window::hide_for_game(&app_clone);
        }
      }
    });

    let re = regex::Regex::new(r"/(\d+)").ok();
    let steam_app_id = re
      .and_then(|r| r.captures(&exe_path))
      .and_then(|c| c.get(1))
      .map(|m| m.as_str().to_string())
      .unwrap_or_default();

    if !steam_app_id.is_empty() {
      monitor_steam_game(app.clone(), game_id, steam_app_id, start_instant);
    }

    return json!({
      "success": true,
      "tracked": false,
      "startTime": start_ms,
      "steamProtocol": true
    });
  }

  // Comprobación de existencia de fichero local
  let file_path = PathBuf::from(&exe_path);
  let file_exists = has_executable && file_path.exists();

  if !has_executable || !file_exists {
    let _ = app.emit(
      "game-launch-error",
      json!({
        "gameId": &game_id,
        "code": "not_found",
        "detail": if has_executable { Some(&exe_path) } else { None }
      }),
    );
    let _ = app.emit("game-exited", json!({ "gameId": &game_id, "durationMinutes": 0 }));
    return json!({ "success": false, "error": "not_found", "tracked": false, "startTime": start_ms });
  }

  let ext = file_path
    .extension()
    .and_then(|e| e.to_str())
    .unwrap_or("")
    .to_lowercase();
  let is_shortcut = ext == "lnk" || ext == "url" || (!cfg!(windows) && ext == "desktop");

  if is_shortcut {
    return handle_shortcut_launch(app, game_id, exe_path, start_ms);
  }

  #[cfg(not(windows))]
  if ext == "exe" && find_proton().is_none() && find_wine().is_none() {
    let _ = app.emit(
      "game-launch-error",
      json!({
        "gameId": &game_id,
        "code": "wine_missing",
        "detail": &exe_path
      }),
    );
    let _ = app.emit("game-exited", json!({ "gameId": &game_id, "durationMinutes": 0 }));
    return json!({ "success": false, "error": "wine_missing", "tracked": true, "startTime": start_ms });
  }

  app.state::<AppState>().is_game_running.store(true, Ordering::SeqCst);
  window::hide_for_game(&app);
  let _ = app.emit("game-session-start", json!({ "gameId": &game_id }));

  let cwd = file_path.parent().unwrap_or(&file_path);

  let mut cmd = if cfg!(windows) {
    if ext == "bat" || ext == "cmd" {
      let mut c = std::process::Command::new("cmd");
      c.args(["/C", &exe_path]);
      c
    } else {
      std::process::Command::new(&exe_path)
    }
  } else {
    #[cfg(not(windows))]
    {
      if ext == "sh" || ext == "bash" || ext == "run" {
        let mut c = std::process::Command::new("/bin/bash");
        c.arg(&exe_path);
        c
      } else if ext == "exe" {
        let proton = find_proton();
        let wine = find_wine();
        let use_wine = launch_method.as_deref() == Some("wine") && wine.is_some();
        if !use_wine && proton.is_some() {
          let proton_path = proton.unwrap();
          let mut c = std::process::Command::new("sh");
          let home = std::env::var("HOME").unwrap_or_default();
          let compat_data = format!("{home}/.local/share/hashi/proton_prefix");
          let _ = std::fs::create_dir_all(&compat_data);
          c.args([
            "-c",
            "ulimit -n 524288 2>/dev/null || true; exec \"$0\" \"run\" \"$@\"",
            &proton_path.to_string_lossy(),
            &exe_path,
          ]);
          c.env("STEAM_COMPAT_DATA_PATH", compat_data);
          c.env("WINEESYNC", "1");
          c.env("WINEFSYNC", "1");
          c
        } else if let Some(wine_path) = wine {
          let mut c = std::process::Command::new("sh");
          c.args([
            "-c",
            "ulimit -n 524288 2>/dev/null || true; exec \"$0\" \"$@\"",
            &wine_path.to_string_lossy(),
            &exe_path,
          ]);
          c.env("WINEESYNC", "1");
          c.env("WINEFSYNC", "1");
          c
        } else {
          std::process::Command::new(&exe_path)
        }
      } else {
        #[cfg(unix)]
        {
          use std::os::unix::fs::PermissionsExt;
          if let Ok(meta) = std::fs::metadata(&file_path) {
            let mut perms = meta.permissions();
            perms.set_mode(perms.mode() | 0o755);
            let _ = std::fs::set_permissions(&file_path, perms);
          }
        }
        std::process::Command::new(&exe_path)
      }
    }
    #[cfg(windows)]
    std::process::Command::new(&exe_path)
  };

  cmd.current_dir(cwd);

  match cmd.spawn() {
    Ok(mut child) => {
      let app_clone = app.clone();
      let game_id_clone = game_id.clone();
      std::thread::spawn(move || {
        let _ = child.wait();
        let elapsed_minutes = start_instant.elapsed().as_secs() / 60;
        let duration = std::cmp::max(1, elapsed_minutes);
        app_clone.state::<AppState>().is_game_running.store(false, Ordering::SeqCst);
        window::show_after_game(&app_clone);
        let _ = app_clone.emit(
          "game-exited",
          json!({
            "gameId": game_id_clone,
            "durationMinutes": duration
          }),
        );
      });
      json!({ "success": true, "tracked": true, "startTime": start_ms })
    }
    Err(err) => {
      let _ = app.emit(
        "game-launch-error",
        json!({
          "gameId": &game_id,
          "code": "spawn_failed",
          "detail": err.to_string()
        }),
      );
      window::show_after_game(&app);
      app.state::<AppState>().is_game_running.store(false, Ordering::SeqCst);
      let _ = app.emit("game-exited", json!({ "gameId": &game_id, "durationMinutes": 0 }));
      json!({ "success": false, "error": "spawn_failed", "tracked": true, "startTime": start_ms })
    }
  }
}
