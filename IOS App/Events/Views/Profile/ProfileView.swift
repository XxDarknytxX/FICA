import SwiftUI

struct ProfileView: View {
    @Environment(AuthService.self) private var auth
    @AppStorage("appDarkMode") private var isDarkMode = false
    @State private var showLogout = false
    @State private var connections: [Connection] = []
    @State private var meetings: [Meeting] = []

    private var user: Attendee? { auth.currentUser }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    // Hero header with gradient
                    profileHero

                    // Content sections
                    VStack(spacing: 16) {
                        statsRow
                        quickInfoCard
                        activityCard
                        preferencesCard
                        signOutCard

                        Text("FICA Congress 2026 · v1.0")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color.ficaMuted)
                            .padding(.top, 4)
                            .padding(.bottom, 20)
                    }
                    .padding(.top, 20)
                    .padding(.horizontal, 20)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Profile")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Color.ficaText)
                }
            }
            .refreshable { await auth.refreshProfile(); await loadActivity() }
            .task { await loadActivity() }
            .alert("Sign Out", isPresented: $showLogout) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) { auth.logout() }
            } message: { Text("Are you sure you want to sign out?") }
        }
    }

    // MARK: - Hero Header

    private var profileHero: some View {
        ZStack(alignment: .bottom) {
            // Gradient background
            LinearGradient.ficaHero
                .frame(height: 180)

            // Profile info overlapping the gradient
            VStack(spacing: 0) {
                Spacer().frame(height: 40)

                // Avatar with gold ring
                AvatarView(name: user?.name ?? "User", photo: user?.photo_url, size: 86, borderColor: .ficaGold, borderWidth: 3)
                    .shadow(color: .black.opacity(0.2), radius: 12, y: 4)

                Spacer().frame(height: 14)

                Text(user?.name ?? "Delegate")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.white)

                if let t = user?.job_title, !t.isEmpty {
                    Text(t)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.white.opacity(0.7))
                        .padding(.top, 2)
                }

                if let org = user?.organization, !org.isEmpty {
                    Text(org)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color.ficaGold)
                        .padding(.top, 2)
                }

                // Badge + Code row
                HStack(spacing: 12) {
                    TicketBadgeView(type: user?.ticket_type)

                    if let code = user?.registration_code {
                        HStack(spacing: 4) {
                            Image(systemName: "qrcode")
                                .font(.system(size: 10))
                            Text(code)
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                        }
                        .foregroundStyle(.white.opacity(0.8))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(.white.opacity(0.15))
                        .clipShape(Capsule())
                    }
                }
                .padding(.top, 10)

                Spacer().frame(height: 20)
            }
        }
    }

    // MARK: - Stats Row

    private var statsRow: some View {
        HStack(spacing: 10) {
            statPill(
                icon: "person.2.fill",
                value: "\(connections.filter { $0.status == "accepted" }.count)",
                label: "Connections",
                color: .ficaNavy
            )
            statPill(
                icon: "calendar.badge.clock",
                value: "\(meetings.count)",
                label: "Meetings",
                color: .ficaGold
            )
            statPill(
                icon: "checkmark.shield.fill",
                value: checkInText,
                label: "Check-in",
                color: .ficaSuccess
            )
        }
    }

    private var checkInText: String {
        let d1 = user?.isCheckedInDay1 ?? false
        let d2 = user?.isCheckedInDay2 ?? false
        if d1 && d2 { return "Both" }
        if d1 { return "Day 1" }
        if d2 { return "Day 2" }
        return "—"
    }

    private func statPill(icon: String, value: String, label: String, color: Color) -> some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.1))
                    .frame(width: 36, height: 36)
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(color)
            }
            Text(value)
                .font(.system(size: 17, weight: .black, design: .rounded))
                .foregroundStyle(Color.ficaText)
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(Color.ficaMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 2)
    }

    // MARK: - Quick Info Card (combined registration + social)

    private var quickInfoCard: some View {
        VStack(spacing: 0) {
            // Section: Details
            cardRow(icon: "envelope.fill", label: "Email", value: user?.email ?? "—", color: .ficaNavy)
            cardDivider
            cardRow(icon: "phone.fill", label: "Phone", value: user?.phone ?? "—", color: .ficaSuccess)
            cardDivider
            cardRow(icon: "ticket.fill", label: "Registration", value: user?.registration_code ?? "—", color: .ficaGold, monospaced: true)

            if let d = user?.dietary_requirements, !d.isEmpty {
                cardDivider
                cardRow(icon: "leaf.fill", label: "Dietary", value: d, color: .green)
            }

            // Social links if any
            if user?.linkedin != nil || user?.twitter != nil || user?.website != nil {
                cardDivider
                VStack(spacing: 0) {
                    if let l = user?.linkedin, !l.isEmpty {
                        cardRow(icon: "link", label: "LinkedIn", value: "Connected", color: .blue)
                        if user?.twitter != nil || user?.website != nil { cardDivider }
                    }
                    if let t = user?.twitter, !t.isEmpty {
                        cardRow(icon: "at", label: "Twitter / X", value: t, color: .cyan)
                        if user?.website != nil { cardDivider }
                    }
                    if let w = user?.website, !w.isEmpty {
                        cardRow(icon: "globe", label: "Website", value: w, color: .teal)
                    }
                }
            }

            // Bio
            if let bio = user?.bio, !bio.isEmpty {
                cardDivider
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 8) {
                        Image(systemName: "text.quote")
                            .font(.system(size: 12))
                            .foregroundStyle(Color.ficaGold)
                            .frame(width: 24)
                        Text("Bio")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Color.ficaMuted)
                    }
                    Text(bio)
                        .font(.system(size: 13))
                        .foregroundStyle(Color.ficaSecondary)
                        .lineSpacing(4)
                        .padding(.leading, 32)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
            }
        }
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 3)
    }

    // MARK: - Activity Card

    private var activityCard: some View {
        VStack(spacing: 0) {
            // Header inside card
            HStack(spacing: 8) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.ficaGold)
                Text("Activity")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Color.ficaText)
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 10)

            let pendingIn = connections.filter { $0.status == "pending" && $0.requested_id == auth.userId }
            let upcoming = meetings.filter { $0.status == "accepted" || $0.status == "pending" }

            VStack(spacing: 0) {
                if !pendingIn.isEmpty {
                    activityItem(
                        icon: "person.badge.plus",
                        text: "\(pendingIn.count) pending connection request\(pendingIn.count == 1 ? "" : "s")",
                        color: .ficaWarning
                    )
                }
                if !upcoming.isEmpty {
                    if !pendingIn.isEmpty { cardDivider }
                    activityItem(
                        icon: "calendar.badge.clock",
                        text: "\(upcoming.count) upcoming meeting\(upcoming.count == 1 ? "" : "s")",
                        color: .ficaGold
                    )
                }
                if pendingIn.isEmpty && upcoming.isEmpty {
                    activityItem(
                        icon: "checkmark.circle.fill",
                        text: "You're all caught up",
                        color: .ficaSuccess
                    )
                }
            }
            .padding(.bottom, 4)
        }
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 3)
    }

    private func activityItem(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(color.opacity(0.1))
                    .frame(width: 32, height: 32)
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(color)
            }
            Text(text)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.ficaText)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(Color.ficaBorder)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - Preferences

    private var preferencesCard: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.ficaMuted)
                Text("Preferences")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Color.ficaText)
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 10)

            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(Color.ficaNavy.opacity(0.1))
                        .frame(width: 32, height: 32)
                    Image(systemName: isDarkMode ? "moon.fill" : "sun.max.fill")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(isDarkMode ? .indigo : .orange)
                }
                VStack(alignment: .leading, spacing: 1) {
                    Text("Appearance")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.ficaText)
                    Text(isDarkMode ? "Dark Mode" : "Light Mode")
                        .font(.system(size: 11))
                        .foregroundStyle(Color.ficaMuted)
                }
                Spacer()
                Toggle("", isOn: $isDarkMode)
                    .labelsHidden()
                    .tint(.ficaNavy)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 3)
    }

    // MARK: - Sign Out

    private var signOutCard: some View {
        Button { showLogout = true } label: {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(Color.ficaDanger.opacity(0.1))
                        .frame(width: 32, height: 32)
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.ficaDanger)
                }
                Text("Sign Out")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.ficaDanger)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Color.ficaBorder)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color.ficaCard)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 3)
        }
    }

    // MARK: - Helpers

    private var cardDivider: some View {
        Rectangle()
            .fill(Color.ficaDivider)
            .frame(height: 0.5)
            .padding(.leading, 52)
    }

    private func cardRow(icon: String, label: String, value: String, color: Color, monospaced: Bool = false) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .fill(color.opacity(0.1))
                    .frame(width: 28, height: 28)
                Image(systemName: icon)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(color)
            }
            VStack(alignment: .leading, spacing: 1) {
                Text(label)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Color.ficaMuted)
                    .textCase(.uppercase)
                    .tracking(0.3)
                Text(value)
                    .font(monospaced ? .system(size: 13, weight: .semibold, design: .monospaced) : .system(size: 13, weight: .medium))
                    .foregroundStyle(Color.ficaText)
                    .lineLimit(1)
            }
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private func loadActivity() async {
        async let c = APIService.shared.getMyConnections(attendeeId: auth.userId)
        async let m = APIService.shared.getMyMeetings(attendeeId: auth.userId)
        connections = (try? await c) ?? []; meetings = (try? await m) ?? []
    }
}
