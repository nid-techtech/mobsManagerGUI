use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use chrono::Local;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
pub struct MobEntry {
    #[serde(rename = "==")]
    pub class_name: String,
    pub name: String,
    pub world_name: String,
    pub all_spawn: bool,
    pub natural_spawn: bool,
    pub custom_spawn: bool,
    pub spawner_spawn: bool,
    pub egg_spawn: bool,
    pub breeding_spawn: bool,
    pub iron_golem_spawn: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MobsData {
    pub mobs: Vec<MobEntry>,
}

#[tauri::command]
fn load_mobs_data(path: String) -> Result<MobsData, String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let data: MobsData = serde_yaml::from_str(&content).map_err(|e| e.to_string())?;
    Ok(data)
}

#[tauri::command]
fn save_mobs_data(path: String, data: MobsData, backup: bool) -> Result<(), String> {
    let file_path = Path::new(&path);
    
    if backup {
        let parent = file_path.parent().ok_or("Invalid path")?;
        let backups_dir = parent.join("backups");
        if !backups_dir.exists() {
            fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;
        }
        
        let timestamp = Local::now().format("%y%m%d%H%M%S").to_string();
        let backup_filename = format!("mobsDataBackup_{}.yml", timestamp);
        let backup_path = backups_dir.join(backup_filename);
        
        if file_path.exists() {
            fs::copy(file_path, backup_path).map_err(|e| e.to_string())?;
        }
    }
    
    let yaml = serde_yaml::to_string(&data).map_err(|e| e.to_string())?;
    fs::write(file_path, yaml).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn read_resource_file(name: String) -> Result<String, String> {
    let path = Path::new("resources").join("modsList").join(name);
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![load_mobs_data, save_mobs_data, read_resource_file])
    .setup(|app| {
      #[cfg(target_os = "macos")]
      {
        use tauri::menu::{Menu, Submenu, PredefinedMenuItem, AboutMetadata};
        let handle = app.handle();
        let about_meta = AboutMetadata {
          name: Some("Mobs Manager Editor".to_string()),
          version: Some(handle.package_info().version.to_string()),
          copyright: Some("© 2026 Stellionix / Mobs Manager GUI".to_string()),
          authors: Some(vec!["nid-techtech".to_string()]),
          comments: Some("This app is not affiliated with Microsoft, Mojang, or Stellionix (developer of MobsManager).".to_string()),
          ..Default::default()
        };
        
        let app_menu = Submenu::with_id(handle, "app", "App", true)?;
        app_menu.append(&PredefinedMenuItem::about(handle, None, Some(about_meta))?)?;
        app_menu.append(&PredefinedMenuItem::separator(handle)?)?;
        app_menu.append(&PredefinedMenuItem::services(handle, None)?)?;
        app_menu.append(&PredefinedMenuItem::separator(handle)?)?;
        app_menu.append(&PredefinedMenuItem::hide(handle, None)?)?;
        app_menu.append(&PredefinedMenuItem::hide_others(handle, None)?)?;
        app_menu.append(&PredefinedMenuItem::show_all(handle, None)?)?;
        app_menu.append(&PredefinedMenuItem::separator(handle)?)?;
        app_menu.append(&PredefinedMenuItem::quit(handle, None)?)?;

        let menu = Menu::with_items(handle, &[&app_menu])?;
        app.set_menu(menu)?;
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
