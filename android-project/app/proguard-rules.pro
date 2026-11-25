-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep update manifest JSON models if reflection is added
-keepclassmembers class com.ag.filemanager.update.** { *; }
