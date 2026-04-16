import Foundation

actor APIService {
    static let shared = APIService()

    // Production backend — https://eventsfiji.cloud
    // For local dev, flip to "http://localhost:5000/api" (simulator) or your LAN IP (device)
    // and add an NSAppTransportSecurity exception to Info.plist.
    private let baseURL = "https://eventsfiji.cloud/api"

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        return d
    }()

    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        return e
    }()

    // MARK: - Core Request

    private func request<T: Decodable>(
        _ method: String,
        path: String,
        body: (any Encodable)? = nil,
        authenticated: Bool = true
    ) async throws -> T {
        guard let url = URL(string: baseURL + path) else {
            throw APIServiceError.invalidURL
        }

        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if authenticated, let token = await AuthService.shared.token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            req.httpBody = try encoder.encode(AnyEncodable(body))
        }

        let (data, response) = try await URLSession.shared.data(for: req)

        guard let http = response as? HTTPURLResponse else {
            throw APIServiceError.invalidResponse
        }

        if http.statusCode == 401 {
            if authenticated {
                await AuthService.shared.logout()
            }
            if let apiErr = try? decoder.decode(APIError.self, from: data) {
                throw APIServiceError.server(apiErr.error)
            }
            throw APIServiceError.unauthorized
        }

        guard (200...299).contains(http.statusCode) else {
            if let apiErr = try? decoder.decode(APIError.self, from: data) {
                throw APIServiceError.server(apiErr.error)
            }
            throw APIServiceError.httpError(http.statusCode)
        }

        return try decoder.decode(T.self, from: data)
    }

    // MARK: - Convenience Methods

    func get<T: Decodable>(_ path: String, authenticated: Bool = true) async throws -> T {
        try await request("GET", path: path, authenticated: authenticated)
    }

    func post<T: Decodable>(_ path: String, body: any Encodable, authenticated: Bool = true) async throws -> T {
        try await request("POST", path: path, body: body, authenticated: authenticated)
    }

    func put<T: Decodable>(_ path: String, body: any Encodable) async throws -> T {
        try await request("PUT", path: path, body: body)
    }

    func delete(_ path: String) async throws {
        let _: EmptyOK = try await request("DELETE", path: path)
    }

    // MARK: - Auth

    func login(email: String, password: String) async throws -> LoginResponse {
        try await post("/delegate/login", body: LoginRequest(email: email, password: password), authenticated: false)
    }

    // MARK: - Profile

    func getMyProfile() async throws -> Attendee {
        let resp: ProfileResponse = try await get("/delegate/me")
        return resp.profile
    }

    // MARK: - Directory

    func getDirectory() async throws -> [Attendee] {
        let resp: DirectoryResponse = try await get("/delegate/directory")
        return resp.attendees
    }

    func getAttendeeProfile(id: Int) async throws -> Attendee {
        let resp: AttendeeProfileResponse = try await get("/delegate/directory/\(id)")
        return resp.attendee
    }

    // MARK: - Sessions

    func getSessions(year: Int? = nil) async throws -> [Session] {
        let path = year != nil ? "/delegate/sessions?year=\(year!)" : "/delegate/sessions"
        let resp: SessionsResponse = try await get(path)
        return resp.sessions
    }

    // MARK: - Speakers

    func getSpeakers(year: Int? = nil) async throws -> [Speaker] {
        let path = year != nil ? "/delegate/speakers?year=\(year!)" : "/delegate/speakers"
        let resp: SpeakersResponse = try await get(path)
        return resp.speakers
    }

    // MARK: - Sponsors

    func getSponsors(year: Int? = nil) async throws -> [Sponsor] {
        let path = year != nil ? "/delegate/sponsors?year=\(year!)" : "/delegate/sponsors"
        let resp: SponsorsResponse = try await get(path)
        return resp.sponsors
    }

    // MARK: - Messages

    func getMyMessages(attendeeId: Int) async throws -> [Message] {
        let resp: MessagesResponse = try await get("/delegate/messages?attendeeId=\(attendeeId)")
        return resp.messages
    }

    func getConversation(a: Int, b: Int) async throws -> [Message] {
        let resp: MessagesResponse = try await get("/delegate/messages/conversation?a=\(a)&b=\(b)")
        return resp.messages
    }

    func sendMessage(_ msg: SendMessageRequest) async throws -> Message {
        let resp: SendMessageResponse = try await post("/delegate/messages", body: msg)
        return resp.message
    }

    func markAsRead(readerId: Int, senderId: Int) async throws {
        let _: EmptyOK = try await post("/delegate/messages/read", body: ["reader_id": readerId, "sender_id": senderId])
    }

    func deleteMessage(id: Int) async throws {
        try await delete("/delegate/messages/\(id)")
    }

    // MARK: - Connections

    func getMyConnections(attendeeId: Int) async throws -> [Connection] {
        let resp: ConnectionsResponse = try await get("/delegate/connections?attendeeId=\(attendeeId)")
        return resp.connections
    }

    func createConnection(requesterId: Int, requestedId: Int) async throws -> Connection {
        let resp: ConnectionResponse = try await post("/delegate/connections", body: CreateConnectionRequest(requester_id: requesterId, requested_id: requestedId))
        return resp.connection
    }

    func updateConnection(id: Int, status: String) async throws -> Connection {
        let resp: ConnectionResponse = try await put("/delegate/connections/\(id)", body: ["status": status])
        return resp.connection
    }

    // MARK: - Meetings

    func getMyMeetings(attendeeId: Int) async throws -> [Meeting] {
        let resp: MeetingsResponse = try await get("/delegate/meetings?attendeeId=\(attendeeId)")
        return resp.meetings
    }

    func createMeeting(_ req: CreateMeetingRequest) async throws -> Meeting {
        let resp: MeetingResponse = try await post("/delegate/meetings", body: req)
        return resp.meeting
    }

    func updateMeeting(id: Int, status: String) async throws -> Meeting {
        let resp: MeetingResponse = try await put("/delegate/meetings/\(id)", body: ["status": status])
        return resp.meeting
    }

    // MARK: - Announcements

    func getAnnouncements() async throws -> [Announcement] {
        let resp: AnnouncementsResponse = try await get("/delegate/announcements")
        return resp.announcements
    }

    // MARK: - Networking Events

    func getNetworkingEvents(year: Int? = nil) async throws -> [NetworkingEvent] {
        let path = year != nil ? "/delegate/networking?year=\(year!)" : "/delegate/networking"
        let resp: NetworkingEventsResponse = try await get(path)
        return resp.slots
    }

    // MARK: - Settings

    func getSettings() async throws -> [String: String] {
        let resp: EventSettings = try await get("/delegate/settings")
        return resp.settings
    }

    // MARK: - Projects & Voting

    func getProjects() async throws -> ProjectsResponse {
        try await get("/delegate/projects")
    }

    func castVote(projectId: Int) async throws -> VoteResponse {
        try await post("/delegate/vote", body: VoteRequest(project_id: projectId))
    }

    func removeVote() async throws {
        try await delete("/delegate/vote")
    }

    // MARK: - Panel Discussion

    /// Returns the panel-type sessions for the given congress year, along
    /// with the global `panel_discussion_enabled` flag in the same envelope
    /// so the UI can gate its composer without a second request.
    func getPanels(year: Int? = nil) async throws -> PanelsResponse {
        let path = year != nil ? "/delegate/panels?year=\(year!)" : "/delegate/panels"
        return try await get(path)
    }

    func getPanelQuestions(sessionId: Int) async throws -> [PanelQuestion] {
        let resp: PanelQuestionsResponse = try await get("/delegate/panels/\(sessionId)/questions")
        return resp.questions
    }

    /// Posts a new question and returns the enriched row the backend
    /// echoes back (includes asker name/org/photo + panel-member flag).
    func postPanelQuestion(sessionId: Int, question: String) async throws -> PanelQuestion {
        let resp: PanelQuestionResponse = try await post(
            "/delegate/panels/\(sessionId)/questions",
            body: PostPanelQuestionRequest(question: question)
        )
        return resp.question
    }
}

// MARK: - Errors

enum APIServiceError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case server(String)
    case httpError(Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .invalidResponse: return "Invalid response"
        case .unauthorized: return "Session expired. Please log in again."
        case .server(let msg): return msg
        case .httpError(let code): return "Server error (\(code))"
        }
    }
}

// MARK: - Helpers

private struct EmptyOK: Decodable {}

private struct AnyEncodable: Encodable {
    private let _encode: (Encoder) throws -> Void

    init(_ wrapped: any Encodable) {
        _encode = { encoder in try wrapped.encode(to: encoder) }
    }

    func encode(to encoder: Encoder) throws {
        try _encode(encoder)
    }
}
