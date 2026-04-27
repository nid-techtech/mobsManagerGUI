# MobsManager Editor

![MobsManager Editor Title](https://imgur.com/ngmh2fQ.png)

このアプリは、techTeCraft3に導入しているMobsManager PluginのconfigファイルをGUIで編集するアプリです。  

## 想定動作環境

Minecraft Java Edition 1.20.1 MohistMC(PaperMC互換)に導入したMobsManager 5.6.0  
Intel CPUで動作するmacOS Sequoia 15.7.5

## 構成技術

Tauri v2  
Astro  
React  
TypeScript  
TailwindCSS  
Bun  

# 画面

## メイン画面

![MobsManager Editor Main Screen](https://imgur.com/gd8xv2n.png)

### Mobの一覧表示とModタブ

いろんなModがMobを追加する環境なので、Modごとに分かれたタブ画面で容易にMobを一覧できます。  
また、検索バーでMobを検索することもできます。
一致するMobはModによらず横断検索されます。  

### マルチバース制御

MobsManagerは各ディメンションごとにMobのスポーンを設定することができます。  
MMEでは簡単設定のため、デフォルトでマルチバース制御を有効にしてあります。
この状態でスポーン許可を編集すると、全てのディメンションに対して一括で設定を変更できます。  
マルチバース制御を無効にすると、ディメンション別に設定できるようになります。
これは黄昏の森を始めとするディメンション追加MOD導入時にも便利です。  

### スポーン理由別許可

Mobのスポーン理由は多岐にわたります。  
デフォルトでは、全スポーン許可の有効無効を切り替えることで、一括で設定を変更できます。
またスポーン理由ごとに個別で設定することも可能です。

## 設定画面

![MobsManager Editor Setting Screen](https://imgur.com/Bcs1FS6.png)

### アピアランス

ライトテーマ・ダークテーマを切り替えることができます。  
表示言語を切り替えることもでき、現状は日本語・英語・中国語に対応しています。  

### バックアップ

「バックアップを作成」を有効にすると、`mobsData.yml`を上書き保存する際に、同時にコピーが作成されます。  
デフォルトでは、`mobsData.yml`と同じディレクトリに`backups`フォルダを作成し、その中に`mobsDataBackup_yymmddhhmmss.yml`という名前で保存されます。  

### Mod名の正規化

MobのIDのプレフィックスを読み取ることで、導入されているModを検知しています。  
しかし、Modによっては複数単語で構成された名前のModもあり、どこまでがMod名称でどこからがMob名称なのかが判別できないことがあります。  
開発ベータでは、Minecraftバニラで追加された、複数単語の名称を持つMobを、誤ってModにより導入されたMobとして認識し、存在しないModのタブを表示してしまうなどの問題もありました。  

これを解決するため、内部にバニラMobのリストと複数単語名称Modのリストを保持し、これに従ってModのタブを正確に表示するようにしています。  
現状、私のローカル環境に存在するModの情報を掲載していますので、他の環境でも正しく動作させるため、このリストはユーザーが編集できるようにしてあります。  

# ライセンス概要と免責事項

このアプリはGemini3による支援を受けて大渕凜が作成し、Apache 2.0ライセンスで公開されています。  

MinecraftはMicrosoftとMojangの登録商標です。
Minecraft 非公式プラグインの一つであるMobsManagerはStellionixが開発および公開し、商標を保持しています。
MobsManager EditorはMobsManagerの非公式クライアントです。  
MicrosoftとMojang、Stellionix、大渕凜の間にはいかなる資本関係・業務提携関係もありません。

MobsManager Editorは、長岡造形大学公認サークルの一つ、TECH☆TECH 先端メディア表現サークルが運営するMinecraftサーバー「techTeCraft」に導入しているMobsManagerプラグインの編集管理を簡単にするために開発したアプリであり、これ以外の環境で正常に動作することを保証するものではありません。
MobsManager Editorの利用によって生じるいかなる損害についても、大渕凜は責任を負いません。  
また、MobsManager本体の更新により、本アプリとの互換性が失われた場合に、大渕は互換性を維持するための修正を行う義務を負いません。
なお、StellionixやMojang、Microsoftに、本アプリに関する意見や要望を伝えることは**絶対に**しないでください。  


[techTeCraft](https://github.com/nid-techtech/techTeCraft)  
[MobsManager](https://github.com/Stellionix/MobsManager)
