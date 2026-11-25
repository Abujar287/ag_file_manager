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
        versionCode = (project.findProperty("VERSION_CODE") as? String)?.toIntOrNull() ?: 7
        versionName = (project.findProperty("VERSION_NAME") as? String) ?: "1.2.4"

        // Strip all unused language packs to keep APK under ~1.8 MB
        resourceConfigurations += listOf("en")
    }

    signingConfigs {
        create("release") {
            val storePath = System.getenv("KEYSTORE_FILE")
                ?: keystoreProperties.getProperty("storeFile")
                ?: "release-keystore.jks"
            val storeFileObj = file(storePath)
            if (storeFileObj.exists()) {
                storeFile = storeFileObj
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                    ?: keystoreProperties.getProperty("storePassword")
                keyAlias = System.getenv("KEY_ALIAS")
                    ?: keystoreProperties.getProperty("keyAlias")
                keyPassword = System.getenv("KEY_PASSWORD")
                    ?: keystoreProperties.getProperty("keyPassword")
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
            signingConfig = if (releaseSigning.storeFile?.exists() == true) {
                releaseSigning
            } else {
                signingConfigs.getByName("debug")
            }
        }
        debug {
            val releaseSigning = signingConfigs.getByName("release")
            if (releaseSigning.storeFile?.exists() == true) {
                signingConfig = releaseSigning
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
