# Proguard rules for Capacitor and MEDX
-keepattributes *Annotation*
-keepclassmembers class * {
    @org.webkit.JavascriptInterface <methods>;
}
-keep class com.getcapacitor.** { *; }
-keep class com.medx.app.** { *; }
