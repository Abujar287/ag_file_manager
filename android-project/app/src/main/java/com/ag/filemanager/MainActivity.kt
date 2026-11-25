package com.ag.filemanager

import android.Manifest
import android.app.Activity
import android.app.DownloadManager
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.pdf.PdfRenderer
import android.media.ExifInterface
import android.media.ThumbnailUtils
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.ParcelFileDescriptor
import android.provider.MediaStore
import android.provider.Settings
import android.util.Base64
import android.util.Size
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
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.ArrayDeque
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

class MainActivity : Activity() {

    private lateinit var updateManager: UpdateManager
    private var webView: WebView? = null
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var lastPermissionState: Boolean = false
    private val ioExecutor = Executors.newFixedThreadPool(3)

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

    override fun onDestroy() {
        ioExecutor.shutdownNow()
        super.onDestroy()
    }

    private fun setupWebView() {
        val wv = WebView(this)
        webView = wv
        wv.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)
        wv.overScrollMode = android.view.View.OVER_SCROLL_NEVER
        wv.scrollBarStyle = android.view.View.SCROLLBARS_INSIDE_OVERLAY
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
        wv.setDownloadListener { url, _, contentDisposition, mimeType, _ ->
            try {
                val fileName = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType)
                AndroidBridge().downloadWithDownloadManager(url, fileName, fileName)
            } catch (_: Exception) {
                AndroidBridge().openUrlInBrowser(url)
            }
        }

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

    private fun dispatchWebEvent(eventName: String, detailJson: JSONObject) {
        val safePayload = detailJson.toString()
            .replace("\u2028", "\\u2028")
            .replace("\u2029", "\\u2029")
        val js = "window.dispatchEvent(new CustomEvent('$eventName', { detail: $safePayload }));"
        webView?.post {
            webView?.evaluateJavascript(js, null)
        }
    }

    private fun notifyWebPermissionResult(granted: Boolean) {
        dispatchWebEvent("android_permission_result", JSONObject().apply {
            put("granted", granted)
        })
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        when (requestCode) {
            REQ_INSTALL_PACKAGES -> {
                updateManager.resumePendingInstallIfGranted()
                val canInstall = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    packageManager.canRequestPackageInstalls()
                } else {
                    true
                }
                dispatchWebEvent("android_install_permission_result", JSONObject().apply {
                    put("granted", canInstall)
                })
            }
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
        private val downloadFileNames = ConcurrentHashMap<Long, String>()
        @Volatile
        private var lastSuccessfulDownloadId: Long = -1L
        @Volatile
        private var lastDownloadedFileName: String = ""

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

        private fun mapParentId(
            dir: File,
            internalRoot: String = getInternalRootCanonical(),
            sdRoot: String? = getSdRootCanonical()
        ): String {
            val canonical = try {
                dir.canonicalPath
            } catch (_: Exception) {
                dir.absolutePath
            }
            if (canonical == internalRoot) return "internal_root"
            if (sdRoot != null && canonical == sdRoot) return "sd_root"
            return "device_$canonical"
        }

        private fun thumbCacheKey(file: File): String {
            val raw = "${file.absolutePath}_${file.lastModified()}_${file.length()}"
            return try {
                val digest = MessageDigest.getInstance("SHA-256").digest(raw.toByteArray())
                digest.take(12).joinToString("") { "%02x".format(it) }
            } catch (_: Exception) {
                raw.hashCode().toString()
            }
        }

        private fun getOrGenerateThumbUri(
            file: File,
            isVideo: Boolean,
            allowCreate: Boolean = true
        ): String? {
            return try {
                val lower = file.name.lowercase()
                if (!isVideo && (lower.endsWith(".gif") || lower.endsWith(".svg"))) {
                    return Uri.fromFile(file).toString()
                }
                if (!isVideo && file.length() in 1L..24_576L) {
                    return Uri.fromFile(file).toString()
                }

                val thumbDir = File(cacheDir, "thumbs")
                if (!thumbDir.exists()) thumbDir.mkdirs()
                val thumbFile = File(thumbDir, "${thumbCacheKey(file)}.jpg")
                if (thumbFile.exists() && thumbFile.length() > 0L) {
                    return Uri.fromFile(thumbFile).toString()
                }
                if (!allowCreate) {
                    return if (isVideo) null else Uri.fromFile(file).toString()
                }

                val maxDim = 160
                val rawBmp: Bitmap? = if (isVideo) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ThumbnailUtils.createVideoThumbnail(file, Size(maxDim, maxDim), null)
                    } else {
                        @Suppress("DEPRECATION")
                        ThumbnailUtils.createVideoThumbnail(
                            file.absolutePath,
                            MediaStore.Video.Thumbnails.MINI_KIND
                        )
                    }
                } else {
                    val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    BitmapFactory.decodeFile(file.absolutePath, opts)
                    val w = opts.outWidth
                    val h = opts.outHeight
                    if (w <= 0 || h <= 0) {
                        null
                    } else {
                        var sample = 1
                        while (w / (sample * 2) >= maxDim && h / (sample * 2) >= maxDim) {
                            sample *= 2
                        }
                        val decOpts = BitmapFactory.Options().apply {
                            inSampleSize = sample
                            inPreferredConfig = Bitmap.Config.RGB_565
                        }
                        val decoded = BitmapFactory.decodeFile(file.absolutePath, decOpts)
                        if (decoded != null) {
                            val orientation = try {
                                ExifInterface(file.absolutePath).getAttributeInt(
                                    ExifInterface.TAG_ORIENTATION,
                                    ExifInterface.ORIENTATION_NORMAL
                                )
                            } catch (_: Exception) {
                                ExifInterface.ORIENTATION_NORMAL
                            }
                            val deg = when (orientation) {
                                ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                                ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                                ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                                else -> 0f
                            }
                            if (deg != 0f) {
                                val m = Matrix().apply { postRotate(deg) }
                                val rotated = Bitmap.createBitmap(
                                    decoded, 0, 0, decoded.width, decoded.height, m, true
                                )
                                if (rotated !== decoded) decoded.recycle()
                                rotated
                            } else {
                                decoded
                            }
                        } else {
                            null
                        }
                    }
                }

                if (rawBmp == null) {
                    return if (isVideo) null else Uri.fromFile(file).toString()
                }

                val scale = maxDim.toFloat() / maxOf(rawBmp.width, rawBmp.height).coerceAtLeast(1)
                val finalBmp = if (scale < 1f) {
                    val sw = (rawBmp.width * scale).toInt().coerceAtLeast(1)
                    val sh = (rawBmp.height * scale).toInt().coerceAtLeast(1)
                    val scaled = Bitmap.createScaledBitmap(rawBmp, sw, sh, true)
                    if (scaled !== rawBmp) rawBmp.recycle()
                    scaled
                } else {
                    rawBmp
                }

                FileOutputStream(thumbFile).use { fos ->
                    finalBmp.compress(Bitmap.CompressFormat.JPEG, 78, fos)
                }
                finalBmp.recycle()

                if (thumbFile.exists() && thumbFile.length() > 0L) {
                    Uri.fromFile(thumbFile).toString()
                } else {
                    if (isVideo) null else Uri.fromFile(file).toString()
                }
            } catch (_: Exception) {
                if (isVideo) null else Uri.fromFile(file).toString()
            }
        }

        private fun fileToJson(
            file: File,
            forcedParentId: String? = null,
            internalRoot: String = getInternalRootCanonical(),
            sdRoot: String? = getSdRootCanonical(),
            allowThumbCreate: Boolean = true
        ): JSONObject {
            val canonical = file.absolutePath
            val isDir = file.isDirectory
            val kind = if (isDir) "folder" else inferKind(file.name)
            val parentId = forcedParentId ?: file.parentFile?.let {
                mapParentId(it, internalRoot, sdRoot)
            } ?: "internal_root"

            return JSONObject().apply {
                put("id", "device_$canonical")
                put("name", file.name)
                put("parentId", parentId)
                put("kind", kind)
                put("size", if (isDir) 0L else file.length())
                put("modifiedAt", file.lastModified())
                put("hidden", file.name.startsWith("."))
                put("realPath", canonical)
                if (!isDir) {
                    val lower = file.name.lowercase()
                    if (kind == "image" || kind == "video" || kind == "audio" || lower.endsWith(".pdf")) {
                        put("mediaUrl", Uri.fromFile(file).toString())
                    }
                    if (kind == "image" || kind == "video") {
                        getOrGenerateThumbUri(file, kind == "video", allowThumbCreate)?.let {
                            put("thumbnailUrl", it)
                        }
                    }
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

        private fun buildDirectoryJsonArray(path: String?): JSONArray {
            val targetDir = when {
                path.isNullOrEmpty() || path == "internal_root" -> Environment.getExternalStorageDirectory()
                path == "sd_root" -> StorageAnalyzer.getExternalSdCard(this@MainActivity)?.rootPath
                    ?: return JSONArray()
                else -> File(path)
            }

            if (!targetDir.exists() || !targetDir.isDirectory || !targetDir.canRead()) {
                return JSONArray()
            }

            val list = targetDir.listFiles() ?: return JSONArray()
            val internalRoot = getInternalRootCanonical()
            val sdRoot = getSdRootCanonical()
            val resolvedParentId = mapParentId(targetDir, internalRoot, sdRoot)
            val jsonArr = JSONArray()
            var newThumbsBudget = 20

            for (file in list) {
                val isDir = file.isDirectory
                val allowCreate = if (!isDir && newThumbsBudget > 0) {
                    val k = inferKind(file.name)
                    if (k == "image" || k == "video") {
                        newThumbsBudget--
                        true
                    } else {
                        false
                    }
                } else {
                    false
                }
                jsonArr.put(
                    fileToJson(
                        file = file,
                        forcedParentId = resolvedParentId,
                        internalRoot = internalRoot,
                        sdRoot = sdRoot,
                        allowThumbCreate = allowCreate
                    )
                )
            }
            return jsonArr
        }

        @JavascriptInterface
        fun listDirectory(path: String?): String {
            return try {
                buildDirectoryJsonArray(path).toString()
            } catch (_: Exception) {
                "[]"
            }
        }

        @JavascriptInterface
        fun listDirectoryAsync(requestId: String, path: String?) {
            ioExecutor.execute {
                val items = try {
                    buildDirectoryJsonArray(path)
                } catch (_: Exception) {
                    JSONArray()
                }
                dispatchWebEvent("android_dir_result", JSONObject().apply {
                    put("requestId", requestId)
                    put("items", items)
                })
            }
        }

        private fun buildCategoriesJsonArray(): JSONArray {
            val roots = mutableListOf(Environment.getExternalStorageDirectory())
            StorageAnalyzer.getExternalSdCard(this@MainActivity)?.rootPath?.let { roots.add(it) }

            val internalRoot = getInternalRootCanonical()
            val sdRoot = getSdRootCanonical()
            val jsonArr = JSONArray()
            val queue = ArrayDeque<File>()
            for (r in roots) {
                if (r.exists() && r.canRead()) queue.add(r)
            }

            var scannedCount = 0
            val maxEntries = 3500
            var newThumbsBudget = 20

            while (queue.isNotEmpty() && scannedCount < maxEntries) {
                val dir = queue.removeFirst()
                val children = dir.listFiles() ?: continue
                val dirCanonical = try {
                    dir.canonicalPath
                } catch (_: Exception) {
                    dir.absolutePath
                }
                val resolvedParentId = mapParentId(dir, internalRoot, sdRoot)
                for (child in children) {
                    val name = child.name
                    if (child.isDirectory) {
                        // Skip restricted Android/data & Android/obb subtree for speed and OS compliance
                        if (name == "Android" && (dirCanonical == internalRoot || dirCanonical == sdRoot)) {
                            continue
                        }
                        if (!name.startsWith(".")) {
                            queue.addLast(child)
                        }
                        jsonArr.put(
                            fileToJson(
                                file = child,
                                forcedParentId = resolvedParentId,
                                internalRoot = internalRoot,
                                sdRoot = sdRoot,
                                allowThumbCreate = false
                            )
                        )
                    } else {
                        val kind = inferKind(name)
                        val allowNewThumb = (kind == "image" || kind == "video") && newThumbsBudget > 0
                        if (allowNewThumb) newThumbsBudget--
                        jsonArr.put(
                            fileToJson(
                                file = child,
                                forcedParentId = resolvedParentId,
                                internalRoot = internalRoot,
                                sdRoot = sdRoot,
                                allowThumbCreate = allowNewThumb
                            )
                        )
                    }
                    scannedCount++
                    if (scannedCount >= maxEntries) break
                }
            }
            return jsonArr
        }

        @JavascriptInterface
        fun scanAllCategories(): String {
            return try {
                buildCategoriesJsonArray().toString()
            } catch (_: Exception) {
                "[]"
            }
        }

        @JavascriptInterface
        fun scanAllCategoriesAsync(requestId: String) {
            ioExecutor.execute {
                val items = try {
                    buildCategoriesJsonArray()
                } catch (_: Exception) {
                    JSONArray()
                }
                dispatchWebEvent("android_categories_result", JSONObject().apply {
                    put("requestId", requestId)
                    put("items", items)
                })
            }
        }

        private fun getOrSaveAppIconUri(packageName: String, appInfo: ApplicationInfo): String? {
            return try {
                val iconDir = File(cacheDir, "app_icons")
                if (!iconDir.exists()) iconDir.mkdirs()
                val iconFile = File(iconDir, "${packageName.replace('/', '_')}.png")
                if (iconFile.exists() && iconFile.length() > 0L) {
                    return Uri.fromFile(iconFile).toString()
                }
                val drawable = packageManager.getApplicationIcon(appInfo)
                val size = 96
                val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(bmp)
                drawable.setBounds(0, 0, size, size)
                drawable.draw(canvas)
                FileOutputStream(iconFile).use { fos ->
                    bmp.compress(Bitmap.CompressFormat.PNG, 90, fos)
                }
                bmp.recycle()
                if (iconFile.exists() && iconFile.length() > 0L) Uri.fromFile(iconFile).toString() else null
            } catch (_: Exception) {
                null
            }
        }

        private fun buildInstalledAppsJsonArray(): JSONArray {
            val arr = JSONArray()
            val pm = packageManager
            val packages = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.getInstalledPackages(PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                pm.getInstalledPackages(0)
            }

            val items = mutableListOf<Pair<String, JSONObject>>()
            for (pkg in packages) {
                val appInfo = pkg.applicationInfo ?: continue
                val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
                val launchable = pm.getLaunchIntentForPackage(pkg.packageName) != null
                // Include all user-installed apps plus launchable system apps
                if (isSystem && !launchable) continue

                val label = try {
                    pm.getApplicationLabel(appInfo).toString().ifBlank { pkg.packageName }
                } catch (_: Exception) {
                    pkg.packageName
                }
                val apkFile = appInfo.sourceDir?.let { File(it) }
                val apkSize = if (apkFile != null && apkFile.exists()) apkFile.length() else 0L
                val iconUri = getOrSaveAppIconUri(pkg.packageName, appInfo)

                val obj = JSONObject().apply {
                    put("packageName", pkg.packageName)
                    put("name", label)
                    put("versionName", pkg.versionName ?: "")
                    put("size", apkSize)
                    put("modifiedAt", pkg.lastUpdateTime)
                    put("apkPath", appInfo.sourceDir ?: "")
                    if (iconUri != null) put("iconUrl", iconUri)
                    put("isSystemApp", isSystem)
                }
                items.add(label.lowercase() to obj)
            }
            items.sortBy { it.first }
            for ((_, obj) in items) arr.put(obj)
            return arr
        }

        @JavascriptInterface
        fun getInstalledApps(): String {
            return try {
                buildInstalledAppsJsonArray().toString()
            } catch (_: Exception) {
                "[]"
            }
        }

        @JavascriptInterface
        fun getInstalledAppsAsync(requestId: String) {
            ioExecutor.execute {
                val apps = try {
                    buildInstalledAppsJsonArray()
                } catch (_: Exception) {
                    JSONArray()
                }
                dispatchWebEvent("android_installed_apps_result", JSONObject().apply {
                    put("requestId", requestId)
                    put("apps", apps)
                })
            }
        }

        @JavascriptInterface
        fun launchApp(packageName: String): Boolean {
            return try {
                val intent = packageManager.getLaunchIntentForPackage(packageName) ?: return false
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                runOnUiThread {
                    try {
                        startActivity(intent)
                    } catch (_: Exception) {
                    }
                }
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun openAppDetails(packageName: String): Boolean {
            return try {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:$packageName")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                runOnUiThread {
                    try {
                        startActivity(intent)
                    } catch (_: Exception) {
                    }
                }
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun uninstallApp(packageName: String): Boolean {
            return try {
                val intent = Intent(Intent.ACTION_DELETE, Uri.parse("package:$packageName")).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                runOnUiThread {
                    try {
                        startActivity(intent)
                    } catch (_: Exception) {
                    }
                }
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun calculatePropertiesAsync(requestId: String, pathsJson: String) {
            ioExecutor.execute {
                var totalBytes = 0L
                var fileCount = 0
                var folderCount = 0
                try {
                    val arr = JSONArray(pathsJson)
                    val visited = HashSet<String>()
                    val stack = ArrayDeque<File>()
                    for (i in 0 until arr.length()) {
                        val f = File(arr.getString(i))
                        if (f.exists()) stack.add(f)
                    }
                    while (stack.isNotEmpty()) {
                        val curr = stack.removeLast()
                        val canon = try {
                            curr.canonicalPath
                        } catch (_: Exception) {
                            curr.absolutePath
                        }
                        if (!visited.add(canon)) continue
                        if (curr.isDirectory) {
                            folderCount++
                            val children = curr.listFiles()
                            if (children != null) {
                                for (child in children) {
                                    stack.addLast(child)
                                }
                            }
                        } else if (curr.isFile) {
                            fileCount++
                            totalBytes += curr.length()
                        }
                    }
                } catch (_: Exception) {
                }

                dispatchWebEvent("android_properties_result", JSONObject().apply {
                    put("requestId", requestId)
                    put("totalBytes", totalBytes)
                    put("fileCount", fileCount)
                    put("folderCount", folderCount)
                })
            }
        }

        @JavascriptInterface
        fun getPdfPageCount(path: String): Int {
            return try {
                val file = File(path)
                if (!file.exists() || !file.isFile) return 0
                ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { pfd ->
                    PdfRenderer(pfd).use { renderer ->
                        renderer.pageCount
                    }
                }
            } catch (_: Exception) {
                0
            }
        }

        @JavascriptInterface
        fun renderPdfPageAsync(requestId: String, path: String, pageIndex: Int) {
            ioExecutor.execute {
                var dataUrl = ""
                try {
                    val file = File(path)
                    if (file.exists() && file.isFile) {
                        ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { pfd ->
                            PdfRenderer(pfd).use { renderer ->
                                if (pageIndex in 0 until renderer.pageCount) {
                                    renderer.openPage(pageIndex).use { page ->
                                        val targetWidth = 1200
                                        val scale = targetWidth.toFloat() / page.width.coerceAtLeast(1)
                                        val bmpW = targetWidth
                                        val bmpH = (page.height * scale).toInt().coerceAtLeast(1)
                                        val bitmap = Bitmap.createBitmap(bmpW, bmpH, Bitmap.Config.ARGB_8888)
                                        val canvas = Canvas(bitmap)
                                        canvas.drawColor(Color.WHITE)
                                        page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                                        val baos = ByteArrayOutputStream()
                                        bitmap.compress(Bitmap.CompressFormat.PNG, 90, baos)
                                        bitmap.recycle()
                                        val b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
                                        dataUrl = "data:image/png;base64,$b64"
                                    }
                                }
                            }
                        }
                    }
                } catch (_: Exception) {
                    dataUrl = ""
                }
                dispatchWebEvent("android_pdf_page_result", JSONObject().apply {
                    put("requestId", requestId)
                    put("dataUrl", dataUrl)
                })
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
                if (file.exists() && file.isFile && file.length() <= 1024 * 1024) {
                    file.readText()
                } else {
                    ""
                }
            } catch (_: Exception) {
                ""
            }
        }

        @JavascriptInterface
        fun readTextFileAsync(requestId: String, path: String) {
            ioExecutor.execute {
                val content = try {
                    val file = File(path)
                    if (!file.exists() || !file.isFile) {
                        ""
                    } else if (file.length() <= 1024 * 1024) {
                        file.readText()
                    } else {
                        val buffer = ByteArray(1024 * 1024)
                        file.inputStream().use { it.read(buffer) }
                        String(buffer) + "\n\n... (truncated at 1 MB for preview)"
                    }
                } catch (_: Exception) {
                    ""
                }
                dispatchWebEvent("android_text_result", JSONObject().apply {
                    put("requestId", requestId)
                    put("content", content)
                })
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
        fun openUrlInBrowser(url: String): Boolean {
            return try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                runOnUiThread {
                    try {
                        startActivity(intent)
                    } catch (_: Exception) {
                    }
                }
                true
            } catch (_: Exception) {
                false
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
                downloadFileNames[id] = fileName
                lastDownloadedFileName = fileName
                id.toString()
            } catch (_: Exception) {
                openUrlInBrowser(url)
                ""
            }
        }

        private fun resolveDownloadedApkFile(localUri: String?, expectedFileName: String?): File? {
            val candidates = mutableListOf<File>()
            if (!localUri.isNullOrBlank()) {
                if (localUri.startsWith("file://")) {
                    Uri.parse(localUri).path?.let { candidates.add(File(it)) }
                } else if (localUri.startsWith("content://")) {
                    try {
                        contentResolver.query(
                            Uri.parse(localUri),
                            arrayOf("_data"),
                            null,
                            null,
                            null
                        )?.use { c ->
                            if (c.moveToFirst()) {
                                val dataPath = c.getString(0)
                                if (!dataPath.isNullOrBlank()) candidates.add(File(dataPath))
                            }
                        }
                    } catch (_: Exception) {
                    }
                }
            }
            val publicDownloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (!expectedFileName.isNullOrBlank()) {
                candidates.add(File(publicDownloads, expectedFileName))
            }
            if (lastDownloadedFileName.isNotBlank()) {
                candidates.add(File(publicDownloads, lastDownloadedFileName))
            }
            return candidates.firstOrNull { it.exists() && it.isFile && it.length() > 0L }
        }

        private fun isValidApkFile(file: File, requireSelfPackage: Boolean = false): Boolean {
            if (!file.exists() || file.length() < 100_000L) return false
            val archiveInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageManager.getPackageArchiveInfo(
                    file.absolutePath,
                    PackageManager.PackageInfoFlags.of(0)
                )
            } else {
                @Suppress("DEPRECATION")
                packageManager.getPackageArchiveInfo(file.absolutePath, 0)
            }
            if (archiveInfo == null) return false
            return !requireSelfPackage || archiveInfo.packageName == BuildConfig.APPLICATION_ID
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

                        var statusStr = when (statusInt) {
                            DownloadManager.STATUS_PENDING -> "pending"
                            DownloadManager.STATUS_RUNNING -> "running"
                            DownloadManager.STATUS_PAUSED -> "paused"
                            DownloadManager.STATUS_SUCCESSFUL -> "successful"
                            DownloadManager.STATUS_FAILED -> "failed"
                            else -> "unknown"
                        }

                        var resolvedPath = ""
                        var errorReason = if (statusStr == "failed") "Download failed (code $reason)" else ""

                        if (statusStr == "successful") {
                            val expectedName = downloadFileNames[downloadId]
                            val resolvedFile = resolveDownloadedApkFile(localUri, expectedName)
                            if (resolvedFile != null) {
                                val enforceSelf = resolvedFile.name.startsWith("AG_File_Manager")
                                if (resolvedFile.name.lowercase().endsWith(".apk") && !isValidApkFile(resolvedFile, enforceSelf)) {
                                    statusStr = "failed"
                                    errorReason = "Downloaded file is missing or not a valid APK package."
                                    resolvedFile.delete()
                                } else {
                                    resolvedPath = resolvedFile.canonicalPath
                                    lastSuccessfulDownloadId = downloadId
                                }
                            } else {
                                val dmUri = dm.getUriForDownloadedFile(downloadId)
                                if (dmUri != null) {
                                    lastSuccessfulDownloadId = downloadId
                                    resolvedPath = expectedName?.let {
                                        File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), it).absolutePath
                                    } ?: ""
                                } else {
                                    statusStr = "failed"
                                    errorReason = "Downloaded APK not found in Download folder."
                                }
                            }
                        }

                        return JSONObject().apply {
                            put("status", statusStr)
                            put("downloadedBytes", downloaded)
                            put("totalBytes", total)
                            put("localPath", resolvedPath)
                            if (statusStr == "failed") {
                                put("reason", errorReason)
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
                val publicDownloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val requestedFile = if (localPath.isNotBlank()) File(localPath) else null
                val apkFile = listOfNotNull(
                    requestedFile,
                    requestedFile?.name?.let { File(publicDownloads, it) },
                    lastDownloadedFileName.takeIf { it.isNotBlank() }?.let { File(publicDownloads, it) }
                ).firstOrNull { it.exists() && it.isFile && it.length() > 0L }

                if (apkFile != null && !isValidApkFile(apkFile, requireSelfPackage = false)) {
                    return false
                }

                val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                val uri: Uri? = when {
                    apkFile != null -> FileProvider.getUriForFile(
                        this@MainActivity,
                        "${BuildConfig.APPLICATION_ID}.fileprovider",
                        apkFile
                    )
                    lastSuccessfulDownloadId > 0L -> dm.getUriForDownloadedFile(lastSuccessfulDownloadId)
                    else -> null
                }

                if (uri == null) return false

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
                    requestInstallPermission()
                    return false
                }

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
                lower.endsWith(".bmp") || lower.endsWith(".svg") -> "image"
                lower.endsWith(".mp4") || lower.endsWith(".mkv") || lower.endsWith(".mov") ||
                lower.endsWith(".avi") || lower.endsWith(".webm") || lower.endsWith(".3gp") -> "video"
                lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".flac") ||
                lower.endsWith(".m4a") || lower.endsWith(".aac") || lower.endsWith(".ogg") -> "audio"
                lower.endsWith(".apk") -> "apk"
                lower.endsWith(".zip") || lower.endsWith(".rar") || lower.endsWith(".7z") ||
                lower.endsWith(".tar") || lower.endsWith(".gz") -> "archive"
                lower.endsWith(".txt") || lower.endsWith(".json") || lower.endsWith(".log") ||
                lower.endsWith(".md") || lower.endsWith(".xml") || lower.endsWith(".csv") ||
                lower.endsWith(".kt") || lower.endsWith(".kts") || lower.endsWith(".js") ||
                lower.endsWith(".jsx") || lower.endsWith(".ts") || lower.endsWith(".tsx") ||
                lower.endsWith(".py") || lower.endsWith(".java") || lower.endsWith(".c") ||
                lower.endsWith(".cpp") || lower.endsWith(".h") || lower.endsWith(".hpp") ||
                lower.endsWith(".html") || lower.endsWith(".htm") || lower.endsWith(".css") ||
                lower.endsWith(".scss") || lower.endsWith(".sql") || lower.endsWith(".sh") ||
                lower.endsWith(".bash") || lower.endsWith(".gradle") || lower.endsWith(".properties") ||
                lower.endsWith(".ini") || lower.endsWith(".conf") || lower.endsWith(".cfg") ||
                lower.endsWith(".yml") || lower.endsWith(".yaml") -> "text"
                lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx") ||
                lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".ppt") ||
                lower.endsWith(".pptx") -> "document"
                else -> "other"
            }
        }
    }
}
