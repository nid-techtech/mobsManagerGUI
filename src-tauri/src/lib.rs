use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use chrono::Local;
use tauri::Manager;
use tauri::Emitter;

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
fn open_mod_folder(handle: tauri::AppHandle) -> Result<(), String> {
    let resource_dir = handle.path().resource_dir().unwrap_or_default();
    let path = resource_dir.join("resources/modsList");
    
    let final_path = if path.exists() {
        path
    } else {
        // Dev fallback
        let dev_path = std::env::current_dir().unwrap_or_default().join("../resources/modsList");
        if dev_path.exists() {
            dev_path
        } else {
            return Err("Mod list directory not found".to_string());
        }
    };

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(final_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(final_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        std::process::Command::new("xdg-open")
            .arg(final_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn get_mod_lists(handle: tauri::AppHandle) -> (String, String) {
    let vanilla_bundled = include_str!("../../resources/modsList/vanilla.md");
    let multi_word_bundled = include_str!("../../resources/modsList/modsNameWithAboveTwoWords.md");

    let resource_dir = handle.path().resource_dir().unwrap_or_default();
    
    let vanilla_path = resource_dir.join("resources/modsList/vanilla.md");
    let multi_word_path = resource_dir.join("resources/modsList/modsNameWithAboveTwoWords.md");

    let vanilla = fs::read_to_string(vanilla_path).unwrap_or_else(|_| vanilla_bundled.to_string());
    let multi_word = fs::read_to_string(multi_word_path).unwrap_or_else(|_| multi_word_bundled.to_string());

    (vanilla, multi_word)
}

struct MenuLabels {
    about: String,
    settings: String,
    services: String,
    hide: String,
    hide_others: String,
    show_all: String,
    quit: String,
    file: String,
    import_mobs: String,
    import_backup: String,
    save: String,
    save_as: String,
    search: String,
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
            file: "ファイル".to_string(),
            import_mobs: "mobsData.ymlをインポート".to_string(),
            import_backup: "バックアップからインポート".to_string(),
            save: "上書き保存".to_string(),
            save_as: "名前を付けて保存".to_string(),
            search: "検索".to_string(),
        },
        "zh" => MenuLabels {
            about: format!("关于 {}", app_name),
            settings: "设置".to_string(),
            services: "服务".to_string(),
            hide: format!("隐藏 {}", app_name),
            hide_others: "隐藏其他".to_string(),
            show_all: "显示全部".to_string(),
            quit: format!("退出 {}", app_name),
            file: "文件".to_string(),
            import_mobs: "导入 mobsData.yml".to_string(),
            import_backup: "从备份导入".to_string(),
            save: "保存更改".to_string(),
            save_as: "另存为...".to_string(),
            search: "搜索...".to_string(),
        },
        _ => MenuLabels {
            about: format!("About {}", app_name),
            settings: "Preferences".to_string(),
            services: "Services".to_string(),
            hide: format!("Hide {}", app_name),
            hide_others: "Hide Others".to_string(),
            show_all: "Show All".to_string(),
            quit: format!("Quit {}", app_name),
            file: "File".to_string(),
            import_mobs: "Import mobsData.yml".to_string(),
            import_backup: "Import from Backup".to_string(),
            save: "Save Changes".to_string(),
            save_as: "Save As...".to_string(),
            search: "Search...".to_string(),
        }
    }
}

fn create_app_menu<R: tauri::Runtime>(handle: &tauri::AppHandle<R>, lang: &str) -> tauri::Result<tauri::menu::Menu<R>> {
    use tauri::menu::{Menu, Submenu, MenuItem, PredefinedMenuItem};
    
    let labels = get_menu_labels(lang);
    
    let settings_menu = MenuItem::with_id(handle, "settings", &labels.settings, true, Some("CmdOrCtrl+,"))?;
    let about_menu = MenuItem::with_id(handle, "about", &labels.about, true, None::<&str>)?;
    
    let app_menu = Submenu::with_id(handle, "app", "App", true)?;
    app_menu.append(&about_menu)?;
    app_menu.append(&settings_menu)?;
    app_menu.append(&PredefinedMenuItem::separator(handle)?)?;
    app_menu.append(&PredefinedMenuItem::services(handle, Some(&labels.services))?)?;
    app_menu.append(&PredefinedMenuItem::separator(handle)?)?;
    app_menu.append(&PredefinedMenuItem::hide(handle, Some(&labels.hide))?)?;
    app_menu.append(&PredefinedMenuItem::hide_others(handle, Some(&labels.hide_others))?)?;
    app_menu.append(&PredefinedMenuItem::show_all(handle, Some(&labels.show_all))?)?;
    app_menu.append(&PredefinedMenuItem::separator(handle)?)?;
    app_menu.append(&PredefinedMenuItem::quit(handle, Some(&labels.quit))?)?;

    let file_menu = Submenu::with_id(handle, "file_menu", &labels.file, true)?;
    let import_mobs = MenuItem::with_id(handle, "import_mobs", &labels.import_mobs, true, Some("CmdOrCtrl+I"))?;
    let import_backup = MenuItem::with_id(handle, "import_backup", &labels.import_backup, true, None::<&str>)?;
    let save = MenuItem::with_id(handle, "save", &labels.save, true, Some("CmdOrCtrl+S"))?;
    let save_as = MenuItem::with_id(handle, "save_as", &labels.save_as, true, Some("CmdOrCtrl+Shift+S"))?;
    let search = MenuItem::with_id(handle, "search", &labels.search, true, Some("CmdOrCtrl+F"))?;

    file_menu.append(&import_mobs)?;
    file_menu.append(&import_backup)?;
    file_menu.append(&PredefinedMenuItem::separator(handle)?)?;
    file_menu.append(&save)?;
    file_menu.append(&save_as)?;
    file_menu.append(&PredefinedMenuItem::separator(handle)?)?;
    file_menu.append(&search)?;

    Menu::with_items(handle, &[&app_menu, &file_menu])
}

#[tauri::command]
fn update_menu(handle: tauri::AppHandle, lang: String) -> Result<(), String> {
    let menu = create_app_menu(&handle, &lang).map_err(|e| e.to_string())?;
    handle.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn update_app_icon(handle: tauri::AppHandle, theme: String) -> Result<(), String> {
    let resource_dir = handle.path().resource_dir().unwrap_or_default();
    
    // macOS用の高解像度アイコン（512x512@2x = 1024x1024）を使用
    let icon_path = resource_dir.join(format!("resources/icons/icons_MobsManagerEditor/macOS/{}/icon_512x512@2x.png", theme));
    let icon_path_alt = resource_dir.join(format!("icons/icons_MobsManagerEditor/macOS/{}/icon_512x512@2x.png", theme));
    
    let (final_path, found) = if icon_path.exists() {
        (icon_path.clone(), true)
    } else if icon_path_alt.exists() {
        (icon_path_alt.clone(), true)
    } else {
        // 開発環境用のフォールバック (src-tauri から見た相対パス)
        let dev_path = std::env::current_dir().unwrap_or_default().join(format!("../resources/icons/icons_MobsManagerEditor/macOS/{}/icon_512x512@2x.png", theme));
        if dev_path.exists() {
            (dev_path.clone(), true)
        } else {
            // プロジェクトルートから見た相対パス
            let root_path = std::env::current_dir().unwrap_or_default().join(format!("resources/icons/icons_MobsManagerEditor/macOS/{}/icon_512x512@2x.png", theme));
            if root_path.exists() {
                (root_path.clone(), true)
            } else {
                (root_path.clone(), false)
            }
        }
    };

    if !found {
        return Err(format!("Icon not found. Tried: {:?}, {:?}, etc. CWD: {:?}", icon_path, icon_path_alt, std::env::current_dir()));
    }

    let bytes = std::fs::read(final_path).map_err(|e| e.to_string())?;
    let image = tauri::image::Image::from_bytes(&bytes).map_err(|e| e.to_string())?;
    
    for window in handle.webview_windows().values() {
        let _ = window.set_icon(image.clone());
    }
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![load_mobs_data, save_mobs_data, get_mod_lists, update_menu, open_mod_folder, update_app_icon])
    .setup(|app| {
      #[cfg(target_os = "macos")]
      {
        let handle = app.handle();
        // 初期言語の判定
        let lang = "ja"; // デフォルト
        let menu = create_app_menu(handle, lang)?;
        app.set_menu(menu)?;

        app.on_menu_event(move |app, event| {
          let id = event.id().as_ref();
          if id == "settings" {
            if let Some(window) = app.get_webview_window("settings") {
              let _ = window.set_focus();
            } else {
              let _ = tauri::WebviewWindowBuilder::new(
                app,
                "settings",
                tauri::WebviewUrl::App("settings".into())
              )
              .title("環境設定")
              .inner_size(400.0, 380.0)
              .resizable(false)
              .always_on_top(true)
              .build();
            }
          } else if id == "about" {
            if let Some(window) = app.get_webview_window("about") {
              let _ = window.set_focus();
            } else {
              let _ = tauri::WebviewWindowBuilder::new(
                app,
                "about",
                tauri::WebviewUrl::App("about".into())
              )
              .title("このアプリについて")
              .inner_size(400.0, 370.0)
              .resizable(false)
              .always_on_top(true)
              .build();
            }
          } else {
            // Forward other menu events to frontend
            let _ = app.emit(id, ());
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
