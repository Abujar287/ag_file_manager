package com.ag.filemanager

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import com.ag.filemanager.storage.StorageAnalyzer
import com.ag.filemanager.update.UpdateManager

class MainActivity : Activity() {

    private lateinit var updateManager: UpdateManager

    companion object {
        private const val REQ_INSTALL_PACKAGES = 1001
        private const val REQ_WRITE_STORAGE = 1002
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        actionBar?.title = getString(R.string.app_name)

        updateManager = UpdateManager(
            activity = this,
            manifestUrl = "https://releases.agfilemanager.app/version.json",
            onRequestInstallPermission = { intent ->
                @Suppress("DEPRECATION")
                startActivityForResult(intent, REQ_INSTALL_PACKAGES)
            },
            onRequestStoragePermission = {
                requestPermissions(
                    arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE),
                    REQ_WRITE_STORAGE
                )
            }
        )

        // Internal & optional External SD Card discovery (null when unmounted)
        val internal = StorageAnalyzer.getInternalStorage()
        val externalSd = StorageAnalyzer.getExternalSdCard(this)
        renderStorageOverview(internal, externalSd)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_INSTALL_PACKAGES) {
            updateManager.resumePendingInstallIfGranted()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_WRITE_STORAGE) {
            val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            updateManager.onStoragePermissionResult(granted)
        }
    }

    private fun renderStorageOverview(
        internal: com.ag.filemanager.storage.StorageVolumeInfo,
        externalSd: com.ag.filemanager.storage.StorageVolumeInfo?
    ) {
        // Binds live device storage via Environment & StatFs (zero bundled sample data)
    }

    fun onCheckUpdateClicked() {
        updateManager.checkForUpdate()
    }
}
