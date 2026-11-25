import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        load(keystorePropertiesFile.inputStream())
    }
}

android {
    namespace = "com.ag.filemanager"
    compileSdk = 35

    defaultConfig {
        // CRITICAL: Never change applicationId across releases so in-place APK updates succeed.
        applicationId = "com.ag.filemanager"
        minSdk = 24
        targetSdk = 35
        versionCode = (project.findProperty("VERSION_CODE") as? String)?.toIntOrNull() ?: 13
        versionName = (project.findProperty("VERSION_NAME") as? String) ?: "1.2.10"

        // Strip all unused language packs to keep APK under ~1.8 MB
        resourceConfigurations += listOf("en")
    }

    signingConfigs {
        create("release") {
            val storePath = System.getenv("KEYSTORE_FILE")?.takeIf { it.isNotBlank() }
                ?: keystoreProperties.getProperty("storeFile")?.takeIf { it.isNotBlank() }
                ?: "release-keystore.jks"
            val storePass = System.getenv("KEYSTORE_PASSWORD")?.takeIf { it.isNotBlank() }
                ?: keystoreProperties.getProperty("storePassword")?.takeIf { it.isNotBlank() }
            val alias = System.getenv("KEY_ALIAS")?.takeIf { it.isNotBlank() }
                ?: keystoreProperties.getProperty("keyAlias")?.takeIf { it.isNotBlank() }
            val keyPass = System.getenv("KEY_PASSWORD")?.takeIf { it.isNotBlank() }
                ?: keystoreProperties.getProperty("keyPassword")?.takeIf { it.isNotBlank() }
            val storeFileObj = file(storePath)
            if (storeFileObj.exists() && storeFileObj.isFile && storePass != null && alias != null && keyPass != null) {
                storeFile = storeFileObj
                storePassword = storePass
                keyAlias = alias
                keyPassword = keyPass
            }
        }
        create("ciSigning") {
            val ciStore = file("ci-signing.p12")
            if (ciStore.exists() && ciStore.isFile) {
                storeFile = ciStore
                storeType = "PKCS12"
                storePassword = "agfilemanager"
                keyAlias = "agfilemanager"
                keyPassword = "agfilemanager"
            }
        }
    }

    buildTypes {
        release {
            // Full R8 code shrinking, obfuscation & resource stripping (~1.2 - 1.8 MB APK)
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            val releaseSigning = signingConfigs.getByName("release")
            val ciSigning = signingConfigs.getByName("ciSigning")
            signingConfig = when {
                releaseSigning.storeFile?.isFile == true -> releaseSigning
                ciSigning.storeFile?.isFile == true -> ciSigning
                else -> signingConfigs.getByName("debug")
            }
        }
        debug {
            val releaseSigning = signingConfigs.getByName("release")
            val ciSigning = signingConfigs.getByName("ciSigning")
            when {
                releaseSigning.storeFile?.isFile == true -> signingConfig = releaseSigning
                ciSigning.storeFile?.isFile == true -> signingConfig = ciSigning
            }
        }
    }

    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += listOf(
                "META-INF/**",
                "kotlin/**",
                "DebugProbesKt.bin",
                "**.properties"
            )
        }
    }
}

dependencies {
    // Minimal dependencies only (no Material/AppCompat/Coroutines bloat) for tiny <2 MB APK
    implementation("androidx.core:core-ktx:1.15.0")
}
