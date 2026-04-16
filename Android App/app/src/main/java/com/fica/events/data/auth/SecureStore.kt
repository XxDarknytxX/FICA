package com.fica.events.data.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * AES-256-GCM-backed key/value store for the FICA auth token.
 *
 * We used to keep the JWT in plain [SharedPreferences], which means anyone
 * with access to the app's data directory (root / debuggable build / ADB
 * pull on a rooted device) could read it straight off disk. This wraps
 * [EncryptedSharedPreferences] so the values are encrypted at rest with a
 * key held in the Android Keystore — the keystore binding means a copy of
 * the .xml file without the keystore is useless.
 *
 * The API surface mirrors iOS `SecureStore` for symmetry between the two
 * clients.
 */
object SecureStore {

    // Separate preferences file so we can cleanly delete the whole thing
    // on logout if we ever need to.
    private const val FILE_NAME = "fica_secure_prefs"

    @Volatile
    private var prefs: SharedPreferences? = null

    private fun prefs(context: Context): SharedPreferences {
        prefs?.let { return it }
        synchronized(this) {
            prefs?.let { return it }
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            val p = EncryptedSharedPreferences.create(
                context,
                FILE_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
            )
            prefs = p
            return p
        }
    }

    fun set(context: Context, key: String, value: String?) {
        val editor = prefs(context).edit()
        if (value == null) editor.remove(key) else editor.putString(key, value)
        editor.apply()
    }

    fun get(context: Context, key: String): String? = prefs(context).getString(key, null)

    fun remove(context: Context, key: String) {
        prefs(context).edit().remove(key).apply()
    }
}
