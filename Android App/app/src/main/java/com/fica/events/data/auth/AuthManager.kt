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
    private val gson = Gson()

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // Restore token to ApiClient if it exists
        token?.let { ApiClient.updateToken(it) }

        // Connect WebSocket if already authenticated
        if (isAuthenticated) {
            currentUser?.let { ChatWebSocket.connect(it.id) }
        }
    }

    val isAuthenticated: Boolean
        get() = token != null

    var token: String?
        get() = prefs.getString(KEY_AUTH_TOKEN, null)
        set(value) {
            prefs.edit().apply {
                if (value != null) {
                    putString(KEY_AUTH_TOKEN, value)
                } else {
                    remove(KEY_AUTH_TOKEN)
                }
                apply()
            }
        }

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
        ChatWebSocket.connect(user.id)
    }

    fun logout() {
        ChatWebSocket.disconnect()
        token = null
        currentUser = null
        ApiClient.updateToken(null)
    }
}
