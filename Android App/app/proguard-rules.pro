# ProGuard / R8 rules for FICA Congress Android.
#
# Goal: ship a release build with minify + shrink turned on so reverse-
# engineering the APK is harder and the binary is smaller, without
# breaking Gson / Retrofit reflection.
#
# If you see a ClassNotFoundException / "No converter factory found" crash
# in a release build that works in debug, it's almost always because R8
# stripped a model or Retrofit interface that reflection then couldn't
# find. Add the offending package to a -keep rule.

# ── Data models ──────────────────────────────────────────────────────
# Gson reflects on field names and types — strip those and JSON parsing
# silently fails. Keep every model class and its fields verbatim.
-keep class com.fica.events.data.models.** { *; }
-keepclassmembers class com.fica.events.data.models.** { *; }
-keep,allowshrinking class com.fica.events.data.models.** { *; }

# ── Retrofit interfaces ─────────────────────────────────────────────
# The Retrofit interface is queried by reflection at runtime; obfuscating
# the method names breaks the dynamic proxy.
-keep interface com.fica.events.data.api.ApiService { *; }
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes Exceptions

# ── Gson ─────────────────────────────────────────────────────────────
-keep class com.google.gson.** { *; }
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
# Keep TypeAdapter subclasses Gson reflects on.
-keep class * extends com.google.gson.TypeAdapter

# ── OkHttp / Retrofit internals ─────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }

# ── Kotlinx serialization (used for some DTOs) ──────────────────────
-keepclassmembers class ** {
    @kotlinx.serialization.Serializable <fields>;
}
-keep class kotlinx.serialization.** { *; }

# ── androidx.security (EncryptedSharedPreferences) ──────────────────
# Reflects on the Tink protobuf classes; keep them to avoid startup
# crashes in the Keystore-backed MasterKey flow.
-keep class com.google.crypto.tink.** { *; }
-keep class androidx.security.crypto.** { *; }
