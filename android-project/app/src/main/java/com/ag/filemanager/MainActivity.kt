package com.ag.filemanager

import android.Manifest
import android.app.Activity
import android.app.DownloadManager
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.MimeTypeMap
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.ag.filemanager.storage.StorageAnalyzer
import com.ag.filemanager.update.UpdateManager
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.ArrayDeque

class MainActivity : Activity() {

    private lateinit var updateManager: UpdateManager
    private var webView: WebView? = null
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var lastPermissionState: Boolean = false

    companion object {
        private const val REQ_INSTALL_PACKAGES = 1001
        private const val REQ_WRITE_STORAGE = 1002
        private const val REQ_MANAGE_STORAGE = 1003
        private const val REQ_MEDIA_PERMISSIONS = 1004
        private const val REQ_FILE_CHOOSER = 1005
        private const val REMOTE_MANIFEST_URL =
            "https://raw.githubusercontent.com/Abujar287/ag_file_manager/main/version.json"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        actionBar?.title = getString(R.string.app_name)

        updateManager = UpdateManager(
            activity = this,
            manifestUrl = REMOTE_MANIFEST_URL,
            onRequestInstallPermission = { intent ->
                @Suppress("DEPRECATION")
                startActivityForResult(intent, REQ_INSTALL_PACKAGES)
            },
            onRequestStoragePermission = {
                requestMediaStoragePermissions()
            }
        )

        lastPermissionState = isStoragePermissionGranted()
        if (!lastPermissionState) {
            requestMediaStoragePermissions()
        }

        setupWebView()
    }

    override fun onResume() {
        super.onResume()
        val grantedNow = isStoragePermissionGranted()
        if (grantedNow != lastPermissionState) {
            lastPermissionState = grantedNow
            notifyWebPermissionResult(grantedNow)
        }
    }

