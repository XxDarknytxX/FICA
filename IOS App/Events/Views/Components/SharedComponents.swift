import SwiftUI

// MARK: - FICA Logo (dark mode safe)

struct FICALogoView: View {
    var height: CGFloat = 55
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        if colorScheme == .dark {
            Image("FICALogo")
                .resizable()
                .scaledToFit()
                .frame(height: height)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color.white)
                )
        } else {
            Image("FICALogo")
                .resizable()
                .scaledToFit()
                .frame(height: height)
        }
    }
}

// MARK: - Avatar

struct AvatarView: View {
    let name: String
    let photo: String?
    var size: CGFloat = 44
    var borderColor: Color = .white
    var borderWidth: CGFloat = 2

    var body: some View {
        // Use CachedImage so preloaded avatars paint on first frame with no
        // fade. Falls back to the initials placeholder on cache miss or
        // network failure.
        CachedImage(
            url: avatarURL(name: name, photo: photo, size: Int(size * 2)),
            contentMode: .fill
        ) {
            Color.ficaNavy.overlay(
                Text(String(name.prefix(1)).uppercased())
                    .font(.system(size: size * 0.38, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.ficaGold)
            )
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(borderColor, lineWidth: borderWidth))
    }
}

// MARK: - Event Type Icon (SF Symbol based)

struct EventTypeIcon: View {
    let type: String?
    var size: CGFloat = 36

    private var cfg: EventTypeConfig { EventType.config(for: type) }

    var body: some View {
        Image(systemName: cfg.symbol)
            .font(.system(size: size * 0.42, weight: .semibold))
            .foregroundStyle(cfg.color)
            .frame(width: size, height: size)
            .background(cfg.color.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: size * 0.28, style: .continuous))
    }
}

// MARK: - Ticket Badge

struct TicketBadgeView: View {
    let type: String?
    var body: some View {
        Text(TicketBadge.label(for: type))
            .font(.system(size: 10, weight: .bold))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(TicketBadge.color(for: type).opacity(0.12))
            .foregroundStyle(TicketBadge.color(for: type))
            .clipShape(Capsule())
    }
}

// MARK: - Status Badge

struct StatusBadgeView: View {
    let status: String
    private var color: Color {
        switch status.lowercased() {
        case "pending":   return .ficaWarning
        case "accepted":  return .ficaSuccess
        case "declined":  return .ficaDanger
        case "cancelled": return .gray
        default:          return .gray
        }
    }
    var body: some View {
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(status.capitalized)
                .font(.system(size: 11, weight: .semibold))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(color.opacity(0.1))
        .foregroundStyle(color)
        .clipShape(Capsule())
    }
}

// MARK: - Loading

struct LoadingView: View {
    var message: String = "Loading..."
    var body: some View {
        VStack(spacing: 14) {
            ProgressView()
                .controlSize(.regular)
                .tint(.ficaGold)
            Text(message)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.ficaMuted)
        }
        .frame(maxWidth: .infinity, minHeight: 200)
    }
}

// MARK: - Empty State

struct EmptyStateView: View {
    let icon: String
    let title: String
    var subtitle: String? = nil

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 40, weight: .light))
                .foregroundStyle(Color.ficaBorder)
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Color.ficaSecondary)
            if let sub = subtitle {
                Text(sub)
                    .font(.system(size: 13))
                    .foregroundStyle(Color.ficaMuted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }
        }
        .padding(48)
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Section Header

struct SectionHeader: View {
    let title: String
    var action: (() -> Void)? = nil
    var actionLabel: String = "See All"

    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Color.ficaMuted)
                .textCase(.uppercase)
                .tracking(0.8)
            Spacer()
            if let action {
                Button(action: action) {
                    HStack(spacing: 3) {
                        Text(actionLabel)
                            .font(.system(size: 12, weight: .semibold))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 9, weight: .bold))
                    }
                    .foregroundStyle(Color.ficaGold)
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 6)
        .padding(.bottom, 4)
    }
}

// MARK: - Buttons

struct FICAButton: View {
    let title: String
    var icon: String? = nil
    var style: ButtonStyle = .primary
    var isLoading: Bool = false
    var fullWidth: Bool = true
    let action: () -> Void

    enum ButtonStyle { case primary, gold, ghost, danger }

    private var bg: Color {
        switch style {
        case .primary: return .ficaNavySolid
        case .gold: return .ficaGold
        case .ghost: return .clear
        case .danger: return .ficaDanger
        }
    }
    private var fg: Color {
        switch style {
        case .primary: return .white
        case .gold: return .ficaDark
        case .ghost: return .ficaSecondary
        case .danger: return .white
        }
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 7) {
                if isLoading {
                    ProgressView().tint(fg).controlSize(.small)
                } else if let icon {
                    Image(systemName: icon).font(.system(size: 14, weight: .semibold))
                }
                Text(title).font(.system(size: 15, weight: .bold))
            }
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .frame(height: 48)
            .background(bg)
            .foregroundStyle(fg)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                style == .ghost
                    ? RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Color.ficaBorder, lineWidth: 1)
                    : nil
            )
        }
        .disabled(isLoading)
    }
}

// MARK: - Search Bar

struct FICASearchBar: View {
    @Binding var text: String
    var placeholder: String = "Search..."

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Color.ficaMuted)
            TextField(placeholder, text: $text)
                .font(.system(size: 15))
                .foregroundStyle(Color.ficaText)
            if !text.isEmpty {
                Button { text = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(Color.ficaMuted)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .background(Color.ficaInputBg)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

// MARK: - Person Row

struct PersonRow: View {
    let name: String
    let subtitle: String?
    let photo: String?
    var trailing: AnyView? = nil

    var body: some View {
        HStack(spacing: 12) {
            AvatarView(name: name, photo: photo, size: 42, borderColor: .ficaBorder, borderWidth: 1)
            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.ficaText)
                if let sub = subtitle, !sub.isEmpty {
                    Text(sub)
                        .font(.system(size: 12))
                        .foregroundStyle(Color.ficaSecondary)
                        .lineLimit(1)
                }
            }
            Spacer()
            trailing
        }
    }
}

// MARK: - Info Chip

struct InfoChip: View {
    let icon: String
    let text: String
    var color: Color = .ficaSecondary

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .medium))
            Text(text)
                .font(.system(size: 12, weight: .medium))
                .lineLimit(1)
        }
        .foregroundStyle(color)
    }
}
