import Foundation
import SwiftUI
import Observation

@MainActor
@Observable
class AuthService {
    static let shared = AuthService()

    var isAuthenticated = false
    var currentUser: Attendee?
    var isLoading = true

    private let tokenKey = "fica_auth_token"
    private let userKey = "fica_current_user"

    var token: String? {
        UserDefaults.standard.string(forKey: tokenKey)
    }

    var userId: Int {
        currentUser?.id ?? 0
    }

    private init() {
        if UserDefaults.standard.string(forKey: tokenKey) != nil {
            isAuthenticated = true
            if let data = UserDefaults.standard.data(forKey: userKey),
               let user = try? JSONDecoder().decode(Attendee.self, from: data) {
                currentUser = user
            }
        }
        if isAuthenticated, let user = currentUser {
            ChatWebSocket.shared.connect(userId: user.id)
        }
        isLoading = false
    }

    func login(email: String, password: String) async throws {
        let response = try await APIService.shared.login(email: email, password: password)
        UserDefaults.standard.set(response.token, forKey: tokenKey)
        if let data = try? JSONEncoder().encode(response.attendee) {
            UserDefaults.standard.set(data, forKey: userKey)
        }
        currentUser = response.attendee
        isAuthenticated = true
        ChatWebSocket.shared.connect(userId: response.attendee.id)
    }

    func refreshProfile() async {
        guard isAuthenticated else { return }
        do {
            let profile = try await APIService.shared.getMyProfile()
            currentUser = profile
            if let data = try? JSONEncoder().encode(profile) {
                UserDefaults.standard.set(data, forKey: userKey)
            }
        } catch {
            // Silent fail — profile refresh is best-effort
        }
    }

    func logout() {
        ChatWebSocket.shared.disconnect()
        UserDefaults.standard.removeObject(forKey: tokenKey)
        UserDefaults.standard.removeObject(forKey: userKey)
        currentUser = nil
        isAuthenticated = false
    }
}
