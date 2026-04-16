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
    // Panel discussion open/close flips, broadcast from the admin UI.
    // (sessionId, discussionEnabled) — multiple subscribers supported so
    // the Panels list and a currently-open Panel Detail can both react.
    private var panelDiscussionHandlers: [UUID: (Int, Bool) -> Void] = [:]
    // Voting open/closed flips (admin → all delegates).
    private var votingOpenHandlers: [UUID: (Bool) -> Void] = [:]
    // Voting results visibility flips (admin → all delegates).
    private var votingResultsHandlers: [UUID: (Bool) -> Void] = [:]

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
        panelDiscussionHandlers.removeAll()
        votingOpenHandlers.removeAll()
        votingResultsHandlers.removeAll()
    }

    func addConversationHandler(myId: Int, otherId: Int, handler: @escaping (Message) -> Void) {
        let key = "\(min(myId, otherId))-\(max(myId, otherId))"
        messageHandlers[key] = handler
    }

    func removeConversationHandler(myId: Int, otherId: Int) {
        let key = "\(min(myId, otherId))-\(max(myId, otherId))"
        messageHandlers.removeValue(forKey: key)
    }

    /// Subscribe to panel discussion open/close push events. Returns a
    /// token; pass it back to `removePanelDiscussionHandler(_:)` on
    /// disappear to avoid leaking observers across view instances.
    @discardableResult
    func addPanelDiscussionHandler(_ handler: @escaping (_ sessionId: Int, _ enabled: Bool) -> Void) -> UUID {
        let id = UUID()
        panelDiscussionHandlers[id] = handler
        return id
    }

    func removePanelDiscussionHandler(_ id: UUID) {
        panelDiscussionHandlers.removeValue(forKey: id)
    }

    @discardableResult
    func addVotingOpenHandler(_ handler: @escaping (_ open: Bool) -> Void) -> UUID {
        let id = UUID()
        votingOpenHandlers[id] = handler
        return id
    }

    func removeVotingOpenHandler(_ id: UUID) {
        votingOpenHandlers.removeValue(forKey: id)
    }

    @discardableResult
    func addVotingResultsHandler(_ handler: @escaping (_ visible: Bool) -> Void) -> UUID {
        let id = UUID()
        votingResultsHandlers[id] = handler
        return id
    }

    func removeVotingResultsHandler(_ id: UUID) {
        votingResultsHandlers.removeValue(forKey: id)
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

        // Peek at event type first so we can dispatch to the right decoder.
        struct EventPeek: Decodable { let event: String }
        guard let peek = try? JSONDecoder().decode(EventPeek.self, from: data) else { return }

        switch peek.event {
        case "new_message":
            struct MessagePayload: Decodable { let event: String; let data: Message }
            guard let payload = try? JSONDecoder().decode(MessagePayload.self, from: data) else { return }
            let message = payload.data
            Task { @MainActor [weak self] in
                let key = "\(min(message.sender_id, message.receiver_id))-\(max(message.sender_id, message.receiver_id))"
                self?.messageHandlers[key]?(message)
                self?.onAnyMessage?(message)
            }

        case "panel_discussion_changed":
            struct PanelDiscussionData: Decodable {
                let session_id: Int
                let discussion_enabled: Bool
            }
            struct PanelPayload: Decodable { let event: String; let data: PanelDiscussionData }
            guard let payload = try? JSONDecoder().decode(PanelPayload.self, from: data) else { return }
            let sessionId = payload.data.session_id
            let enabled = payload.data.discussion_enabled
            Task { @MainActor [weak self] in
                guard let self else { return }
                for handler in self.panelDiscussionHandlers.values {
                    handler(sessionId, enabled)
                }
            }

        case "voting_open_changed":
            struct VotingOpenData: Decodable { let voting_open: Bool }
            struct VotingOpenPayload: Decodable { let event: String; let data: VotingOpenData }
            guard let payload = try? JSONDecoder().decode(VotingOpenPayload.self, from: data) else { return }
            let open = payload.data.voting_open
            Task { @MainActor [weak self] in
                guard let self else { return }
                for handler in self.votingOpenHandlers.values { handler(open) }
            }

        case "voting_results_visibility_changed":
            struct ResultsData: Decodable { let voting_results_visible: Bool }
            struct ResultsPayload: Decodable { let event: String; let data: ResultsData }
            guard let payload = try? JSONDecoder().decode(ResultsPayload.self, from: data) else { return }
            let visible = payload.data.voting_results_visible
            Task { @MainActor [weak self] in
                guard let self else { return }
                for handler in self.votingResultsHandlers.values { handler(visible) }
            }

        default:
            break
        }
    }
}
