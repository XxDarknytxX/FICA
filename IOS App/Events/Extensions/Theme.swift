import SwiftUI

// MARK: - FICA Design System

extension Color {
    // Primary (adaptive — lighter in dark mode for text/icons visibility)
    static let ficaNavy = Color("FICANavyAdaptive", bundle: nil)
    static let ficaNavyLight = Color(red: 20/255, green: 55/255, blue: 110/255)
    // Fixed navy for backgrounds/buttons that need to stay dark
    static let ficaNavySolid = Color(red: 10/255, green: 31/255, blue: 63/255)
    static let ficaGold = Color(red: 201/255, green: 168/255, blue: 76/255)
    static let ficaGoldLight = Color(red: 223/255, green: 192/255, blue: 106/255)
    static let ficaDark = Color(red: 5/255, green: 15/255, blue: 35/255)

    // Surface (adaptive)
    static let ficaBg = Color(.systemGroupedBackground)
    static let ficaCard = Color(.secondarySystemGroupedBackground)
    static let ficaInputBg = Color(.tertiarySystemFill)

    // Text (adaptive)
    static let ficaText = Color(.label)
    static let ficaSecondary = Color(.secondaryLabel)
    static let ficaMuted = Color(.tertiaryLabel)

    // Borders (adaptive)
    static let ficaBorder = Color(.separator)
    static let ficaDivider = Color(.quaternarySystemFill)

    // Semantic
    static let ficaSuccess = Color(red: 16/255, green: 185/255, blue: 129/255)
    static let ficaWarning = Color(red: 245/255, green: 158/255, blue: 11/255)
    static let ficaDanger = Color(red: 239/255, green: 68/255, blue: 68/255)
}

// MARK: - Gradients

extension LinearGradient {
    static let ficaHero = LinearGradient(
        colors: [Color.ficaDark, Color.ficaNavySolid, Color.ficaNavyLight],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )
    static let ficaGoldShimmer = LinearGradient(
        colors: [Color.ficaGold, Color.ficaGoldLight],
        startPoint: .leading, endPoint: .trailing
    )
}

// MARK: - Card Modifier

struct FICACard: ViewModifier {
    var padding: CGFloat = 18
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color.ficaCard)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
    }
}

extension View {
    func ficaCard(padding: CGFloat = 18) -> some View {
        modifier(FICACard(padding: padding))
    }
}

// MARK: - SF Symbol Event Types (replaces emojis)

struct EventTypeConfig {
    let symbol: String
    let color: Color
    let label: String
}

enum EventType {
    static func config(for type: String?) -> EventTypeConfig {
        switch type?.lowercased() {
        case "cocktail":    return .init(symbol: "wineglass.fill", color: .purple, label: "Cocktail")
        case "lunch":       return .init(symbol: "fork.knife", color: .green, label: "Lunch")
        case "coffee":      return .init(symbol: "cup.and.saucer.fill", color: .brown, label: "Coffee")
        case "dinner":      return .init(symbol: "wineglass", color: .indigo, label: "Dinner")
        case "gala":        return .init(symbol: "sparkles", color: .ficaGold, label: "Gala")
        case "tour":        return .init(symbol: "map.fill", color: .teal, label: "Tour")
        case "breakfast":   return .init(symbol: "sunrise.fill", color: .orange, label: "Breakfast")
        default:            return .init(symbol: "party.popper.fill", color: .ficaNavy, label: type?.capitalized ?? "Event")
        }
    }
}

enum SessionType {
    static func color(for type: String?) -> Color {
        switch type?.lowercased() {
        case "keynote":     return .ficaGold
        case "panel":       return .ficaNavy
        case "workshop":    return .purple
        case "break","lunch": return .green
        case "networking":  return .orange
        default:            return .ficaNavy
        }
    }
    static func symbol(for type: String?) -> String {
        switch type?.lowercased() {
        case "keynote":     return "star.fill"
        case "panel":       return "person.3.fill"
        case "workshop":    return "wrench.and.screwdriver.fill"
        case "break":       return "cup.and.saucer.fill"
        case "lunch":       return "fork.knife"
        case "networking":  return "person.2.fill"
        default:            return "calendar"
        }
    }
}

// MARK: - Ticket Badge

enum TicketBadge {
    static func color(for type: String?) -> Color {
        switch type?.lowercased() {
        case "vip":     return .ficaGold
        case "full":    return .ficaNavy
        case "virtual": return .purple
        case "day1":    return .teal
        case "day2":    return .cyan
        default:        return .gray
        }
    }
    static func label(for type: String?) -> String {
        switch type?.lowercased() {
        case "vip":     return "VIP"
        case "full":    return "Full Access"
        case "virtual": return "Virtual"
        case "day1":    return "Day 1"
        case "day2":    return "Day 2"
        default:        return type?.capitalized ?? "Attendee"
        }
    }
}

// MARK: - Project Category

enum ProjectCategory {
    static func color(for category: String?) -> Color {
        switch category?.lowercased() {
        case "innovation":     return .purple
        case "sustainability": return .green
        case "technology":     return .blue
        case "community":      return .orange
        default:               return .ficaNavy
        }
    }
    static func symbol(for category: String?) -> String {
        switch category?.lowercased() {
        case "innovation":     return "lightbulb.fill"
        case "sustainability": return "leaf.fill"
        case "technology":     return "desktopcomputer"
        case "community":      return "person.3.fill"
        default:               return "folder.fill"
        }
    }
}

// MARK: - String Helpers

extension String {
    var shortDate: String {
        let parts = self.prefix(10).split(separator: "-")
        guard parts.count == 3 else { return self }
        let months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        let m = Int(parts[1]) ?? 0
        let d = Int(parts[2]) ?? 0
        return "\(d) \(m < months.count ? months[m] : "")"
    }
    var shortTime: String { String(self.prefix(5)) }
    var relativeTime: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = formatter.date(from: self) ?? Date()
        let diff = Date().timeIntervalSince(date)
        let mins = Int(diff / 60)
        if mins < 1 { return "just now" }
        if mins < 60 { return "\(mins)m ago" }
        let hrs = mins / 60
        if hrs < 24 { return "\(hrs)h ago" }
        return "\(hrs / 24)d ago"
    }
}

// MARK: - Avatar URL

func avatarURL(name: String, photo: String? = nil, bg: String = "0A1F3F", fg: String = "C9A84C", size: Int = 120) -> URL {
    if let photo = photo, !photo.isEmpty, let url = URL(string: photo) { return url }
    let encoded = name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? name
    return URL(string: "https://ui-avatars.com/api/?name=\(encoded)&background=\(bg)&color=\(fg)&size=\(size)&bold=true")!
}
