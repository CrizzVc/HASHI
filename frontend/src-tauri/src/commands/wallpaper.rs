use std::path::{Path, PathBuf};

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;
use image::imageops::FilterType;
use image::ImageEncoder;
use md5::{Digest, Md5};
use serde::Serialize;
use serde_json::{json, Value};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::paths;

const THUMB_CACHE_DIR: &str = "wallpaper-thumb-cache";
const THUMB_MAX_WIDTH: u32 = 360;
const THUMB_QUALITY: u8 = 72;
const PREVIEW_CACHE_DIR: &str = "wallpaper-preview-cache";
const PREVIEW_MAX_WIDTH: u32 = 1920;
const PREVIEW_QUALITY: u8 = 82;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WallpaperImage {
  name: String,
  path: String,
  data_url: String,
  mtime: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WallpaperSelection {
  folder: String,
  images: Vec<WallpaperImage>,
}

fn md5_hex(input: &str) -> String {
  Md5::digest(input).iter().map(|byte| format!("{byte:02x}")).collect()
}

fn folder_config_path(app: &AppHandle) -> Result<PathBuf, String> {
  paths::data_file(app, "wallpaper-folder.json")
}

fn saved_folder(app: &AppHandle) -> Option<String> {
  let path = folder_config_path(app).ok()?;
  let data = std::fs::read_to_string(path).ok()?;
  let parsed: Value = serde_json::from_str(&data).ok()?;
  parsed.get("folder")?.as_str().map(str::to_string)
}

/// Redimensiona y cachea como JPEG (equivalente a `nativeImage.resize` + `toJPEG`).
fn cached_resized_jpeg(
  app: &AppHandle,
  source: &Path,
  cache_dir_name: &str,
  max_width: u32,
  quality: u8,
) -> Option<String> {
  let mtime = paths::mtime_ms(source)?;
  let cache_dir = paths::data_dir(app).ok()?.join(cache_dir_name);
  let _ = std::fs::create_dir_all(&cache_dir);

  let key = md5_hex(&format!("{}|{}|{}", source.display(), mtime, max_width));
  let cache_path = cache_dir.join(format!("{key}.jpg"));
  if cache_path.exists() {
    let data = std::fs::read(&cache_path).ok()?;
    return Some(format!("data:image/jpeg;base64,{}", BASE64.encode(data)));
  }

  let img = image::open(source).ok()?;
  let (width, height) = (img.width(), img.height());
  let resized = if width > max_width {
    let target_height = ((height as f64) * (max_width as f64 / width as f64)).round().max(1.0) as u32;
    img.resize_exact(max_width, target_height, FilterType::Lanczos3)
  } else {
    img
  };

  let rgb = resized.to_rgb8();
  let mut encoded = Vec::new();
  image::codecs::jpeg::JpegEncoder::new_with_quality(&mut encoded, quality)
    .write_image(rgb.as_raw(), rgb.width(), rgb.height(), image::ExtendedColorType::Rgb8)
    .ok()?;
  let _ = std::fs::write(&cache_path, &encoded);
  Some(format!("data:image/jpeg;base64,{}", BASE64.encode(&encoded)))
}

fn collect_wallpaper_images(app: &AppHandle, folder: &Path) -> Vec<WallpaperImage> {
  let mut out: Vec<WallpaperImage> = Vec::new();
  let Ok(entries) = std::fs::read_dir(folder) else {
    return out;
  };
  for entry in entries.flatten() {
    let name = entry.file_name().to_string_lossy().to_string();
    let ext = Path::new(&name)
      .extension()
      .and_then(|value| value.to_str())
      .unwrap_or("")
      .to_lowercase();
    if !paths::IMAGE_EXTS.contains(&ext.as_str()) {
      continue;
    }
    let full = entry.path();
    let Ok(meta) = entry.metadata() else {
      continue;
    };
    let mtime = meta.modified().map(paths::system_time_ms).unwrap_or(0);

    let mut data_url = cached_resized_jpeg(app, &full, THUMB_CACHE_DIR, THUMB_MAX_WIDTH, THUMB_QUALITY);
    if data_url.is_none() {
      data_url = paths::file_to_data_url(&full);
    }
    let Some(data_url) = data_url else {
      continue;
    };

    out.push(WallpaperImage {
      name,
      path: full.to_string_lossy().to_string(),
      data_url,
      mtime,
    });
  }
  out.sort_by(|a, b| b.mtime.cmp(&a.mtime));
  out
}

#[tauri::command]
pub async fn select_wallpaper_folder(app: AppHandle) -> Option<WallpaperSelection> {
  let picked = app.dialog().file().blocking_pick_folder()?;
  let folder = picked.into_path().ok()?;
  let folder_str = folder.to_string_lossy().to_string();

  if let Ok(path) = folder_config_path(&app) {
    let _ = std::fs::write(path, json!({ "folder": folder_str }).to_string());
  }

  let images = collect_wallpaper_images(&app, &folder);
  Some(WallpaperSelection { folder: folder_str, images })
}

#[tauri::command]
pub fn get_wallpaper_folder(app: AppHandle) -> Option<String> {
  saved_folder(&app)
}

#[tauri::command]
pub async fn get_wallpaper_images(app: AppHandle, folder: Option<String>) -> Vec<WallpaperImage> {
  let folder = match folder {
    Some(value) if !value.is_empty() => PathBuf::from(value),
    _ => match saved_folder(&app) {
      Some(value) => PathBuf::from(value),
      None => return Vec::new(),
    },
  };
  if !folder.is_dir() {
    return Vec::new();
  }
  collect_wallpaper_images(&app, &folder)
}

#[tauri::command]
pub fn set_wallpaper_as_background(app: AppHandle, source_path: String) -> Option<String> {
  let source = PathBuf::from(&source_path);
  if source_path.is_empty() || !source.exists() {
    return None;
  }
  let ext = source.extension().and_then(|value| value.to_str()).unwrap_or("").to_lowercase();

  let base = paths::data_file(&app, "background").ok()?;
  for candidate in paths::IMAGE_EXTS {
    let _ = std::fs::remove_file(base.with_extension(candidate));
  }
  let dest = if ext.is_empty() { base.clone() } else { base.with_extension(&ext) };
  std::fs::copy(&source, &dest).ok()?;
  paths::file_to_data_url(&dest)
}

#[tauri::command]
pub async fn get_wallpaper_preview(app: AppHandle, path: String) -> Option<String> {
  let source = PathBuf::from(&path);
  if path.is_empty() || !source.exists() {
    return None;
  }
  cached_resized_jpeg(&app, &source, PREVIEW_CACHE_DIR, PREVIEW_MAX_WIDTH, PREVIEW_QUALITY)
}
