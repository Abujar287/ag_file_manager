# AG File Manager 📁⚡

A minimal, lightweight, and ultra-fast Android & Web File Manager with real device storage access, storage analysis, batch rename, multi-tab browsing, and automated GitHub-backed APK updates.

---

## 📥 Download Release APK

The latest signed Android APK is included directly in this repository:

- **[⬇️ Download AG_File_Manager_v1.2.0.apk](./apk/AG_File_Manager_v1.2.0.apk)** (Direct repository link)
- **[⬇️ Web Download Path](./public/downloads/AG_File_Manager_v1.2.0.apk)**
- **[⬇️ Root Package](./AG_File_Manager_v1.2.0.apk)**

> *Automatically version-bumped, built via Gradle/Android SDK, signed, and published to GitHub Releases on every push to `main`.*

---

## ✨ Features

- **Real Device Storage & Permissions**: Uses native Android storage/media permissions and `StatFs` to display live device files, folders, categories, thumbnails, and used/free capacity (Internal Storage & External SD Card).
- **Hardware Back Navigation + Exit Confirmation**: Pressing Back navigates upward or back to Home; pressing Back on Home prompts an Exit confirmation dialog before closing.
- **Categories (4x2)**: Images, Videos, Audio, Apps (APKs), New Files, Compressed, Documents, and Recycle Bin with live counts.
- **Deep Storage Analyzer**:
  - File Analyzer & Large Files
  - Duplicate file finder
  - Empty folder cleaner & App Cache sweeper
  - Recent files
- **Batch Rename Engine**: New Name + Number, Prefix + Original Name, and Extension Editor with live preview.
- **In-App Updater + DownloadManager/IDM Support**: Checks `version.json` from GitHub, downloads updates via Android `DownloadManager` (or browser/IDM), and opens the Android PackageInstaller.

---

## 👤 App Information

- **Apps Owner Name**: Abujar Al-Gifari
- **Email**: [abujar287.algifari@gmail.com](mailto:abujar287.algifari@gmail.com)
- **Version**: 1.2.0 (Build 3)

---

## 🛠️ Development & Build

### Web Application (Vite + React)
```bash
npm install
npm run dev
npm run build
```

### Android Native App (`android-project/`)
```bash
npm run build
npm run build:apk
```
