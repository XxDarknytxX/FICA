import SwiftUI

struct HomeView: View {
    @Environment(AuthService.self) private var auth
    @State private var sessions: [Session] = []
    @State private var speakers: [Speaker] = []
    @State private var announcements: [Announcement] = []
    @State private var sponsors: [Sponsor] = []
    @State private var networkingEvents: [NetworkingEvent] = []
    @State private var isLoading = true
    @State private var showProfile = false
    @State private var expandedAnnouncements: Set<Int> = []

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    // Hero always shows immediately — uses auth state that's already loaded.
                    heroCard

                    // Data-driven sections are gated on isLoading so they all fade in
                    // together once every API call has settled, instead of popping
                    // in one at a time as each fetch finishes.
                    if !isLoading {
                        statsRow
                        // Sponsors promoted to near the top — brand visibility sits
                        // above everything except the quick stats.
                        if !sponsors.isEmpty { sponsorsSection }
                        if !announcements.filter({ $0.isPublished }).isEmpty { announcementsSection }
                        if !sessions.isEmpty { sessionsSection }
                        if !speakers.filter({ $0.isKeynote }).isEmpty { speakersSection }
                        if !networkingEvents.isEmpty { eventsSection }
                    } else {
                        // Subtle placeholder while data loads — keeps the layout stable.
                        ProgressView()
                            .scaleEffect(0.9)
                            .tint(Color.ficaGold)
                            .padding(.top, 60)
                            .frame(maxWidth: .infinity)
                    }

