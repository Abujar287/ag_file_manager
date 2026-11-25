package com.ag.filemanager.ui

import java.io.File

enum class BatchRenameMode {
    NEW_NAME_NUMBER,
    PREFIX_ORIGINAL
}

object BatchRenameEngine {
    /**
     * Generates new filenames supporting:
     * Mode 1: New Name + Number (e.g., Photo_1.jpg, Photo_2.jpg)
     * Mode 2: Prefix + Original Name (e.g., Trip_IMG_001.jpg)
     * Plus optional Extension Editor override.
     */
    fun computeRenamedTargets(
        files: List<File>,
        mode: BatchRenameMode,
        newNameInput: String,
        startNumber: Int,
        prefixInput: String,
        newExtension: String?
    ): List<Pair<File, File>> {
        val cleanExt = newExtension?.trim()?.trimStart('.')?.takeIf { it.isNotEmpty() }

        return files.mapIndexed { index, file ->
            val originalName = file.nameWithoutExtension
            val originalExt = file.extension
            val targetExt = if (file.isDirectory) "" else (cleanExt ?: originalExt)

            val baseName = when (mode) {
                BatchRenameMode.NEW_NAME_NUMBER -> {
                    val base = newNameInput.trim().ifEmpty { "File" }
                    "${base}_${startNumber + index}"
                }
                BatchRenameMode.PREFIX_ORIGINAL -> {
                    "${prefixInput.trim()}$originalName"
                }
            }

            val finalName = if (targetExt.isNotEmpty()) "$baseName.$targetExt" else baseName
            file to File(file.parentFile, finalName)
        }
    }
}
