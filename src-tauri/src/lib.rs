use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use chrono::Local;
use tauri::Manager;

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
fn get_mod_lists() -> (String, String) {
    let vanilla = include_str!("../../resources/modsList/vanilla.md");
    let multi_word = include_str!("../../resources/modsList/modsNameWithAboveTwoWords.md");
    (vanilla.to_string(), multi_word.to_string())
}

struct MenuLabels {
    about: String,
    settings: String,
    services: String,
    hide: String,
    hide_others: String,
    show_all: String,
    quit: String,
}

fn get_menu_labels(lang: &str) -> MenuLabels {
    let app_name = "Mobs Manager Editor";
    match lang {
        "ja" => MenuLabels {
            about: format!("{}について", app_name),
            settings: "環境設定".to_string(),
            services: "サービス".to_string(),
            hide: format!("{}を隠す", app_name),
            hide_others: "ほかを隠す".to_string(),
            show_all: "すべてを表示".to_string(),
            quit: format!("{}を終了", app_name),
        },
        "zh" => MenuLabels {
            about: format!("关于 {}", app_name),
            settings: "设置".to_string(),
            services: "服务".to_string(),
            hide: format!("隐藏 {}", app_name),
            hide_others: "隐藏其他".to_string(),
            show_all: "显示全部".to_string(),
            quit: format!("退出 {}", app_name),
        },
        _ => MenuLabels {
            about: format!("About {}", app_name),
            settings: "Preferences".to_string(),
            services: "Services".to_string(),
            hide: format!("Hide {}", app_name),
            hide_others: "Hide Others".to_string(),
            show_all: "Show All".to_string(),
            quit: format!("Quit {}", app_name),
        }
    }
}

fn create_app_menu<R: tauri::Runtime>(handle: &tauri::AppHandle<R>, lang: &str) -> tauri::Result<tauri::menu::Menu<R>> {
    use tauri::menu::{Menu, Submenu, MenuItem, PredefinedMenuItem, AboutMetadata};
    
    let labels = get_menu_labels(lang);
    
    let about_meta = AboutMetadata {
      name: Some("Mobs Manager Editor".to_string()),
      version: Some(handle.package_info().version.to_string()),
      copyright: Some("© 2026 Stellionix / Mobs Manager GUI".to_string()),
      authors: Some(vec!["nid-techtech".to_string()]),
      comments: Some("This app is not affiliated with Microsoft, Mojang, or Stellionix (developer of MobsManager).".to_string()),
      ..Default::default()
    };
    
    let settings_menu = MenuItem::with_id(handle, "settings", &labels.settings, true, Some("CmdOrCtrl+,"))?;
    
    let app_menu = Submenu::with_id(handle, "app", "App", true)?;
    app_menu.append(&PredefinedMenuItem::about(handle, Some(&labels.about), Some(about_meta))?)?;
    app_menu.append(&settings_menu)?;
    app_menu.append(&PredefinedMenuItem::separator(handle)?)?;
    app_menu.append(&PredefinedMenuItem::services(handle, Some(&labels.services))?)?;
    app_menu.append(&PredefinedMenuItem::separator(handle)?)?;
    app_menu.append(&PredefinedMenuItem::hide(handle, Some(&labels.hide))?)?;
    app_menu.append(&PredefinedMenuItem::hide_others(handle, Some(&labels.hide_others))?)?;
    app_menu.append(&PredefinedMenuItem::show_all(handle, Some(&labels.show_all))?)?;
    app_menu.append(&PredefinedMenuItem::separator(handle)?)?;
    app_menu.append(&PredefinedMenuItem::quit(handle, Some(&labels.quit))?)?;

    Menu::with_items(handle, &[&app_menu])
}

#[tauri::command]
fn update_menu(handle: tauri::AppHandle, lang: String) -> Result<(), String> {
    let menu = create_app_menu(&handle, &lang).map_err(|e| e.to_string())?;
    handle.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![load_mobs_data, save_mobs_data, get_mod_lists, update_menu])
    .setup(|app| {
      #[cfg(target_os = "macos")]
      {
        let handle = app.handle();
        // 初期言語の判定（とりあえずOSの言語設定から。本当は保存された設定を読みたいが、
        // フロントエンド側で起動時にupdate_menuを呼ぶ形にするのが楽）
        let lang = "ja"; // デフォルト
        let menu = create_app_menu(handle, lang)?;
        app.set_menu(menu)?;

        app.on_menu_event(move |app, event| {
          if event.id() == "settings" {
            if let Some(window) = app.get_webview_window("settings") {
              let _ = window.set_focus();
            } else {
              let _ = tauri::WebviewWindowBuilder::new(
                app,
                "settings",
                tauri::WebviewUrl::App("settings".into())
              )
              .title("環境設定")
              .inner_size(400.0, 450.0)
              .resizable(false)
              .always_on_top(true)
              .build();
            }
          }
        });
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
