package com.fica.events.data.api

import com.fica.events.data.models.Message
import com.google.gson.Gson
import com.google.gson.JsonParser
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener

object ChatWebSocket {

    // Production WebSocket — wss://eventsfiji.cloud/ws (Nginx proxies to backend on :5000)
    // For local dev against the emulator, swap to "ws://10.0.2.2:5000/ws".
    private const val WS_URL = "wss://eventsfiji.cloud/ws"

    private var webSocket: WebSocket? = null
    private var userId: Int? = null
    // Cached JWT so an onFailure-triggered reconnect can re-auth with the
    // server's upgrade-URL check. Cleared on disconnect().
    private var authToken: String? = null
    private val gson = Gson()
    private val client = OkHttpClient()

    // Handlers keyed by conversation pair "min-max"
    private val conversationHandlers = mutableMapOf<String, (Message) -> Unit>()

    // Global handler for chat list refresh
    var onAnyMessage: ((Message) -> Unit)? = null

    // Panel discussion open/close flips, broadcast from the admin UI.
    // (sessionId, discussionEnabled) — tokenised so the list and a
    // currently-open detail screen can subscribe independently.
    private val panelDiscussionHandlers = mutableMapOf<java.util.UUID, (Int, Boolean) -> Unit>()
    // Voting open/closed + results-visibility flips.
    private val votingOpenHandlers = mutableMapOf<java.util.UUID, (Boolean) -> Unit>()
    private val votingResultsHandlers = mutableMapOf<java.util.UUID, (Boolean) -> Unit>()

    /**
     * Open an authenticated WebSocket. The JWT is appended to the upgrade
     * URL as `?token=<jwt>`; the server verifies it on upgrade and rejects
     * missing/invalid tokens with HTTP 401. The userId argument is kept
     * for caller ergonomics but identity is now derived from the verified
     * token on the server.
     */
    fun connect(userId: Int, token: String) {
        if (webSocket != null) return
        this.userId = userId
        this.authToken = token

        val encodedToken = java.net.URLEncoder.encode(token, "UTF-8")
        val request = Request.Builder().url("$WS_URL?token=$encodedToken").build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                // Server no longer trusts this message; sent only so older
                // backends during a rolling upgrade still see a join.
                ws.send("""{"event":"join","userId":$userId}""")
            }

            override fun onMessage(ws: WebSocket, text: String) {
                handleMessage(text)
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                webSocket = null
                // 401 on the upgrade = the token is stale (server rotated
                // JWT_SECRET, or the token expired). Boot to login rather
                // than looping forever — that's what made the app look
                // frozen after a backend deploy. AuthManager.logout()
                // notifies the root NavHost via the logout-listener API,
                // which pops back to Login.
                if (response?.code == 401) {
                    com.fica.events.data.auth.AuthManager.logout()
                    return
                }
                // Transient network failure — retry after 3s.
                Thread.sleep(3000)
                val uid = ChatWebSocket.userId
                val tkn = ChatWebSocket.authToken
                if (uid != null && tkn != null) connect(uid, tkn)
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                webSocket = null
            }
        })
    }

    fun disconnect() {
        webSocket?.close(1000, "logout")
        webSocket = null
        authToken = null
        conversationHandlers.clear()
        onAnyMessage = null
        panelDiscussionHandlers.clear()
        votingOpenHandlers.clear()
        votingResultsHandlers.clear()
    }

    fun addConversationHandler(myId: Int, otherId: Int, handler: (Message) -> Unit) {
        val key = "${minOf(myId, otherId)}-${maxOf(myId, otherId)}"
        conversationHandlers[key] = handler
    }

    fun removeConversationHandler(myId: Int, otherId: Int) {
        val key = "${minOf(myId, otherId)}-${maxOf(myId, otherId)}"
        conversationHandlers.remove(key)
    }

    /** Subscribe to live panel discussion open/close events. Keep the
     *  returned token and pass it to [removePanelDiscussionHandler] on
     *  dispose so the singleton doesn't leak stale observers. */
    fun addPanelDiscussionHandler(handler: (sessionId: Int, enabled: Boolean) -> Unit): java.util.UUID {
        val id = java.util.UUID.randomUUID()
        panelDiscussionHandlers[id] = handler
        return id
    }

    fun removePanelDiscussionHandler(id: java.util.UUID) {
        panelDiscussionHandlers.remove(id)
    }

    fun addVotingOpenHandler(handler: (Boolean) -> Unit): java.util.UUID {
        val id = java.util.UUID.randomUUID()
        votingOpenHandlers[id] = handler
        return id
    }

    fun removeVotingOpenHandler(id: java.util.UUID) { votingOpenHandlers.remove(id) }

    fun addVotingResultsHandler(handler: (Boolean) -> Unit): java.util.UUID {
        val id = java.util.UUID.randomUUID()
        votingResultsHandlers[id] = handler
        return id
    }

    fun removeVotingResultsHandler(id: java.util.UUID) { votingResultsHandlers.remove(id) }

    private fun handleMessage(text: String) {
        try {
            val json = JsonParser.parseString(text).asJsonObject
            val event = json.get("event")?.asString ?: return
            when (event) {
                "new_message" -> {
                    val message = gson.fromJson(json.get("data"), Message::class.java)
                    val key = "${minOf(message.sender_id, message.receiver_id)}-${maxOf(message.sender_id, message.receiver_id)}"
                    conversationHandlers[key]?.invoke(message)
                    onAnyMessage?.invoke(message)
                }
                "panel_discussion_changed" -> {
                    val data = json.get("data")?.asJsonObject ?: return
                    val sessionId = data.get("session_id")?.asInt ?: return
                    val enabled = data.get("discussion_enabled")?.asBoolean ?: return
                    // Copy to avoid ConcurrentModification if a handler
                    // unregisters itself during iteration.
                    panelDiscussionHandlers.values.toList().forEach { it(sessionId, enabled) }
                }
                "voting_open_changed" -> {
                    val data = json.get("data")?.asJsonObject ?: return
                    val open = data.get("voting_open")?.asBoolean ?: return
                    votingOpenHandlers.values.toList().forEach { it(open) }
                }
                "voting_results_visibility_changed" -> {
                    val data = json.get("data")?.asJsonObject ?: return
                    val visible = data.get("voting_results_visible")?.asBoolean ?: return
                    votingResultsHandlers.values.toList().forEach { it(visible) }
                }
            }
        } catch (_: Exception) {}
    }
}
