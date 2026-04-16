import Foundation
import Security

/// Thin wrapper around the iOS Keychain for storing the FICA auth token.
///
/// We used to keep the JWT in `UserDefaults`, which is backed up to iCloud
/// and syncs with Finder backups — not somewhere a long-lived
/// session credential should live. This store persists to the user's
/// Keychain with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`, which:
///   - is device-local (never exported to iCloud / encrypted backups)
///   - is readable after first unlock, so the app can reconnect the
///     WebSocket in the background without requiring Face ID
///
/// API surface mirrors the old UserDefaults calls so swapping it in at
/// `AuthService` is a small diff.
enum SecureStore {
    /// Default service identifier for all FICA keychain items. Scoping by
    /// service keeps our items separate from whatever else the app might
    /// stash later.
    private static let service = "com.fica.events.auth"

    /// Store or replace a string for the given key. Returns true on success.
    @discardableResult
    static func set(_ value: String, forKey key: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }

        // Delete any existing entry first — `SecItemAdd` fails with
        // errSecDuplicateItem otherwise, and `SecItemUpdate` can be flaky
        // across OS versions.
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(base as CFDictionary)

        var add = base
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(add as CFDictionary, nil)
        return status == errSecSuccess
    }

    /// Fetch the stored string for the given key, or nil if none / keychain
    /// is locked.
    static func get(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// Remove the entry for the given key. No-op if not present.
    static func remove(_ key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
