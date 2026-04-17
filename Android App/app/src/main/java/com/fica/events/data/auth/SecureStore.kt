package com.fica.events.data.auth

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * AES-256-GCM-backed key/value store for the FICA auth token — with a
 * safe plaintext fallback.
 *
 * Goal: keep the JWT out of `/data/data/com.fica.events/shared_prefs` as
 * plaintext on production builds. `EncryptedSharedPreferences` gives us
 * that for free by binding the file's AES key to the Android Keystore.
 *
 * Reality: the `androidx.security:security-crypto:1.1.0-alpha06` library
 * can throw at init time on some devices — notably certain Samsung /
 * One UI keystore states, corrupted MasterKey entries from a previous
 * install, or when the device hasn't been unlocked since boot.
 * A crash in `AuthManager.init()` kills the whole app at launch.
 *
 * So we try EncryptedSharedPreferences first; if anything throws we
 * log it and drop back to a regular `SharedPreferences` file. The token
 * still works, it's just no longer encrypted at rest on that device
 * (a known trade-off, and the same approach Google uses in their own
 * security samples).
 *
 * API surface mirrors iOS `SecureStore` for symmetry.
 */
object SecureStore {

    private const val TAG = "FICASecureStore"
    // Separate preferences file so we can cleanly delete the whole thing
    // on logout if we ever need to.
    private const val FILE_NAME = "fica_secure_prefs"
    private const val FALLBACK_FILE_NAME = "fica_secure_prefs_fallback"

    @Volatile
    private var prefs: SharedPreferences? = null
    @Volatile
    private var usingFallback = false

    private fun prefs(context: Context): SharedPreferences {
        prefs?.let { return it }
        synchronized(this) {
            prefs?.let { return it }
            val resolved = createEncrypted(context) ?: createFallback(context)
            prefs = resolved
            return resolved
        }
    }

    /** Happy path — returns null if EncryptedSharedPreferences can't init. */
    private fun createEncrypted(context: Context): SharedPreferences? {
        return try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                FILE_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
            )
        } catch (t: Throwable) {
            Log.w(TAG, "EncryptedSharedPreferences unavailable, using plaintext fallback", t)
            // Nuke any half-initialised encrypted file so the next app
            // launch gets a clean shot at creating it. Silent-fail if
            // the delete itself throws.
            runCatching {
                context.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE)
                    .edit().clear().apply()
            }
            null
        }
    }

    private fun createFallback(context: Context): SharedPreferences {
        usingFallback = true
        return context.getSharedPreferences(FALLBACK_FILE_NAME, Context.MODE_PRIVATE)
    }

    /** True if we had to fall back to plaintext on this device. For diagnostics only. */
    val isFallback: Boolean get() = usingFallback

    fun set(context: Context, key: String, value: String?) {
        try {
            val editor = prefs(context).edit()
            if (value == null) editor.remove(key) else editor.putString(key, value)
            editor.apply()
        } catch (t: Throwable) {
            Log.w(TAG, "SecureStore.set failed for $key", t)
        }
    }

    fun get(context: Context, key: String): String? =
        try {
            prefs(context).getString(key, null)
        } catch (t: Throwable) {
            Log.w(TAG, "SecureStore.get failed for $key", t)
            null
        }

    fun remove(context: Context, key: String) {
        try {
            prefs(context).edit().remove(key).apply()
        } catch (t: Throwable) {
            Log.w(TAG, "SecureStore.remove failed for $key", t)
        }
    }
}
