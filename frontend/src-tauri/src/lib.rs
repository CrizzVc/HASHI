mod commands;
mod migrate;
mod paths;
mod state;
mod tray;
mod window;

use commands::*;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Primero que nada: una segunda instancia solo restaura la ventana original.
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
      window::show_main(app);
    }))
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_autostart::init(
      tauri_plugin_autostart::MacosLauncher::LaunchAgent,
      None,
    ))
    .manage(AppState::default())
    .register_uri_scheme_protocol(
      commands::bootvideo::MEDIA_SCHEME,
      |app, request| commands::bootvideo::handle_media_protocol(app, request),
    )
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      let handle = app.handle().clone();
      migrate::migrate_electron_data(&handle);
      tray::create_tray(&handle)?;
      Ok(())
    })
    .on_window_event(window::handle_window_event)
    .invoke_handler(tauri::generate_handler![
      // ── Sistema / versión ──
      get_system_info,
      get_app_version,
      check_for_updates,
      // ── Juegos ──
      get_games,
      save_games,
      select_game_file,
      get_file_icon,
      launch_game,
      // ── Ventana ──
      set_omniconsole,
      minimize_window,
      quit_app,
      // ── Fondo de pantalla / wallpaper ──
      select_background_image,
      get_background_image,
      clear_background_image,
      select_wallpaper_folder,
      get_wallpaper_folder,
      get_wallpaper_images,
      set_wallpaper_as_background,
      get_wallpaper_preview,
      // ── Perfil ──
      get_profile,
      save_profile,
      select_profile_image,
      // ── Tiendas y enlaces externos ──
      get_stores,
      open_store,
      open_external,
      // ── Extensiones ──
      get_extensions,
      set_extension_enabled,
      open_extension_session,
      close_extension_session,
      open_extensions_directory,
      // ── Cuenta Steam ──
      get_steam_account,
      save_steam_account,
      open_steam_openid,
      get_steam_installation_status,
      get_steam_download_progress,
      // ── Autoarranque ──
      create_startup_shortcut,
      get_startup_status,
      remove_startup_shortcut,
      // ── Puerto del backend ──
      get_backend_port,
      set_backend_port,
      check_port_in_use,
      // ── Boot/suspend video ──
      get_boot_video_path,
      download_boot_video,
      delete_boot_video,
      // ── Medios del sistema ──
      get_media_sessions,
      media_control,
      get_system_media,
      control_system_media,
      // ── APIs externas ──
      steamdeckrepo_fetch_posts,
    ])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
