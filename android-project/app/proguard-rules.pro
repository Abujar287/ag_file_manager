-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes JavascriptInterface,Annotation

# Preserve WebView JavascriptInterface bridge methods under R8 full shrinking
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.ag.filemanager.MainActivity$AndroidBridge { *; }
-keepclassmembers class com.ag.filemanager.update.** { *; }
-keep class androidx.core.content.FileProvider { *; }
