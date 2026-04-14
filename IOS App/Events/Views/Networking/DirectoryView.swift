import SwiftUI

struct DirectoryView: View {
    @Environment(AuthService.self) private var auth
    @State private var attendees: [Attendee] = []
    @State private var isLoading = true
    @State private var search = ""
    @State private var selectedAttendee: Attendee?

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                FICASearchBar(text: $search, placeholder: "Search delegates...")
                Text("\(filtered.count)")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.ficaNavy)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.ficaNavy.opacity(0.08))
                    .clipShape(Capsule())
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 10)

            if isLoading { LoadingView() }
            else {
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 8) {
                        ForEach(filtered) { a in
                            AttendeeCard(attendee: a)
                                .onTapGesture { selectedAttendee = a }
                        }
                        if filtered.isEmpty { EmptyStateView(icon: "person.3", title: "No delegates found") }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.ficaBg)
        .task { await loadDir() }
        .sheet(item: $selectedAttendee) { AttendeeProfileSheet(attendee: $0) }
    }

    private var filtered: [Attendee] {
        if search.isEmpty { return attendees }
        let q = search.lowercased()
        return attendees.filter { $0.name.lowercased().contains(q) || ($0.organization ?? "").lowercased().contains(q) || ($0.job_title ?? "").lowercased().contains(q) }
    }

    private func loadDir() async {
        isLoading = attendees.isEmpty
        attendees = (try? await APIService.shared.getDirectory()) ?? []
        isLoading = false
    }
}

struct AttendeeCard: View {
    let attendee: Attendee
    var body: some View {
        HStack(spacing: 14) {
            AvatarView(name: attendee.name, photo: attendee.photo_url, size: 48, borderColor: .ficaBorder, borderWidth: 1)
            VStack(alignment: .leading, spacing: 3) {
                Text(attendee.name).font(.system(size: 15, weight: .semibold)).foregroundStyle(Color.ficaText)
                if let t = attendee.job_title, !t.isEmpty {
                    Text(t).font(.system(size: 12)).foregroundStyle(Color.ficaSecondary).lineLimit(1)
                }
                if let org = attendee.organization, !org.isEmpty {
                    InfoChip(icon: "building.2", text: org, color: .ficaNavy)
                }
            }
            Spacer()
            TicketBadgeView(type: attendee.ticket_type)
        }
        .padding(16)
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 3)
    }
}

struct AttendeeProfileSheet: View {
    let attendee: Attendee
    @Environment(AuthService.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var connectionSent = false
    @State private var connecting = false

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 22) {
                    VStack(spacing: 12) {
                        AvatarView(name: attendee.name, photo: attendee.photo_url, size: 90, borderColor: .ficaGold, borderWidth: 2)
                        Text(attendee.name).font(.system(size: 22, weight: .bold)).foregroundStyle(Color.ficaText)
                        if let t = attendee.job_title { Text(t).font(.system(size: 14)).foregroundStyle(Color.ficaSecondary) }
                        if let org = attendee.organization { Text(org).font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.ficaNavy) }
                        TicketBadgeView(type: attendee.ticket_type)
                    }
                    .padding(.top, 24)

                    if attendee.id != auth.userId {
                        HStack(spacing: 12) {
                            FICAButton(title: connectionSent ? "Sent" : "Connect", icon: connectionSent ? "checkmark" : "person.badge.plus", style: connectionSent ? .ghost : .primary, fullWidth: true) {
                                guard !connectionSent else { return }
                                connecting = true
                                Task {
                                    _ = try? await APIService.shared.createConnection(requesterId: auth.userId, requestedId: attendee.id)
                                    connectionSent = true; connecting = false
                                }
                            }
                            NavigationLink {
                                ConversationView(otherUser: attendee, myId: auth.userId)
                            } label: {
                                HStack(spacing: 6) {
                                    Image(systemName: "message.fill").font(.system(size: 14, weight: .semibold))
                                    Text("Message").font(.system(size: 15, weight: .bold))
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 48)
                                .background(Color.ficaGold)
                                .foregroundStyle(Color.ficaDark)
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            }
                        }
                        .padding(.horizontal, 20)
                    }

                    if let bio = attendee.bio, !bio.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("ABOUT").font(.system(size: 11, weight: .bold)).foregroundStyle(Color.ficaMuted).tracking(0.8)
                            Text(bio).font(.system(size: 14)).foregroundStyle(Color.ficaSecondary).lineSpacing(5)
                        }
                        .padding(18)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.ficaInputBg)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .padding(.horizontal, 20)
                    }

                    VStack(spacing: 8) {
                        if !attendee.email.isEmpty { contactItem(icon: "envelope.fill", text: attendee.email, color: .ficaNavy) }
                        if let l = attendee.linkedin, !l.isEmpty { contactItem(icon: "link", text: "LinkedIn", color: .blue) }
                        if let t = attendee.twitter, !t.isEmpty { contactItem(icon: "at", text: t, color: .cyan) }
                        if let w = attendee.website, !w.isEmpty { contactItem(icon: "globe", text: w, color: .ficaSuccess) }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.bottom, 30)
            }
            .background(Color.ficaBg)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }.fontWeight(.semibold).foregroundStyle(Color.ficaGold)
                }
            }
        }
    }

    private func contactItem(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 14)).foregroundStyle(color)
                .frame(width: 34, height: 34).background(color.opacity(0.1)).clipShape(RoundedRectangle(cornerRadius: 9))
            Text(text).font(.system(size: 13)).foregroundStyle(Color.ficaText).lineLimit(1)
            Spacer()
        }
        .padding(14)
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
