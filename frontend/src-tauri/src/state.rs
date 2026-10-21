use std::sync::atomic::AtomicBool;
use std::sync::Mutex;

use tauri::tray::TrayIcon;

/// Estado global compartido entre comandos, tray y manejadores de ventana.
pub struct AppState {
  /// Evita que "Salir" desde el tray quede bloqueado por el close-intercept.
  pub quitting: AtomicBool,
  /// Modo Omniconsole: minimiza normalmente en vez de sacar de la barra de tareas.
  pub omniconsole: AtomicBool,
  pub tray: Mutex<Option<TrayIcon<tauri::Wry>>>,
}

impl Default for AppState {
  fn default() -> Self {
    Self {
      quitting: AtomicBool::new(false),
      omniconsole: AtomicBool::new(false),
      tray: Mutex::new(None),
    }
  }
}
