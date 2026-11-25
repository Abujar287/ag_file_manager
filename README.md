# AG File Manager 📁⚡

A minimal, lightweight, and ultra-fast Android & Web File Manager with storage analysis, multi-tab window browsing, batch rename, and automated APK updates.

---

## 📥 Download Release APK

The latest signed Android APK is included directly in this repository:

- **[⬇️ Download AG_File_Manager_v1.2.0.apk](./apk/AG_File_Manager_v1.2.0.apk)** (Direct repository link)
- **[⬇️ Web Download Path](./public/downloads/AG_File_Manager_v1.2.0.apk)**
- **[⬇️ Root Package](./AG_File_Manager_v1.2.0.apk)**

> *Also automatically uploaded as a build artifact in GitHub Actions on every run.*

---

## ✨ Features

- **MicroSD Storage Overview**: Authentic MicroSD card layout with circular storage usage gauges, horizontal groove line, and instant capacity readouts (Internal Storage & External SD Card with "No card found" fallback).
- **Categories (4x2)**: Images, Videos, Audio, Apps (APKs), New Files, Compressed, Documents, and Recycle Bin with center-aligned counts.
- **Deep Storage Analyzer**:
  - File Analyzer & Large Files (>100MB)
  - Duplicate file finder via SHA-256
  - Empty folder cleaner & App Cache sweeper
  - Recent files (last 7 days)
- **Batch Rename Engine**: Prefix, suffix, find & replace, sequential numbering with instant preview.
- **Multi-Tab Browsing**: Multi-window switcher with quick-close and history.
- **In-App Updater**: Seamless update flow checking `version.json` and downloading releases to the device's public Download folder.

---

## 👤 App Information

- **Apps Owner Name**: Abujar Al-Gifari
- **Email**: [abujar287.algifari@gmail.com](mailto:abujar287.algifari@gmail.com)
- **Version**: 1.2.0 (Build 3)

---

## 🛠️ Development & Build

### Web Application (Vite + React)
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Compile for production
npm run build
```

### Android Native App (`android-project/`)
The native Kotlin Android source code is located in the [`android-project/`](./android-project/) directory:
```bash
cd android-project
./gradlew assembleRelease
```
