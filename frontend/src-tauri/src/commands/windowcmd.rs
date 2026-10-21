use std::sync::atomic::Ordering;

use tauri::{AppHandle, Manager};

use crate::state::AppState;
use crate::window;

#[tauri::command]
pub fn set_omniconsole(app: AppHandle, enabled: bool) {
  app.state::<AppState>().omniconsole.store(enabled, Ordering::SeqCst);
}

/// Oculta el launcher de la barra de tareas y lo minimiza (equivale a
/// `setSkipTaskbar(true) + minimize()` de Electron).
#[tauri::command]
pub fn minimize_window(app: AppHandle) {
  if let Some(win) = app.get_webview_window("main") {
    let _ = win.set_skip_taskbar(true);
    let _ = win.minimize();
  }
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
  window::quit(&app);
}
