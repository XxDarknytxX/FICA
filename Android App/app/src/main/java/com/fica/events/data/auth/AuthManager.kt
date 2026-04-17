package com.fica.events.data.auth

import android.content.Context
import android.content.SharedPreferences
import com.fica.events.data.api.ApiClient
import com.fica.events.data.api.ChatWebSocket
import com.fica.events.data.models.Attendee
import com.google.gson.Gson

object AuthManager {

    private const val PREFS_NAME = "fica_events_prefs"
    private const val KEY_AUTH_TOKEN = "fica_auth_token"
    private const val KEY_CURRENT_USER = "fica_current_user"

    private lateinit var prefs: SharedPreferences
    private lateinit var appContext: Context
    private val gson = Gson()

    fun init(context: Context) {
        appContext = context.applicationContext
        prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // Everything below is best-effort. We've already assigned the
        // critical state (appContext, prefs) above, so even if one of
        // these steps throws, the app itself still starts — the user
        // just lands on the login screen and signs in fresh.
        try {
            // One-shot migration: if an older build left the JWT in plain
            // SharedPreferences, copy it into SecureStore (encrypted at
            // rest) and wipe the plaintext. Users stay logged in across
            // the upgrade.
            val legacy = prefs.getString(KEY_AUTH_TOKEN, null)
            if (legacy != null && SecureStore.get(appContext, KEY_AUTH_TOKEN) == null) {
                SecureStore.set(appContext, KEY_AUTH_TOKEN, legacy)
            }
            if (legacy != null) {
                prefs.edit().remove(KEY_AUTH_TOKEN).apply()
            }

            // Restore token to ApiClient if it exists
            token?.let { ApiClient.updateToken(it) }

            // WS now requires the JWT on the upgrade URL. Only reconnect if
            // we have both user + token.
            val tkn = token
            val user = currentUser
            if (isAuthenticated && tkn != null && user != null) {
                ChatWebSocket.connect(user.id, tkn)
            }
        } catch (t: Throwable) {
            android.util.Log.w("AuthManager", "init recovery path — dropping session", t)
            // Conservative recovery: wipe any partial state so the user
            // gets a clean login screen instead of a crash loop.
            runCatching { prefs.edit().clear().apply() }
            runCatching { SecureStore.remove(appContext, KEY_AUTH_TOKEN) }
            ApiClient.updateToken(null)
        }
    }

    val isAuthenticated: Boolean
        get() = token != null

    // Token now lives in EncryptedSharedPreferences via SecureStore.
    var token: String?
        get() = SecureStore.get(appContext, KEY_AUTH_TOKEN)
        set(value) { SecureStore.set(appContext, KEY_AUTH_TOKEN, value) }

    var currentUser: Attendee?
        get() {
            val json = prefs.getString(KEY_CURRENT_USER, null) ?: return null
            return try {
                gson.fromJson(json, Attendee::class.java)
            } catch (e: Exception) {
                null
            }
        }
        set(value) {
            prefs.edit().apply {
                if (value != null) {
                    putString(KEY_CURRENT_USER, gson.toJson(value))
                } else {
                    remove(KEY_CURRENT_USER)
                }
                apply()
            }
        }

    val userId: Int
        get() = currentUser?.id ?: 0

    fun login(token: String, user: Attendee) {
        this.token = token
        this.currentUser = user
        ApiClient.updateToken(token)
        ChatWebSocket.connect(user.id, token)
    }

    fun logout() {
        ChatWebSocket.disconnect()
        token = null
        currentUser = null
        ApiClient.updateToken(null)
        // Notify any UI layer that wants to route away from authenticated
        // screens (e.g. the root NavHost popping back to Login). Silent-fail
        // if a listener itself throws — we don't want to leave the app in a
        // half-logged-out state.
        listeners.forEach { runCatching { it() } }
    }

    // ─── Logout listener API ─────────────────────────────────────────
    //
    // Background triggers like a WebSocket 401 on upgrade (server rotated
    // JWT_SECRET, or the token was otherwise invalidated) call
    // AuthManager.logout() from a non-UI thread. The root NavHost
    // registers here so it can react by navigating back to Login
    // without waiting for the user to tap anything.

    private val listeners = mutableListOf<() -> Unit>()

    fun addLogoutListener(listener: () -> Unit): () -> Unit {
        listeners.add(listener)
        return { listeners.remove(listener) }
    }
}
