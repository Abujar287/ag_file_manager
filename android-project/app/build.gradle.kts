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
        create("ciSigning") {
            val ciStore = file("ci-signing.p12")
            if (ciStore.exists()) {
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
                releaseSigning.storeFile?.exists() == true -> releaseSigning
                ciSigning.storeFile?.exists() == true -> ciSigning
                else -> signingConfigs.getByName("debug")
            }
        }
        debug {
            val releaseSigning = signingConfigs.getByName("release")
            val ciSigning = signingConfigs.getByName("ciSigning")
            when {
                releaseSigning.storeFile?.exists() == true -> signingConfig = releaseSigning
                ciSigning.storeFile?.exists() == true -> signingConfig = ciSigning
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
