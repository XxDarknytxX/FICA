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

    fun connect(userId: Int) {
        if (webSocket != null) return
        this.userId = userId

        val request = Request.Builder().url(WS_URL).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                // Join with our user ID
                ws.send("""{"event":"join","userId":$userId}""")
            }

            override fun onMessage(ws: WebSocket, text: String) {
                handleMessage(text)
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                webSocket = null
                // Reconnect after 3 seconds
                Thread.sleep(3000)
                val uid = ChatWebSocket.userId
                if (uid != null) connect(uid)
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                webSocket = null
            }
        })
    }

    fun disconnect() {
        webSocket?.close(1000, "logout")
        webSocket = null
        conversationHandlers.clear()
        onAnyMessage = null
        panelDiscussionHandlers.clear()
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
            }
        } catch (_: Exception) {}
    }
}
