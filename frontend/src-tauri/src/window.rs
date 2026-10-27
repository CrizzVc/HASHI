use std::sync::atomic::Ordering;

use tauri::{AppHandle, Emitter, Manager, Window, WindowEvent};

use crate::state::AppState;

/// Muestra/restaura la ventana principal (tray "Mostrar HASHI", segunda instancia).
pub fn show_main(app: &AppHandle) {
  if let Some(win) = app.get_webview_window("main") {
    let _ = win.unminimize();
    let _ = win.show();
    let _ = win.set_skip_taskbar(false);
    let _ = win.set_focus();
  }
}

/// Oculta el launcher mientras se juega:
/// - Con Omniconsole: minimiza normalmente (visible en barra de tareas).
/// - Sin Omniconsole: minimiza + saca de la barra de tareas.
pub fn hide_for_game(app: &AppHandle) {
  let omniconsole = app.state::<AppState>().omniconsole.load(Ordering::SeqCst);
  if let Some(win) = app.get_webview_window("main") {
    if !omniconsole {
      let _ = win.set_skip_taskbar(true);
    }
    let _ = win.minimize();
  }
}

/// Restaura el launcher tras finalizar una sesión de juego.
pub fn show_after_game(app: &AppHandle) {
  if let Some(win) = app.get_webview_window("main") {
    let _ = win.set_skip_taskbar(false);
    let _ = win.unminimize();
    let _ = win.show();
    let _ = win.set_focus();
  }
}

/// Salida explícita desde "Salir" (tray o `quit-app`): marca el cierre y sale.
/// El icono de tray desaparece solo al terminar el proceso (Tauri 2 no expone
/// `destroy` en `TrayIcon`).
pub fn quit(app: &AppHandle) {
  let state = app.state::<AppState>();
  state.quitting.store(true, Ordering::SeqCst);
  if let Ok(mut guard) = state.tray.lock() {
    guard.take();
  }
  drop(state);
  app.exit(0);
}

/// Comportamiento de la ventana principal, equivalente al proceso principal de
/// Electron: el cierre (X) oculta + saca de la barra de tareas en vez de salir,
/// y los cambios de tamaño avisan al renderer (workaround de layout en
/// fullscreen/escalado != 100%).
pub fn handle_window_event(window: &Window, event: &WindowEvent) {
  match event {
    WindowEvent::CloseRequested { api, .. } => {
      let state = window.state::<AppState>();
      if state.quitting.load(Ordering::SeqCst) {
        return;
      }
      api.prevent_close();
      let _ = window.hide();
      let _ = window.set_skip_taskbar(true);
    }
    WindowEvent::Resized(_) | WindowEvent::ScaleFactorChanged { .. } => {
      let _ = window.emit("force-resize-recalc", ());
    }
    _ => {}
  }
}
