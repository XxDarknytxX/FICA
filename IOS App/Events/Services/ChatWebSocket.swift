import Foundation

@MainActor
@Observable
final class ChatWebSocket {
    static let shared = ChatWebSocket()

    private var task: URLSessionWebSocketTask?
    private var isConnected = false
    private var userId: Int?

    // Callbacks keyed by conversation pair "min-max"
    private var messageHandlers: [String: (Message) -> Void] = [:]
    // Global handler for chat list updates
    var onAnyMessage: ((Message) -> Void)?

    // Production WebSocket — wss://eventsfiji.cloud/ws (Nginx proxies to backend on :5000)
    // For local dev, flip to "ws://localhost:5000/ws" (simulator) or your LAN IP (device).
    private let wsURL = "wss://eventsfiji.cloud/ws"

    func connect(userId: Int) {
        guard !isConnected else { return }
        self.userId = userId

        guard let url = URL(string: wsURL) else { return }
        task = URLSession.shared.webSocketTask(with: url)
        task?.resume()
        isConnected = true

        // Join with our user ID
        let joinMsg = #"{"event":"join","userId":\#(userId)}"#
        task?.send(.string(joinMsg)) { _ in }

        listen()
    }

    func disconnect() {
        task?.cancel(with: .normalClosure, reason: nil)
        task = nil
        isConnected = false
        messageHandlers.removeAll()
        onAnyMessage = nil
    }

    func addConversationHandler(myId: Int, otherId: Int, handler: @escaping (Message) -> Void) {
        let key = "\(min(myId, otherId))-\(max(myId, otherId))"
        messageHandlers[key] = handler
    }

    func removeConversationHandler(myId: Int, otherId: Int) {
        let key = "\(min(myId, otherId))-\(max(myId, otherId))"
        messageHandlers.removeValue(forKey: key)
    }

    private func listen() {
        task?.receive { [weak self] result in
            switch result {
            case .success(let wsMessage):
                if case .string(let text) = wsMessage {
                    self?.handleRaw(text)
                }
                // Keep listening
                self?.listen()
            case .failure:
                Task { @MainActor in
                    self?.isConnected = false
                    // Reconnect after 3 seconds
                    try? await Task.sleep(for: .seconds(3))
                    if let uid = self?.userId {
                        self?.connect(userId: uid)
                    }
                }
            }
        }
    }

    private func handleRaw(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }

        struct WSPayload: Decodable {
            let event: String
            let data: Message
        }

        guard let payload = try? JSONDecoder().decode(WSPayload.self, from: data),
              payload.event == "new_message" else { return }

        let message = payload.data

        Task { @MainActor [weak self] in
            // Notify conversation-specific handler
            let key = "\(min(message.sender_id, message.receiver_id))-\(max(message.sender_id, message.receiver_id))"
            self?.messageHandlers[key]?(message)

            // Notify global handler (chat list)
            self?.onAnyMessage?(message)
        }
    }
}
