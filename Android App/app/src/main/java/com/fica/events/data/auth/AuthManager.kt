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

        // One-shot migration: if an older build left the JWT in plain
        // SharedPreferences, copy it into SecureStore (encrypted at rest)
        // and wipe the plaintext. Users stay logged in across the upgrade.
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
    }
}
