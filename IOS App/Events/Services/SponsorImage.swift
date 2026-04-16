import Foundation

/// Maps a sponsor's `logo_url` to a bundled asset catalog name when the
/// sponsor is one of the known pre-packaged ones. Returning `nil` means
/// "I don't have this one bundled — fall back to network."
///
/// The sponsor roster is locked for FICA Congress 2026 — shipping the
/// PNGs inside the app means they render instantly on first launch,
/// survive a bad network, and never flash a placeholder.
enum SponsorImage {
    /// Filename-component → asset catalog name.
    private static let mapping: [String: String] = [
        "vodafone.png":         "SponsorVodafone",
        "asco-motors.png":      "SponsorAscoMotors",
        "extra.png":            "SponsorExtra",
        "merchant-finance.png": "SponsorMerchantFinance",
        "marsh.png":            "SponsorMarsh",
        "motibhai.png":         "SponsorMotibhai",
        "ca-anz.png":           "SponsorCaAnz",
        "datec.png":            "SponsorDatec",
        "fiji-airways.png":     "SponsorFijiAirways",
        "fiji-times.png":       "SponsorFijiTimes",
    ]

    /// Returns the asset catalog name for a bundled sponsor logo matching
    /// the given URL, or nil if the URL isn't one of the known sponsors.
    static func bundledAsset(for urlString: String?) -> String? {
        guard let raw = urlString, !raw.isEmpty else { return nil }
        // Lowercase the last path component so we tolerate case drift or
        // query strings (e.g. `?v=2`); mapping keys are lowercase.
        let filename: String
        if let url = URL(string: raw) {
            filename = url.lastPathComponent.lowercased()
        } else {
            // Raw string with no valid URL structure — try splitting.
            filename = raw.split(separator: "/").last.map(String.init)?.lowercased() ?? ""
        }
        return mapping[filename]
    }
}