                    Spacer().frame(height: 16)
                }
                .padding(.top, 8)
                .animation(.easeOut(duration: 0.35), value: isLoading)
            }
            .background(Color.ficaBg)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    FICALogoView(height: 24)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { showProfile = true } label: {
                        AvatarView(
                            name: auth.currentUser?.name ?? "U",
                            photo: auth.currentUser?.photo_url,
                            size: 32,
                            borderColor: .ficaGold,
                            borderWidth: 1.5
                        )
                    }
                }
            }
            .sheet(isPresented: $showProfile) {
                ProfileView()
                    .environment(auth)
            }
            .refreshable { await load() }
            .task { await load() }
        }
    }

    // MARK: - Hero

    private var heroCard: some View {
        VStack(spacing: 18) {
            VStack(spacing: 6) {
                Text("Welcome, \(auth.currentUser?.name.components(separatedBy: " ").first ?? "Delegate")")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(.white)
                Text("Charting New Horizons for a Changing World")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.white.opacity(0.65))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 8)
            }

            HStack(spacing: 0) {
                heroInfoPill(icon: "mappin.and.ellipse", text: "Crowne Plaza Fiji")
                heroDivider
                heroInfoPill(icon: "calendar", text: "8–9 May")
                heroDivider
                heroInfoPill(icon: "ticket.fill", text: TicketBadge.label(for: auth.currentUser?.ticket_type))
            }

            if let code = auth.currentUser?.registration_code {
                HStack(spacing: 8) {
                    Image(systemName: "qrcode")
                        .font(.system(size: 13))
                    Text(code)
                        .font(.system(size: 13, weight: .bold, design: .monospaced))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(.white.opacity(0.12))
                .clipShape(Capsule())
            }
        }
        .padding(.vertical, 28)
        .padding(.horizontal, 20)
        .frame(maxWidth: .infinity)
        .background(LinearGradient.ficaHero)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: .ficaNavy.opacity(0.3), radius: 16, x: 0, y: 8)
        .padding(.horizontal, 20)
    }

    private func heroInfoPill(icon: String, text: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(Color.ficaGold)
            Text(text)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.white.opacity(0.85))
        }
        .frame(maxWidth: .infinity)
    }

    private var heroDivider: some View {
        Rectangle().fill(.white.opacity(0.15)).frame(width: 1, height: 32)
    }

    // MARK: - Stats

    private var statsRow: some View {
        HStack(spacing: 10) {
            statItem(icon: "calendar", value: "\(sessions.count)", label: "Sessions", color: .ficaNavy)
            statItem(icon: "mic.fill", value: "\(speakers.count)", label: "Speakers", color: .ficaGold)
            statItem(icon: "star.fill", value: "\(sponsors.count)", label: "Sponsors", color: .purple)
            statItem(icon: "person.2.fill", value: "\(networkingEvents.count)", label: "Events", color: .ficaSuccess)
        }
        .padding(.horizontal, 20)
    }

    private func statItem(icon: String, value: String, label: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(color)
            Text(value)
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundStyle(Color.ficaText)
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(Color.ficaMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 2)
    }

    // MARK: - Sessions

    private var sessionsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: "Upcoming Sessions")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(sessions.prefix(6)) { s in
                        VStack(alignment: .leading, spacing: 0) {
                            Rectangle()
                                .fill(SessionType.color(for: s.session_type))
                                .frame(height: 3)
                            VStack(alignment: .leading, spacing: 8) {
                                HStack(spacing: 6) {
                                    Image(systemName: SessionType.symbol(for: s.session_type))
                                        .font(.system(size: 10, weight: .semibold))
                                    Text(s.session_type?.capitalized ?? "Session")
                                        .font(.system(size: 10, weight: .bold))
                                }
                                .foregroundStyle(SessionType.color(for: s.session_type))

                                Text(s.title)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Color.ficaText)
                                    .lineLimit(2)
                                    .fixedSize(horizontal: false, vertical: true)

                                if let t = s.start_time {
                                    InfoChip(icon: "clock", text: t.shortTime, color: .ficaMuted)
                                }
                                if let sp = s.speaker_name {
                                    InfoChip(icon: "person.fill", text: sp, color: .ficaSecondary)
                                }
                            }
                            .padding(14)
                        }
                        .frame(width: 200)
                        .background(Color.ficaCard)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .shadow(color: .black.opacity(0.05), radius: 6, x: 0, y: 3)
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }

    // MARK: - Announcements

    private var announcementsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: "Announcements")
            VStack(spacing: 8) {
                ForEach(announcements.filter { $0.isPublished }.prefix(3)) { a in
                    announcementRow(a)
                }
            }
            .padding(.horizontal, 20)
        }
    }

    private func announcementRow(_ a: Announcement) -> some View {
        let isExpanded = expandedAnnouncements.contains(a.id)
        let accent: Color = a.priority == "urgent" ? Color.ficaDanger : Color.ficaGold

        return Button {
            withAnimation(.easeInOut(duration: 0.25)) {
                if isExpanded {
                    expandedAnnouncements.remove(a.id)
                } else {
                    expandedAnnouncements.insert(a.id)
                }
            }
        } label: {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: a.priority == "urgent" ? "exclamationmark.triangle.fill" : "bell.badge.fill")
                    .font(.system(size: 16))
                    .foregroundStyle(accent)
                    .frame(width: 38, height: 38)
                    .background(accent.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(a.title)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color.ficaText)
                            .lineLimit(isExpanded ? nil : 1)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                        Spacer(minLength: 0)
                        if let d = a.created_at {
                            Text(d.relativeTime)
                                .font(.system(size: 10, weight: .medium))
                                .foregroundStyle(Color.ficaMuted)
                        }
                    }
                    if let body = a.body, !body.isEmpty {
                        Text(body)
                            .font(.system(size: 12))
                            .foregroundStyle(Color.ficaSecondary)
                            .lineLimit(isExpanded ? nil : 1)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    // Chevron affordance — shown when the body is long enough
                    // that tapping actually changes what you see.
                    if isExpanded || ((a.body?.count ?? 0) > 60) {
                        HStack(spacing: 4) {
                            Spacer()
                            Text(isExpanded ? "Show less" : "Read more")
                                .font(.system(size: 10, weight: .semibold))
                            Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                                .font(.system(size: 9, weight: .semibold))
                        }
                        .foregroundStyle(accent.opacity(0.75))
                        .padding(.top, 2)
                    }
                }
            }
            .padding(14)
            .background(Color.ficaCard)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .shadow(color: .black.opacity(0.03), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Speakers

    private var speakersSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: "Keynote Speakers")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 14) {
                    ForEach(speakers.filter { $0.isKeynote }) { sp in
                        VStack(spacing: 10) {
                            AvatarView(name: sp.name, photo: sp.photo_url, size: 64, borderColor: .ficaGold, borderWidth: 2)
                            VStack(spacing: 2) {
                                Text(sp.name)
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(Color.ficaText)
                                    .lineLimit(1)
                                Text(sp.organization ?? "")
                                    .font(.system(size: 10))
                                    .foregroundStyle(Color.ficaMuted)
                                    .lineLimit(1)
                            }
                        }
                        .frame(width: 100)
                        .padding(.vertical, 16)
                        .padding(.horizontal, 8)
                        .background(Color.ficaCard)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 2)
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }

    // MARK: - Networking Events

    private var eventsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: "Networking Events")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(networkingEvents.prefix(5)) { ev in
                        HStack(spacing: 12) {
                            EventTypeIcon(type: ev.type, size: 42)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(ev.title)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(Color.ficaText)
                                    .lineLimit(1)
                                HStack(spacing: 8) {
                                    if let t = ev.start_time { InfoChip(icon: "clock", text: t.shortTime) }
                                    if let l = ev.location { InfoChip(icon: "mappin", text: l) }
                                }
                            }
                        }
                        .padding(14)
                        .background(Color.ficaCard)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .shadow(color: .black.opacity(0.03), radius: 4, x: 0, y: 2)
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }

    // MARK: - Sponsors

    private var sponsorsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: "Sponsors")
            // Cards are sized via containerRelativeFrame so exactly 3 fit across
            // the scroll viewport on any phone width — no half-card peek on the
            // initial position. After the user scrolls, unaligned offsets are
            // fine (and .scrollTargetBehavior(.viewAligned) below nudges the
            // alignment back toward card edges when they lift their finger).
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 12) {
                    ForEach(sponsors) { sp in
                        sponsorCard(sp)
                            .containerRelativeFrame(
                                .horizontal,
                                count: 3,
                                span: 1,
                                spacing: 12
                            )
                    }
                }
                .scrollTargetLayout()
            }
            .contentMargins(.horizontal, 20, for: .scrollContent)
            .scrollTargetBehavior(.viewAligned)
        }
    }

    private func sponsorCard(_ sp: Sponsor) -> some View {
        VStack(spacing: 6) {
            // Logo slot — AsyncImage when logo_url is set, 2-letter initials
            // as placeholder while loading or when no URL is available.
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.ficaInputBg)
                .frame(height: 42)
                .overlay(
                    Group {
                        if let urlStr = sp.logo_url, let url = URL(string: urlStr) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let image):
                                    image.resizable().scaledToFit().padding(5)
                                default:
                                    Text(String(sp.name.prefix(2)).uppercased())
                                        .font(.system(size: 16, weight: .bold, design: .rounded))
                                        .foregroundStyle(Color.ficaNavy)
                                }
                            }
                        } else {
                            Text(String(sp.name.prefix(2)).uppercased())
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                                .foregroundStyle(Color.ficaNavy)
                        }
                    }
                )
            Text(sp.name)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(Color.ficaText)
                .lineLimit(1)
            Text(sp.tier?.capitalized ?? "")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(Color.ficaGold)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    // MARK: - Load

    private func load() async {
        // Only show the skeleton loader when we genuinely have nothing on screen
        // yet — i.e. the very first load. On pull-to-refresh or silent re-fetches,
        // keep the existing content visible and just swap in fresh data once it
        // arrives, so the user never sees a loader flash over data that's already
        // there.
        let isFirstLoad = sessions.isEmpty && speakers.isEmpty &&
                          announcements.isEmpty && sponsors.isEmpty &&
                          networkingEvents.isEmpty
        if isFirstLoad { isLoading = true }

        let currentYear = CongressYear.y2026.rawValue
        async let s = APIService.shared.getSessions(year: currentYear)
        async let sp = APIService.shared.getSpeakers(year: currentYear)
        async let a = APIService.shared.getAnnouncements()
        async let spon = APIService.shared.getSponsors(year: currentYear)
        async let ne = APIService.shared.getNetworkingEvents(year: currentYear)
        sessions = (try? await s) ?? []
        speakers = (try? await sp) ?? []
        announcements = (try? await a) ?? []
        sponsors = (try? await spon) ?? []
        networkingEvents = (try? await ne) ?? []
        isLoading = false
        await auth.refreshProfile()
    }
}
