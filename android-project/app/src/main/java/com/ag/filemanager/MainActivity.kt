package com.ag.filemanager

import android.Manifest
import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.StatFs
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.ag.filemanager.storage.StorageAnalyzer
import com.ag.filemanager.update.UpdateManager
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class MainActivity : Activity() {

    private lateinit var updateManager: UpdateManager
    private var webView: WebView? = null
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    companion object {
        private const val REQ_INSTALL_PACKAGES = 1001
        private const val REQ_WRITE_STORAGE = 1002
        private const val REQ_MANAGE_STORAGE = 1003
        private const val REQ_MEDIA_PERMISSIONS = 1004
        private const val REQ_FILE_CHOOSER = 1005
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        actionBar?.title = getString(R.string.app_name)

        // Initialize update manager for background update checking and APK downloading
        updateManager = UpdateManager(
            activity = this,
            manifestUrl = "https://releases.agfilemanager.app/version.json",
            onRequestInstallPermission = { intent ->
                @Suppress("DEPRECATION")
                startActivityForResult(intent, REQ_INSTALL_PACKAGES)
            },
            onRequestStoragePermission = {
                requestMediaStoragePermissions()
            }
        )

        // Request storage permissions on startup so real device files and folders show
        checkAndRequestStoragePermissions()

        setupWebView()
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
            allowFileAccessFromFileURLs = true
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

    /**
     * Checks and requests storage and media permissions.
     */
    private fun checkAndRequestStoragePermissions() {
        if (!isStoragePermissionGranted()) {
            requestMediaStoragePermissions()
        }
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
                startActivityForResult(intent, REQ_MANAGE_STORAGE)
            } catch (_: Exception) {
                val fallbackIntent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                startActivityForResult(fallbackIntent, REQ_MANAGE_STORAGE)
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(
                    Manifest.permission.READ_MEDIA_IMAGES,
                    Manifest.permission.READ_MEDIA_VIDEO,
                    Manifest.permission.READ_MEDIA_AUDIO
                ),
                REQ_MEDIA_PERMISSIONS
            )
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

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        when (requestCode) {
            REQ_INSTALL_PACKAGES -> updateManager.resumePendingInstallIfGranted()
            REQ_MANAGE_STORAGE -> {
                val granted = isStoragePermissionGranted()
                webView?.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('android_permission_result', { detail: { granted: $granted } }));",
                    null
                )
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
        if (requestCode == REQ_WRITE_STORAGE) {
            updateManager.onStoragePermissionResult(granted)
        }
        webView?.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('android_permission_result', { detail: { granted: $granted } }));",
            null
        )
    }

    /**
     * Point 6: Hardware/gesture Back button routing to web app first,
     * so that on non-home it goes to Home, and on Home it shows the Exit confirmation dialog.
     */
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView != null) {
            webView?.evaluateJavascript(
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

    /**
     * JavaScript Bridge enabling real device storage querying,
     * file listing, download management, and graceful exit.
     */
    inner class AndroidBridge {

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
                    })
                    put("external", JSONObject().apply {
                        put("isMounted", external != null)
                        put("totalBytes", external?.totalBytes ?: 0L)
                        put("usedBytes", external?.usedBytes ?: 0L)
                        put("freeBytes", external?.freeBytes ?: 0L)
                        put("usedPercent", external?.usedPercent ?: 0)
                    })
                }
                root.toString()
            } catch (e: Exception) {
                "{}"
            }
        }

        @JavascriptInterface
        fun listDirectory(path: String?): String {
            return try {
                val targetDir = if (path.isNullOrEmpty()) {
                    Environment.getExternalStorageDirectory()
                } else {
                    File(path)
                }

                if (!targetDir.exists() || !targetDir.canRead()) {
                    return "[]"
                }

                val list = targetDir.listFiles() ?: return "[]"
                val jsonArr = JSONArray()

                for (file in list) {
                    val isDir = file.isDirectory
                    val node = JSONObject().apply {
                        put("id", "device_" + file.absolutePath.hashCode().toString())
                        put("name", file.name)
                        put("parentId", if (file.parentFile != null) "device_" + file.parentFile!!.absolutePath.hashCode().toString() else "internal_root")
                        put("kind", if (isDir) "folder" else inferKind(file.name))
                        put("size", if (isDir) 0L else file.length())
                        put("modifiedAt", file.lastModified())
                        put("hidden", file.name.startsWith("."))
                    }
                    jsonArr.put(node)
                }

                jsonArr.toString()
            } catch (e: Exception) {
                "[]"
            }
        }

        @JavascriptInterface
        fun downloadWithDownloadManager(url: String, fileName: String, title: String) {
            runOnUiThread {
                try {
                    val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                    val req = DownloadManager.Request(Uri.parse(url)).apply {
                        setTitle(title)
                        setDescription("Downloading package file")
                        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                        setMimeType("application/vnd.android.package-archive")
                        setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                        setAllowedOverMetered(true)
                        setAllowedOverRoaming(true)
                    }
                    dm.enqueue(req)
                } catch (e: Exception) {
                    // Fallback to opening browser intent
                    try {
                        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(browserIntent)
                    } catch (_: Exception) {}
                }
            }
        }

        @JavascriptInterface
        fun exitApp() {
            runOnUiThread {
                finishAffinity()
            }
        }

        private fun inferKind(name: String): String {
            val lower = name.lowercase()
            return when {
                lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") ||
                lower.endsWith(".webp") || lower.endsWith(".gif") || lower.endsWith(".svg") -> "image"
                lower.endsWith(".mp4") || lower.endsWith(".mkv") || lower.endsWith(".mov") ||
                lower.endsWith(".webm") || lower.endsWith(".3gp") -> "video"
                lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".flac") ||
                lower.endsWith(".m4a") || lower.endsWith(".aac") || lower.endsWith(".ogg") -> "audio"
                lower.endsWith(".apk") -> "apk"
                lower.endsWith(".zip") || lower.endsWith(".rar") || lower.endsWith(".7z") ||
                lower.endsWith(".tar") || lower.endsWith(".gz") -> "archive"
                lower.endsWith(".txt") || lower.endsWith(".json") || lower.endsWith(".log") ||
                lower.endsWith(".md") || lower.endsWith(".html") || lower.endsWith(".xml") -> "text"
                lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx") ||
                lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".ppt") -> "document"
                else -> "other"
            }
        }
    }
}
