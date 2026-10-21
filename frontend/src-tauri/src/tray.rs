use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

use crate::state::AppState;
use crate::window;

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
  let show = MenuItem::with_id(app, "show", "Mostrar HASHI", true, None::<&str>)?;
  let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
  let menu = Menu::with_items(app, &[&show, &quit])?;

  let mut builder = TrayIconBuilder::with_id("main-tray")
    .tooltip("HASHI")
    .menu(&menu)
    .show_menu_on_left_click(false)
    .on_menu_event(|app, event| match event.id().as_ref() {
      "show" => window::show_main(app),
      "quit" => window::quit(app),
      _ => {}
    })
    .on_tray_icon_event(|tray, event| {
      if let TrayIconEvent::DoubleClick { .. } = event {
        window::show_main(tray.app_handle());
      }
    });

  if let Some(icon) = app.default_window_icon() {
    builder = builder.icon(icon.clone());
  }

  let tray = builder.build(app)?;
  if let Ok(mut guard) = app.state::<AppState>().tray.lock() {
    *guard = Some(tray);
  }
  Ok(())
}
