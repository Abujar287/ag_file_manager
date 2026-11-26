package com.ag.filemanager.update

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.app.DownloadManager
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.provider.Settings
import android.view.LayoutInflater
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.ag.filemanager.BuildConfig
import com.ag.filemanager.R
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

data class UpdateInfo(
    val versionCode: Int,
    val versionName: String,
    val apkUrl: String
)

class UpdateManager(
    private val activity: Activity,
    private val manifestUrl: String,
    private val onRequestInstallPermission: (Intent) -> Unit,
    private val onRequestStoragePermission: () -> Unit
) {
    private val ioExecutor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var pendingApkUri: Uri? = null
    private var pendingDownloadStart: (() -> Unit)? = null
    private var pollRunnable: Runnable? = null

    fun checkForUpdate() {
        if (!isNetworkAvailable()) {
            showSimpleError("No internet connection. Please check your network and try again.")
            return
        }

        ioExecutor.execute {
            val result = fetchUpdateManifest()
            mainHandler.post {
                result.onSuccess { info ->
                    if (info.versionCode > BuildConfig.VERSION_CODE ||
                        compareVer(info.versionName, BuildConfig.VERSION_NAME) > 0
                    ) {
                        showMinimalUpdateDialog(info)
                    } else {
                        AlertDialog.Builder(activity)
                            .setMessage(activity.getString(R.string.up_to_date))
                            .setPositiveButton("OK", null)
                            .show()
                    }
                }.onFailure { err ->
                    showSimpleError(err.message ?: "Unable to check for updates right now.")
                }
            }
        }
    }

    private fun showMinimalUpdateDialog(info: UpdateInfo) {
        val view = LayoutInflater.from(activity).inflate(R.layout.dialog_update_available, null)
        val currentVersionText = view.findViewById<TextView>(R.id.tvCurrentVersion)
        val newVersionText = view.findViewById<TextView>(R.id.tvNewVersion)
        val progressContainer = view.findViewById<View>(R.id.progressContainer)
        val progressBar = view.findViewById<ProgressBar>(R.id.downloadProgressBar)
        val progressStats = view.findViewById<TextView>(R.id.tvDownloadStats)
        val errorText = view.findViewById<TextView>(R.id.tvDownloadError)

        currentVersionText.text = "Current Version : AG File Manager ${BuildConfig.VERSION_NAME}"
        newVersionText.text = "New Version: AG File Manager ${info.versionName}"
        progressContainer.visibility = View.GONE
        errorText.visibility = View.GONE

        val dialog = AlertDialog.Builder(activity)
            .setTitle(R.string.update_title)
            .setView(view)
            .setCancelable(false)
            .setNegativeButton("Cancel") { d, _ ->
                stopPolling()
                d.dismiss()
            }
            .setPositiveButton("Download", null)
            .create()

        dialog.setOnShowListener {
            val downloadBtn = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            downloadBtn.setOnClickListener {
                // On Android <= 9 (API <= 28), DownloadManager.setDestinationInExternalPublicDir requires WRITE_EXTERNAL_STORAGE
                if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P &&
                    ContextCompat.checkSelfPermission(activity, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED
                ) {
                    pendingDownloadStart = {
                        downloadBtn.isEnabled = false
                        errorText.visibility = View.GONE
                        progressContainer.visibility = View.VISIBLE
                        startDownloadAndTrack(info, progressBar, progressStats, errorText, dialog)
                    }
                    onRequestStoragePermission()
                    return@setOnClickListener
                }

                downloadBtn.isEnabled = false
                errorText.visibility = View.GONE
                progressContainer.visibility = View.VISIBLE
                startDownloadAndTrack(info, progressBar, progressStats, errorText, dialog)
            }
        }

        dialog.show()
    }

    fun onStoragePermissionResult(granted: Boolean) {
        if (granted) {
            pendingDownloadStart?.invoke()
            pendingDownloadStart = null
        } else {
            showSimpleError("Storage permission is required to save APK to Download folder.")
        }
    }

    private fun startDownloadAndTrack(
        info: UpdateInfo,
        progressBar: ProgressBar,
        progressStats: TextView,
        errorText: TextView,
        dialog: AlertDialog
    ) {
        val fileName = "AG_File_Manager_v${info.versionName}.apk"
        removeExistingApkInPublicDownloads(fileName)

        val downloadManager = activity.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val request = DownloadManager.Request(Uri.parse(info.apkUrl))
            .setTitle("AG File Manager v${info.versionName}")
            .setDescription("Downloading update package")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
            .setMimeType("application/vnd.android.package-archive")
            // Saves directly into /storage/emulated/0/Download/<fileName>
            .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(true)

        val downloadId = try {
            downloadManager.enqueue(request)
        } catch (e: Exception) {
            errorText.text = "Download failed to start: ${e.localizedMessage}"
            errorText.visibility = View.VISIBLE
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).isEnabled = true
            return
        }

        stopPolling()
        val runner = object : Runnable {
            override fun run() {
                val query = DownloadManager.Query().setFilterById(downloadId)
                val cursor = downloadManager.query(query)
                var keepPolling = true

                cursor?.use { c ->
                    if (c.moveToFirst()) {
                        val status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
                        val downloaded = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
                        val total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))

                        if (total > 0L) {
                            val percent = ((downloaded * 100L) / total).toInt().coerceIn(0, 100)
                            val dlMb = downloaded / (1024.0 * 1024.0)
                            val totalMb = total / (1024.0 * 1024.0)
                            progressBar.isIndeterminate = false
                            progressBar.progress = percent
                            progressStats.text = String.format(
                                Locale.US,
                                "%d%% — %.1f MB / %.1f MB",
                                percent,
                                dlMb,
                                totalMb
                            )
                        } else {
                            progressBar.isIndeterminate = true
                            val dlMb = downloaded / (1024.0 * 1024.0)
                            progressStats.text = String.format(Locale.US, "%.1f MB downloaded", dlMb)
                        }

                        when (status) {
                            DownloadManager.STATUS_SUCCESSFUL -> {
                                keepPolling = false
                                val localUriStr = c.getString(c.getColumnIndexOrThrow(DownloadManager.COLUMN_LOCAL_URI))
                                dialog.dismiss()
                                resolveAndPromptInstall(downloadManager, downloadId, localUriStr, fileName)
                            }
                            DownloadManager.STATUS_FAILED -> {
                                keepPolling = false
                                val reason = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))
                                errorText.text = mapDownloadFailure(reason)
                                errorText.visibility = View.VISIBLE
                                dialog.getButton(AlertDialog.BUTTON_POSITIVE).isEnabled = true
                            }
                        }
                    }
                }

                if (keepPolling) {
                    mainHandler.postDelayed(this, 250L)
                }
            }
        }
        pollRunnable = runner
        mainHandler.post(runner)
    }

    private fun removeExistingApkInPublicDownloads(fileName: String) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val projection = arrayOf(MediaStore.Downloads._ID)
                val selection = "${MediaStore.Downloads.DISPLAY_NAME} = ?"
                activity.contentResolver.query(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    projection,
                    selection,
                    arrayOf(fileName),
                    null
                )?.use { cursor ->
                    while (cursor.moveToNext()) {
                        val id = cursor.getLong(0)
                        val uri = ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, id)
                        activity.contentResolver.delete(uri, null, null)
                    }
                }
            } else {
                val publicDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val existing = File(publicDir, fileName)
                if (existing.exists()) existing.delete()
            }
        } catch (_: Exception) {
            // Safe fallback if previous file is owned by another UID
        }
    }

    private fun resolveAndPromptInstall(
        downloadManager: DownloadManager,
        downloadId: Long,
        localUriStr: String?,
        fallbackFileName: String
    ) {
        val publicDownloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        val localPath = if (localUriStr?.startsWith("file://") == true) {
            Uri.parse(localUriStr).path
        } else {
            null
        }
        val apkFile = localPath?.let { File(it) }?.takeIf { it.exists() && it.length() > 0L }
            ?: File(publicDownloads, fallbackFileName).takeIf { it.exists() && it.length() > 0L }

        val contentUri: Uri? = when {
            apkFile != null -> FileProvider.getUriForFile(
                activity,
                "${BuildConfig.APPLICATION_ID}.fileprovider",
                apkFile
            )
            else -> downloadManager.getUriForDownloadedFile(downloadId)
        }

        if (contentUri == null) {
            showSimpleError("Downloaded APK could not be located in Download folder.")
            return
        }

        if (apkFile != null) {
            @Suppress("DEPRECATION")
            val sigFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageManager.GET_SIGNING_CERTIFICATES or PackageManager.GET_SIGNATURES
            } else {
                PackageManager.GET_SIGNATURES
            }
            val archiveInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                activity.packageManager.getPackageArchiveInfo(
                    apkFile.absolutePath,
                    PackageManager.PackageInfoFlags.of(sigFlags.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                activity.packageManager.getPackageArchiveInfo(apkFile.absolutePath, sigFlags)
            }

            if (archiveInfo == null || archiveInfo.packageName != BuildConfig.APPLICATION_ID) {
                showSimpleError("Downloaded package is corrupted or mismatched. Please retry.")
                return
            }

            val installedInfo = try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    activity.packageManager.getPackageInfo(
                        activity.packageName,
                        PackageManager.PackageInfoFlags.of(sigFlags.toLong())
                    )
                } else {
                    @Suppress("DEPRECATION")
                    activity.packageManager.getPackageInfo(activity.packageName, sigFlags)
                }
            } catch (_: Exception) {
                null
            }

            val installedSigs = extractSha256Signatures(installedInfo)
            val archiveSigs = extractSha256Signatures(archiveInfo)
            if (installedSigs.isNotEmpty() && archiveSigs.isNotEmpty() && installedSigs.intersect(archiveSigs).isEmpty()) {
                AlertDialog.Builder(activity)
                    .setTitle("Reinstall Required Once")
                    .setMessage("The installed version uses an older temporary signing key. Uninstall the old app once, then install ${apkFile.name} from Download — future updates will work cleanly with the Update button.")
                    .setNegativeButton("Cancel", null)
                    .setPositiveButton("Uninstall Old App") { _, _ ->
                        try {
                            val uninstallIntent = Intent(
                                Intent.ACTION_DELETE,
                                Uri.parse("package:${activity.packageName}")
                            )
                            activity.startActivity(uninstallIntent)
                        } catch (_: Exception) {
                        }
                    }
                    .show()
                return
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !activity.packageManager.canRequestPackageInstalls()) {
            pendingApkUri = contentUri
            AlertDialog.Builder(activity)
                .setTitle("Install Permission Required")
                .setMessage("Allow AG File Manager to install updates from downloaded APK files.")
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Allow") { _, _ ->
                    val intent = Intent(
                        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:${activity.packageName}")
                    )
                    onRequestInstallPermission(intent)
                }
                .show()
            return
        }

        launchApkInstaller(contentUri)
    }

    private fun extractSha256Signatures(pkgInfo: android.content.pm.PackageInfo?): Set<String> {
        if (pkgInfo == null) return emptySet()
        return try {
            val sigs = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val si = pkgInfo.signingInfo
                val modern = if (si != null) {
                    if (si.hasMultipleSigners()) si.apkContentsSigners else si.signingCertificateHistory
                } else null
                if (modern != null && modern.isNotEmpty()) modern else {
                    @Suppress("DEPRECATION")
                    pkgInfo.signatures
                }
            } else {
                @Suppress("DEPRECATION")
                pkgInfo.signatures
            } ?: return emptySet()
            val md = java.security.MessageDigest.getInstance("SHA-256")
            sigs.map { sig ->
                md.digest(sig.toByteArray()).joinToString("") { "%02x".format(it) }
            }.toSet()
        } catch (_: Exception) {
            emptySet()
        }
    }

    fun resumePendingInstallIfGranted() {
        val uri = pendingApkUri ?: return
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || activity.packageManager.canRequestPackageInstalls()) {
            pendingApkUri = null
            launchApkInstaller(uri)
        }
    }

    private fun launchApkInstaller(apkUri: Uri) {
        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(apkUri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        try {
            activity.startActivity(installIntent)
        } catch (e: Exception) {
            showSimpleError("Unable to open package installer: ${e.localizedMessage}")
        }
    }

    private fun stopPolling() {
        pollRunnable?.let { mainHandler.removeCallbacks(it) }
        pollRunnable = null
    }

    private fun compareVer(a: String, b: String): Int {
        if (b.isBlank()) return if (a.isNotBlank()) 1 else 0
        val pa = a.removePrefix("v").removePrefix("V").split(".").map { it.toIntOrNull() ?: 0 }
        val pb = b.removePrefix("v").removePrefix("V").split(".").map { it.toIntOrNull() ?: 0 }
        val len = maxOf(pa.size, pb.size, 3)
        for (i in 0 until len) {
            val diff = (pa.getOrNull(i) ?: 0) - (pb.getOrNull(i) ?: 0)
            if (diff != 0) return diff
        }
        return 0
    }

    private fun fetchUpdateManifest(): Result<UpdateInfo> {
        val candidates = listOf(
            manifestUrl,
            "https://raw.githubusercontent.com/Abujar287/ag_file_manager/main/version.json"
        ).distinct()

        val lock = Any()
        var lastError: Exception? = null
        var best: UpdateInfo? = null
        val latch = CountDownLatch(candidates.size)

        for (urlStr in candidates) {
            Thread {
                var conn: HttpURLConnection? = null
                try {
                    conn = (URL(urlStr).openConnection() as HttpURLConnection).apply {
                        instanceFollowRedirects = true
                        connectTimeout = 2800
                        readTimeout = 2800
                        requestMethod = "GET"
                        setRequestProperty("User-Agent", "AGFileManager/${BuildConfig.VERSION_NAME}")
                        setRequestProperty("Cache-Control", "no-cache")
                    }
                    if (conn.responseCode in 200..299) {
                        val body = conn.inputStream.bufferedReader().use { it.readText() }
                        val json = JSONObject(body)
                        val info = UpdateInfo(
                            versionCode = json.getInt("versionCode"),
                            versionName = json.getString("versionName"),
                            apkUrl = json.getString("apkUrl")
                        )
                        synchronized(lock) {
                            val currentBest = best
                            val verCmp = if (currentBest == null) 1 else compareVer(info.versionName, currentBest.versionName)
                            if (currentBest == null || verCmp > 0 || (verCmp == 0 && info.versionCode > currentBest.versionCode)) {
                                best = info
                            }
                        }
                    } else {
                        synchronized(lock) {
                            lastError = IllegalStateException("Update server returned HTTP ${conn.responseCode}")
                        }
                    }
                } catch (e: Exception) {
                    synchronized(lock) {
                        lastError = e
                    }
                } finally {
                    conn?.disconnect()
                    latch.countDown()
                }
            }.start()
        }

        try {
            latch.await(3400, TimeUnit.MILLISECONDS)
        } catch (_: InterruptedException) {
        }

        return synchronized(lock) {
            best?.let { Result.success(it) }
                ?: Result.failure(lastError ?: IllegalStateException("Unable to fetch update manifest"))
        }
    }

    private fun mapDownloadFailure(reason: Int): String = when (reason) {
        DownloadManager.ERROR_INSUFFICIENT_SPACE -> "Not enough storage space in Download folder."
        DownloadManager.ERROR_CANNOT_RESUME,
        DownloadManager.ERROR_HTTP_DATA_ERROR -> "Network interrupted while downloading APK."
        DownloadManager.ERROR_FILE_ERROR -> "Cannot write APK to /storage/emulated/0/Download/."
        else -> "Download failed (code $reason). Please try again."
    }

    private fun isNetworkAvailable(): Boolean {
        val cm = activity.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun showSimpleError(message: String) {
        AlertDialog.Builder(activity)
            .setTitle("Update Error")
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show()
    }
}
