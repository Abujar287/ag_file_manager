package com.ag.filemanager.storage

import android.content.Context
import android.os.Environment
import android.os.StatFs
import java.io.File

data class StorageVolumeInfo(
    val label: String,
    val rootPath: File,
    val totalBytes: Long,
    val freeBytes: Long
) {
    val usedBytes: Long get() = (totalBytes - freeBytes).coerceAtLeast(0L)
    val usedPercent: Int get() = if (totalBytes > 0L) ((usedBytes * 100L) / totalBytes).toInt() else 0
}

object StorageAnalyzer {

    fun getInternalStorage(): StorageVolumeInfo {
        val root = Environment.getExternalStorageDirectory()
        val stat = StatFs(root.path)
        return StorageVolumeInfo(
            label = "Internal Storage",
            rootPath = root,
            totalBytes = stat.totalBytes,
            freeBytes = stat.availableBytes
        )
    }

    /**
     * Returns null cleanly if no physical external SD card is inserted,
     * allowing UI to leave the SD card slot blank/hidden without errors.
     */
    fun getExternalSdCard(context: Context): StorageVolumeInfo? {
        val dirs = context.getExternalFilesDirs(null)
        if (dirs.size <= 1) return null

        val sdAppDir = dirs.drop(1).firstOrNull { dir ->
            dir != null && Environment.getExternalStorageState(dir) == Environment.MEDIA_MOUNTED
        } ?: return null

        val pathSegments = sdAppDir.absolutePath.split("/Android/").firstOrNull() ?: return null
        val sdRoot = File(pathSegments)
        if (!sdRoot.exists() || !sdRoot.canRead()) return null

        val stat = StatFs(sdRoot.path)
        return StorageVolumeInfo(
            label = "External Storage (SD Card)",
            rootPath = sdRoot,
            totalBytes = stat.totalBytes,
            freeBytes = stat.availableBytes
        )
    }

    fun findEmptyFolders(root: File): List<File> {
        val empty = mutableListOf<File>()
        root.walkTopDown()
            .filter { it.isDirectory && !it.name.startsWith(".") }
            .forEach { dir ->
                val children = dir.listFiles()
                if (children != null && children.isEmpty()) {
                    empty.add(dir)
                }
            }
        return empty
    }

    fun findLargeFiles(root: File, thresholdBytes: Long = 50L * 1024L * 1024L): List<File> {
        return root.walkTopDown()
            .filter { it.isFile && it.length() >= thresholdBytes }
            .sortedByDescending { it.length() }
            .toList()
    }
}
