import SwiftUI

struct AnnouncementsView: View {
    @State private var announcements: [Announcement] = []
    @State private var networkingEvents: [NetworkingEvent] = []
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    if isLoading {
                        LoadingView(message: "Loading updates...")
                    } else {
                        // Networking Events
                        if !networkingEvents.isEmpty {
                            SectionHeader(title: "Networking Events")
                            ForEach(networkingEvents) { ev in eventCard(ev) }
                                .padding(.horizontal, 20)
                        }

                        // Announcements
                        SectionHeader(title: "Announcements")
                        let published = announcements.filter { $0.isPublished }
                        if published.isEmpty {
                            EmptyStateView(icon: "bell.slash", title: "No announcements yet", subtitle: "Check back closer to the event")
                        } else {
                            ForEach(published) { a in announcementCard(a) }
                                .padding(.horizontal, 20)
                        }
                    }
                }
                .padding(.top, 8)
                .padding(.bottom, 20)
            }
            .background(Color.ficaBg)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Updates").font(.system(size: 17, weight: .semibold)).foregroundStyle(Color.ficaText)
                }
            }
            .refreshable { await loadData() }
            .task { await loadData() }
        }
    }

    private func announcementCard(_ a: Announcement) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: a.priority == "urgent" ? "exclamationmark.triangle.fill" : a.priority == "important" ? "exclamationmark.circle.fill" : "bell.badge.fill")
                    .font(.system(size: 17))
                    .foregroundStyle(a.priority == "urgent" ? Color.ficaDanger : a.priority == "important" ? Color.ficaWarning : Color.ficaGold)
                    .frame(width: 40, height: 40)
                    .background((a.priority == "urgent" ? Color.ficaDanger : a.priority == "important" ? Color.ficaWarning : Color.ficaGold).opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(a.title).font(.system(size: 15, weight: .semibold)).foregroundStyle(Color.ficaText)
                        if a.priority == "urgent" {
                            Text("URGENT").font(.system(size: 9, weight: .heavy)).padding(.horizontal, 6).padding(.vertical, 2)
                                .background(Color.ficaDanger).foregroundStyle(.white).clipShape(Capsule())
                        }
                    }
                    if let d = a.created_at {
                        Text(d.relativeTime).font(.system(size: 11, weight: .medium)).foregroundStyle(Color.ficaMuted)
                    }
                }
                Spacer()
            }

            if let body = a.body, !body.isEmpty {
                Text(body).font(.system(size: 13)).foregroundStyle(Color.ficaSecondary).lineSpacing(4)
            }

            if let target = a.target, target != "all" {
                InfoChip(icon: "person.2", text: "For \(target) attendees", color: .ficaMuted)
            }
        }
        .padding(18)
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 3)
    }

    private func eventCard(_ ev: NetworkingEvent) -> some View {
        HStack(spacing: 14) {
            EventTypeIcon(type: ev.type, size: 46)
            VStack(alignment: .leading, spacing: 4) {
                Text(ev.title).font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.ficaText)
                HStack(spacing: 10) {
                    if let d = ev.slot_date { InfoChip(icon: "calendar", text: d.shortDate) }
                    if let t = ev.start_time {
                        InfoChip(icon: "clock", text: "\(t.shortTime)\(ev.end_time != nil ? " – \(ev.end_time!.shortTime)" : "")")
                    }
                }
                if let l = ev.location, !l.isEmpty { InfoChip(icon: "mappin", text: l) }
            }
            Spacer()
            if let c = ev.capacity {
                VStack(spacing: 2) {
                    Image(systemName: "person.2").font(.system(size: 11))
                    Text("\(c)").font(.system(size: 11, weight: .bold))
                }.foregroundStyle(Color.ficaMuted)
            }
        }
        .padding(16)
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: .black.opacity(0.03), radius: 4, x: 0, y: 2)
    }

    private func loadData() async {
        isLoading = announcements.isEmpty
        let currentYear = CongressYear.y2026.rawValue
        async let a = APIService.shared.getAnnouncements()
        async let ne = APIService.shared.getNetworkingEvents(year: currentYear)
        announcements = (try? await a) ?? []; networkingEvents = (try? await ne) ?? []
        isLoading = false
    }
}
