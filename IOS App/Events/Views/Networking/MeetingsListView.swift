import SwiftUI

struct MeetingsListView: View {
    @Environment(AuthService.self) private var auth
    @State private var meetings: [Meeting] = []
    @State private var attendees: [Attendee] = []
    @State private var isLoading = true
    @State private var showCreate = false

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("\(meetings.count) meeting\(meetings.count == 1 ? "" : "s")")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.ficaMuted)
                Spacer()
                Button { showCreate = true } label: {
                    Label("Request", systemImage: "plus")
                        .font(.system(size: 12, weight: .bold))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Color.ficaNavySolid)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)

            if isLoading { LoadingView() }
            else {
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 8) {
                        ForEach(meetings) { m in
                            MeetingCard(meeting: m, myId: auth.userId) { s in await updateMeeting(m.id, s) }
                        }
                        if meetings.isEmpty {
                            EmptyStateView(icon: "calendar.badge.plus", title: "No meetings", subtitle: "Request a 1:1 meeting with a delegate")
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Color.ficaBg)
        .task { await loadData() }
        .sheet(isPresented: $showCreate) { CreateMeetingSheet(attendees: attendees) { Task { await loadData() } } }
    }

    private func loadData() async {
        isLoading = meetings.isEmpty
        async let m = APIService.shared.getMyMeetings(attendeeId: auth.userId)
        async let a = APIService.shared.getDirectory()
        meetings = (try? await m) ?? []; attendees = (try? await a) ?? []
        isLoading = false
    }
    private func updateMeeting(_ id: Int, _ s: String) async {
        _ = try? await APIService.shared.updateMeeting(id: id, status: s); await loadData()
    }
}

struct MeetingCard: View {
    let meeting: Meeting
    let myId: Int
    let onAction: (String) async -> Void

    private var other: (String, String?, String?) {
        meeting.requester_id == myId
            ? (meeting.requested_name ?? "", meeting.requested_org, meeting.requested_photo)
            : (meeting.requester_name ?? "", meeting.requester_org, meeting.requester_photo)
    }
    private var isIncoming: Bool { meeting.requested_id == myId && meeting.status == "pending" }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                AvatarView(name: other.0, photo: other.2, size: 46, borderColor: .ficaBorder, borderWidth: 1)
                VStack(alignment: .leading, spacing: 2) {
                    Text(other.0).font(.system(size: 15, weight: .semibold)).foregroundStyle(Color.ficaText)
                    if let org = other.1 { Text(org).font(.system(size: 12)).foregroundStyle(Color.ficaSecondary) }
                }
                Spacer()
                StatusBadgeView(status: meeting.status ?? "pending")
            }

            if let t = meeting.title, !t.isEmpty {
                Text(t).font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.ficaNavy)
            }

            HStack(spacing: 14) {
                if let d = meeting.meeting_date, !d.isEmpty { InfoChip(icon: "calendar", text: d.shortDate) }
                if let t = meeting.start_time {
                    InfoChip(icon: "clock", text: "\(t.shortTime)\(meeting.end_time != nil ? " – \(meeting.end_time!.shortTime)" : "")")
                }
                if let l = meeting.location, !l.isEmpty { InfoChip(icon: "mappin", text: l) }
            }

            if isIncoming {
                HStack(spacing: 10) {
                    Button { Task { await onAction("accepted") } } label: {
                        Label("Accept", systemImage: "checkmark")
                            .font(.system(size: 13, weight: .bold))
                            .frame(maxWidth: .infinity).frame(height: 40)
                            .background(Color.ficaSuccess).foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                    Button { Task { await onAction("declined") } } label: {
                        Label("Decline", systemImage: "xmark")
                            .font(.system(size: 13, weight: .bold))
                            .frame(maxWidth: .infinity).frame(height: 40)
                            .background(Color.ficaInputBg).foregroundStyle(Color.ficaSecondary)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                }
            }
        }
        .padding(16)
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 3)
    }
}

struct CreateMeetingSheet: View {
    let attendees: [Attendee]
    let onCreated: () -> Void
    @Environment(AuthService.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var selected: Attendee?
    @State private var title = ""
    @State private var date = "2026-05-08"
    @State private var startTime = ""
    @State private var endTime = ""
    @State private var location = ""
    @State private var notes = ""
    @State private var saving = false
    @State private var search = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Meet With") {
                    if let s = selected {
                        HStack(spacing: 10) {
                            AvatarView(name: s.name, photo: s.photo_url, size: 36, borderColor: .ficaBorder, borderWidth: 1)
                            VStack(alignment: .leading) {
                                Text(s.name).font(.system(size: 14, weight: .bold))
                                Text(s.organization ?? "").font(.system(size: 12)).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button("Change") { selected = nil }.font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.ficaGold)
                        }
                    } else {
                        TextField("Search delegates...", text: $search)
                        let list = attendees.filter { $0.id != auth.userId }.filter { search.isEmpty || $0.name.lowercased().contains(search.lowercased()) }
                        ForEach(list.prefix(6)) { a in
                            Button { selected = a; search = "" } label: {
                                PersonRow(name: a.name, subtitle: a.organization, photo: a.photo_url)
                            }
                        }
                    }
                }
                Section("Details") {
                    TextField("Meeting title", text: $title)
                    Picker("Date", selection: $date) {
                        Text("Day 1 – 8 May").tag("2026-05-08")
                        Text("Day 2 – 9 May").tag("2026-05-09")
                    }
                    TextField("Start time (e.g. 10:00)", text: $startTime)
                    TextField("End time (e.g. 10:30)", text: $endTime)
                    TextField("Location", text: $location)
                }
                Section("Notes") {
                    TextField("Optional notes...", text: $notes, axis: .vertical).lineLimit(3...6)
                }
            }
            .scrollContentBackground(.visible)
            .navigationTitle("Request Meeting")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { Button("Cancel") { dismiss() }.foregroundStyle(.secondary) }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Send") { create() }.fontWeight(.bold).foregroundStyle(Color.ficaGold).disabled(selected == nil || saving)
                }
            }
        }
        .presentationDetents([.large])
    }

    private func create() {
        guard let a = selected else { return }
        saving = true
        Task {
            _ = try? await APIService.shared.createMeeting(CreateMeetingRequest(
                requester_id: auth.userId, requested_id: a.id,
                title: title.isEmpty ? nil : title, meeting_date: date,
                start_time: startTime.isEmpty ? nil : startTime, end_time: endTime.isEmpty ? nil : endTime,
                location: location.isEmpty ? nil : location, notes: notes.isEmpty ? nil : notes
            ))
            onCreated(); dismiss()
        }
    }
}
