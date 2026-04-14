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

    private const val WS_URL = "ws://10.0.2.2:5000/ws"

    private var webSocket: WebSocket? = null
    private var userId: Int? = null
    private val gson = Gson()
    private val client = OkHttpClient()

    // Handlers keyed by conversation pair "min-max"
    private val conversationHandlers = mutableMapOf<String, (Message) -> Unit>()

    // Global handler for chat list refresh
    var onAnyMessage: ((Message) -> Unit)? = null

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
    }

    fun addConversationHandler(myId: Int, otherId: Int, handler: (Message) -> Unit) {
        val key = "${minOf(myId, otherId)}-${maxOf(myId, otherId)}"
        conversationHandlers[key] = handler
    }

    fun removeConversationHandler(myId: Int, otherId: Int) {
        val key = "${minOf(myId, otherId)}-${maxOf(myId, otherId)}"
        conversationHandlers.remove(key)
    }

    private fun handleMessage(text: String) {
        try {
            val json = JsonParser.parseString(text).asJsonObject
            val event = json.get("event")?.asString ?: return
            if (event != "new_message") return

            val message = gson.fromJson(json.get("data"), Message::class.java)

            // Notify conversation-specific handler
            val key = "${minOf(message.sender_id, message.receiver_id)}-${maxOf(message.sender_id, message.receiver_id)}"
            conversationHandlers[key]?.invoke(message)

            // Notify global handler
            onAnyMessage?.invoke(message)
        } catch (_: Exception) {}
    }
}