    private fun setupWebView() {
        val wv = WebView(this)
        webView = wv
        setContentView(wv)

        wv.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        wv.webViewClient = WebViewClient()
        wv.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                val intent = params?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                try {
                    @Suppress("DEPRECATION")
                    startActivityForResult(intent, REQ_FILE_CHOOSER)
                } catch (_: Exception) {
                    filePathCallback = null
                    return false
                }
                return true
            }
        }

        wv.addJavascriptInterface(AndroidBridge(), "AndroidBridge")
        wv.addJavascriptInterface(AndroidBridge(), "AndroidInterface")

        wv.loadUrl("file:///android_asset/dist/index.html")
    }

    private fun isStoragePermissionGranted(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Environment.isExternalStorageManager()
        } else {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.READ_EXTERNAL_STORAGE
            ) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun requestMediaStoragePermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                    data = Uri.parse("package:$packageName")
                }
                @Suppress("DEPRECATION")
                startActivityForResult(intent, REQ_MANAGE_STORAGE)
            } catch (_: Exception) {
                try {
                    val fallbackIntent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                    @Suppress("DEPRECATION")
                    startActivityForResult(fallbackIntent, REQ_MANAGE_STORAGE)
                } catch (_: Exception) {
                }
            }
        } else {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
                ),
                REQ_WRITE_STORAGE
            )
        }
    }

    private fun notifyWebPermissionResult(granted: Boolean) {
        webView?.post {
            webView?.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('android_permission_result', { detail: { granted: $granted } }));",
                null
            )
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        when (requestCode) {
            REQ_INSTALL_PACKAGES -> updateManager.resumePendingInstallIfGranted()
            REQ_MANAGE_STORAGE -> {
                val granted = isStoragePermissionGranted()
                lastPermissionState = granted
                notifyWebPermissionResult(granted)
            }
            REQ_FILE_CHOOSER -> {
                filePathCallback?.onReceiveValue(
                    WebChromeClient.FileChooserParams.parseResult(resultCode, data)
                )
                filePathCallback = null
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
        lastPermissionState = granted || isStoragePermissionGranted()
        if (requestCode == REQ_WRITE_STORAGE) {
            updateManager.onStoragePermissionResult(granted)
        }
        notifyWebPermissionResult(lastPermissionState)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        val wv = webView
        if (wv != null) {
            wv.evaluateJavascript(
                "if (typeof window.handleSystemBackButton === 'function') { window.handleSystemBackButton(); } else { window.history.back(); }",
                null
            )
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }

    fun onCheckUpdateClicked() {
        updateManager.checkForUpdate()
    }

    inner class AndroidBridge {

        private fun getInternalRootCanonical(): String {
            return try {
                Environment.getExternalStorageDirectory().canonicalPath
            } catch (_: Exception) {
                Environment.getExternalStorageDirectory().absolutePath
            }
        }

        private fun getSdRootCanonical(): String? {
            return try {
                StorageAnalyzer.getExternalSdCard(this@MainActivity)?.rootPath?.canonicalPath
            } catch (_: Exception) {
                null
            }
        }

        private fun mapParentId(dir: File): String {
            val canonical = try {
                dir.canonicalPath
            } catch (_: Exception) {
                dir.absolutePath
            }
            val internalRoot = getInternalRootCanonical()
            if (canonical == internalRoot) return "internal_root"
            val sdRoot = getSdRootCanonical()
            if (sdRoot != null && canonical == sdRoot) return "sd_root"
            return "device_$canonical"
        }

        private fun fileToJson(file: File, forcedParentId: String? = null): JSONObject {
            val canonical = try {
                file.canonicalPath
            } catch (_: Exception) {
                file.absolutePath
            }
            val isDir = file.isDirectory
            val kind = if (isDir) "folder" else inferKind(file.name)
            val parentId = forcedParentId ?: file.parentFile?.let { mapParentId(it) } ?: "internal_root"

            return JSONObject().apply {
                put("id", "device_$canonical")
                put("name", file.name)
                put("parentId", parentId)
                put("kind", kind)
                put("size", if (isDir) 0L else file.length())
                put("modifiedAt", file.lastModified())
                put("hidden", file.name.startsWith("."))
                put("realPath", canonical)
                if (!isDir && kind == "image") {
                    put("thumbnailUrl", Uri.fromFile(file).toString())
                }
            }
        }

        @JavascriptInterface
        fun isPermissionGranted(): Boolean {
            return isStoragePermissionGranted()
        }

        @JavascriptInterface
        fun requestStoragePermissions() {
            runOnUiThread {
                requestMediaStoragePermissions()
            }
        }

        @JavascriptInterface
        fun getAppVersionCode(): Int {
            return BuildConfig.VERSION_CODE
        }

        @JavascriptInterface
        fun getAppVersionName(): String {
            return BuildConfig.VERSION_NAME
        }

        @JavascriptInterface
        fun getDeviceStorageStats(): String {
            return try {
                val internal = StorageAnalyzer.getInternalStorage()
                val external = StorageAnalyzer.getExternalSdCard(this@MainActivity)

                val root = JSONObject().apply {
                    put("internal", JSONObject().apply {
                        put("totalBytes", internal.totalBytes)
                        put("usedBytes", internal.usedBytes)
                        put("freeBytes", internal.freeBytes)
                        put("usedPercent", internal.usedPercent)
                        put("rootPath", internal.rootPath.canonicalPath)
                    })
                    put("external", JSONObject().apply {
                        put("isMounted", external != null)
                        put("totalBytes", external?.totalBytes ?: 0L)
                        put("usedBytes", external?.usedBytes ?: 0L)
                        put("freeBytes", external?.freeBytes ?: 0L)
                        put("usedPercent", external?.usedPercent ?: 0)
                        if (external != null) {
                            put("rootPath", external.rootPath.canonicalPath)
                        }
                    })
                }
                root.toString()
            } catch (_: Exception) {
                "{}"
            }
        }

        @JavascriptInterface
        fun listDirectory(path: String?): String {
            return try {
                val targetDir = when {
                    path.isNullOrEmpty() || path == "internal_root" -> Environment.getExternalStorageDirectory()
                    path == "sd_root" -> StorageAnalyzer.getExternalSdCard(this@MainActivity)?.rootPath
                        ?: return "[]"
                    else -> File(path)
                }

                if (!targetDir.exists() || !targetDir.isDirectory || !targetDir.canRead()) {
                    return "[]"
                }

                val list = targetDir.listFiles() ?: return "[]"
                val resolvedParentId = mapParentId(targetDir)
                val jsonArr = JSONArray()

                for (file in list) {
                    jsonArr.put(fileToJson(file, resolvedParentId))
                }

                jsonArr.toString()
            } catch (_: Exception) {
                "[]"
            }
        }

        @JavascriptInterface
        fun scanAllCategories(): String {
            return try {
                val roots = mutableListOf(Environment.getExternalStorageDirectory())
                StorageAnalyzer.getExternalSdCard(this@MainActivity)?.rootPath?.let { roots.add(it) }

                val jsonArr = JSONArray()
                val queue = ArrayDeque<File>()
                for (r in roots) {
                    if (r.exists() && r.canRead()) queue.add(r)
                }

                var scannedCount = 0
                val maxEntries = 3500

                while (queue.isNotEmpty() && scannedCount < maxEntries) {
                    val dir = queue.removeFirst()
                    val children = dir.listFiles() ?: continue
                    val resolvedParentId = mapParentId(dir)
                    for (child in children) {
                        val name = child.name
                        if (child.isDirectory) {
                            // Skip restricted Android/data & Android/obb subtree for speed and OS compliance
                            if (name == "Android" && (dir.canonicalPath == getInternalRootCanonical() || dir.canonicalPath == getSdRootCanonical())) {
                                continue
                            }
                            if (!name.startsWith(".")) {
                                queue.addLast(child)
                            }
                            jsonArr.put(fileToJson(child, resolvedParentId))
                        } else {
                            jsonArr.put(fileToJson(child, resolvedParentId))
                        }
                        scannedCount++
                        if (scannedCount >= maxEntries) break
                    }
                }
                jsonArr.toString()
            } catch (_: Exception) {
                "[]"
            }
        }

        @JavascriptInterface
        fun createFolder(parentPath: String, name: String): Boolean {
            return try {
                val safeName = File(name).name
                if (safeName.isBlank()) return false
                val target = File(parentPath, safeName)
                target.exists() || target.mkdirs()
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun createTextFile(parentPath: String, name: String, content: String): Boolean {
            return try {
                val safeName = File(name).name
                if (safeName.isBlank()) return false
                val target = File(parentPath, safeName)
                target.writeText(content)
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun readTextFile(path: String): String {
            return try {
                val file = File(path)
                if (file.exists() && file.isFile && file.length() <= 512 * 1024) {
                    file.readText()
                } else {
                    ""
                }
            } catch (_: Exception) {
                ""
            }
        }

        @JavascriptInterface
        fun writeTextFile(path: String, content: String): Boolean {
            return try {
                val file = File(path)
                file.writeText(content)
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun renamePath(path: String, newName: String): Boolean {
            return try {
                val src = File(path)
                val safeName = File(newName).name
                if (!src.exists() || safeName.isBlank()) return false
                val dest = File(src.parentFile, safeName)
                src.renameTo(dest)
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun deletePaths(pathsJson: String, moveToTrash: Boolean): Boolean {
            return try {
                val arr = JSONArray(pathsJson)
                var allOk = true
                val trashDir = File(Environment.getExternalStorageDirectory(), ".AGFileManagerTrash")
                if (moveToTrash && !trashDir.exists()) {
                    trashDir.mkdirs()
                }
                for (i in 0 until arr.length()) {
                    val f = File(arr.getString(i))
                    if (!f.exists()) continue
                    if (moveToTrash) {
                        val dest = File(trashDir, "${System.currentTimeMillis()}_${f.name}")
                        if (!f.renameTo(dest)) {
                            if (!f.deleteRecursively()) allOk = false
                        }
                    } else {
                        if (!f.deleteRecursively()) allOk = false
                    }
                }
                allOk
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun copyOrMovePaths(pathsJson: String, targetDirPath: String, move: Boolean): Boolean {
            return try {
                val arr = JSONArray(pathsJson)
                val destDir = File(targetDirPath)
                if (!destDir.exists() && !destDir.mkdirs()) return false
                var allOk = true
                for (i in 0 until arr.length()) {
                    val src = File(arr.getString(i))
                    if (!src.exists()) continue
                    var dest = File(destDir, src.name)
                    if (!move && dest.exists()) {
                        dest = File(destDir, "Copy of ${src.name}")
                    }
                    if (move) {
                        if (!src.renameTo(dest)) {
                            if (src.copyRecursively(dest, overwrite = true)) {
                                src.deleteRecursively()
                            } else {
                                allOk = false
                            }
                        }
                    } else {
                        if (!src.copyRecursively(dest, overwrite = true)) {
                            allOk = false
                        }
                    }
                }
                allOk
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun openFile(path: String, mimeType: String?): Boolean {
            return try {
                val file = File(path)
                if (!file.exists()) return false
                val uri = FileProvider.getUriForFile(
                    this@MainActivity,
                    "${BuildConfig.APPLICATION_ID}.fileprovider",
                    file
                )
                val ext = MimeTypeMap.getFileExtensionFromUrl(Uri.fromFile(file).toString()).lowercase()
                val resolvedMime = if (!mimeType.isNullOrBlank()) {
                    mimeType
                } else {
                    MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: "*/*"
                }
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, resolvedMime)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                runOnUiThread {
                    try {
                        startActivity(Intent.createChooser(intent, file.name))
                    } catch (_: Exception) {
                    }
                }
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun shareFiles(pathsJson: String) {
            try {
                val arr = JSONArray(pathsJson)
                val uris = ArrayList<Uri>()
                for (i in 0 until arr.length()) {
                    val file = File(arr.getString(i))
                    if (file.exists()) {
                        uris.add(
                            FileProvider.getUriForFile(
                                this@MainActivity,
                                "${BuildConfig.APPLICATION_ID}.fileprovider",
                                file
                            )
                        )
                    }
                }
                if (uris.isEmpty()) return
                val intent = if (uris.size == 1) {
                    Intent(Intent.ACTION_SEND).apply {
                        type = "*/*"
                        putExtra(Intent.EXTRA_STREAM, uris[0])
                    }
                } else {
                    Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                        type = "*/*"
                        putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
                    }
                }
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                runOnUiThread {
                    startActivity(Intent.createChooser(intent, "Share via AG File Manager"))
                }
            } catch (_: Exception) {
            }
        }

        @JavascriptInterface
        fun downloadWithDownloadManager(url: String, fileName: String, title: String): String {
            return try {
                removeExistingDownload(fileName)
                val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                val req = DownloadManager.Request(Uri.parse(url)).apply {
                    setTitle(title)
                    setDescription("Downloading $fileName")
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    if (fileName.lowercase().endsWith(".apk")) {
                        setMimeType("application/vnd.android.package-archive")
                    }
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                    setAllowedOverMetered(true)
                    setAllowedOverRoaming(true)
                }
                val id = dm.enqueue(req)
                id.toString()
            } catch (_: Exception) {
                runOnUiThread {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    } catch (_: Exception) {
                    }
                }
                ""
            }
        }

        @JavascriptInterface
        fun getDownloadProgress(downloadIdStr: String): String {
            return try {
                val downloadId = downloadIdStr.toLongOrNull() ?: return "{}"
                val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                val cursor = dm.query(DownloadManager.Query().setFilterById(downloadId))
                cursor?.use { c ->
                    if (c.moveToFirst()) {
                        val statusInt = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
                        val downloaded = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
                        val total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
                        val localUri = c.getString(c.getColumnIndexOrThrow(DownloadManager.COLUMN_LOCAL_URI))
                        val reason = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))

                        val statusStr = when (statusInt) {
                            DownloadManager.STATUS_PENDING -> "pending"
                            DownloadManager.STATUS_RUNNING -> "running"
                            DownloadManager.STATUS_PAUSED -> "paused"
                            DownloadManager.STATUS_SUCCESSFUL -> "successful"
                            DownloadManager.STATUS_FAILED -> "failed"
                            else -> "unknown"
                        }

                        return JSONObject().apply {
                            put("status", statusStr)
                            put("downloadedBytes", downloaded)
                            put("totalBytes", total)
                            put("localPath", localUri?.let { Uri.parse(it).path } ?: "")
                            if (statusStr == "failed") {
                                put("reason", "Download failed (code $reason)")
                            }
                        }.toString()
                    }
                }
                "{}"
            } catch (_: Exception) {
                "{}"
            }
        }

        @JavascriptInterface
        fun canRequestPackageInstalls(): Boolean {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                packageManager.canRequestPackageInstalls()
            } else {
                true
            }
        }

        @JavascriptInterface
        fun requestInstallPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                runOnUiThread {
                    try {
                        val intent = Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:$packageName")
                        )
                        @Suppress("DEPRECATION")
                        startActivityForResult(intent, REQ_INSTALL_PACKAGES)
                    } catch (_: Exception) {
                    }
                }
            }
        }

        @JavascriptInterface
        fun installApk(localPath: String): Boolean {
            return try {
                val apkFile = File(localPath)
                if (!apkFile.exists() || apkFile.length() == 0L) return false

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
                    requestInstallPermission()
                    return false
                }

                val uri = FileProvider.getUriForFile(
                    this@MainActivity,
                    "${BuildConfig.APPLICATION_ID}.fileprovider",
                    apkFile
                )
                val installIntent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, "application/vnd.android.package-archive")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                runOnUiThread {
                    try {
                        startActivity(installIntent)
                    } catch (_: Exception) {
                    }
                }
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun exitApp() {
            runOnUiThread {
                finishAffinity()
            }
        }

        private fun removeExistingDownload(fileName: String) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val projection = arrayOf(MediaStore.Downloads._ID)
                    val selection = "${MediaStore.Downloads.DISPLAY_NAME} = ?"
                    contentResolver.query(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        projection,
                        selection,
                        arrayOf(fileName),
                        null
                    )?.use { cursor ->
                        while (cursor.moveToNext()) {
                            val id = cursor.getLong(0)
                            val uri = ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, id)
                            contentResolver.delete(uri, null, null)
                        }
                    }
                } else {
                    val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    val existing = File(dir, fileName)
                    if (existing.exists()) existing.delete()
                }
            } catch (_: Exception) {
            }
        }

        private fun inferKind(name: String): String {
            val lower = name.lowercase()
            return when {
                lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") ||
                lower.endsWith(".webp") || lower.endsWith(".gif") || lower.endsWith(".heic") ||
                lower.endsWith(".svg") -> "image"
                lower.endsWith(".mp4") || lower.endsWith(".mkv") || lower.endsWith(".mov") ||
                lower.endsWith(".avi") || lower.endsWith(".webm") || lower.endsWith(".3gp") -> "video"
                lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".flac") ||
                lower.endsWith(".m4a") || lower.endsWith(".aac") || lower.endsWith(".ogg") -> "audio"
                lower.endsWith(".apk") -> "apk"
                lower.endsWith(".zip") || lower.endsWith(".rar") || lower.endsWith(".7z") ||
                lower.endsWith(".tar") || lower.endsWith(".gz") -> "archive"
                lower.endsWith(".txt") || lower.endsWith(".json") || lower.endsWith(".log") ||
                lower.endsWith(".md") || lower.endsWith(".xml") || lower.endsWith(".csv") -> "text"
                lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx") ||
                lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".ppt") ||
                lower.endsWith(".pptx") -> "document"
                else -> "other"
            }
        }
    }
}
