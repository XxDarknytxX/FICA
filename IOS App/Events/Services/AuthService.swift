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

    // Token now lives in the Keychain via SecureStore. Profile stays in
    // UserDefaults — it's non-sensitive public directory info.
    var token: String? {
        SecureStore.get(tokenKey)
    }

    var userId: Int {
        currentUser?.id ?? 0
    }

    private init() {
        // One-shot migration: if a prior build left the JWT in UserDefaults,
        // copy it into the Keychain and wipe the plaintext copy so the user
        // stays logged in but the credential is no longer iCloud-backed up.
        if let legacyToken = UserDefaults.standard.string(forKey: tokenKey) {
            SecureStore.set(legacyToken, forKey: tokenKey)
            UserDefaults.standard.removeObject(forKey: tokenKey)
        }

        if SecureStore.get(tokenKey) != nil {
            isAuthenticated = true
            if let data = UserDefaults.standard.data(forKey: userKey),
               let user = try? JSONDecoder().decode(Attendee.self, from: data) {
                currentUser = user
            }
        }
        // WS now requires the JWT on the upgrade URL. Only reconnect if
        // both pieces are present.
        if isAuthenticated, let user = currentUser, let tkn = token {
            ChatWebSocket.shared.connect(userId: user.id, token: tkn)
        }
        isLoading = false
    }

    func login(email: String, password: String) async throws {
        let response = try await APIService.shared.login(email: email, password: password)
        SecureStore.set(response.token, forKey: tokenKey)
        if let data = try? JSONEncoder().encode(response.attendee) {
            UserDefaults.standard.set(data, forKey: userKey)
        }
        currentUser = response.attendee
        isAuthenticated = true
        ChatWebSocket.shared.connect(userId: response.attendee.id, token: response.token)
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
        SecureStore.remove(tokenKey)
        UserDefaults.standard.removeObject(forKey: userKey)
        currentUser = nil
        isAuthenticated = false
    }
}
