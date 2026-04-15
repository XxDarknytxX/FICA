import SwiftUI

struct ChatListView: View {
    @Environment(AuthService.self) private var auth
    @State private var messages: [Message] = []
    @State private var isLoading = true
    @State private var search = ""

    struct ConvoSummary: Identifiable {
        let key: String
        let otherId: Int
        let otherName: String
        let otherOrg: String?
        let otherPhoto: String?
        let lastMessage: String
        let lastDate: String?
        let unreadCount: Int
        var id: String { key }
    }

    var body: some View {
        VStack(spacing: 0) {
            FICASearchBar(text: $search, placeholder: "Search conversations...")
                .padding(.horizontal, 20)
                .padding(.vertical, 10)

            if isLoading {
                LoadingView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if conversations.isEmpty {
                Spacer()
                EmptyStateView(icon: "bubble.left.and.bubble.right", title: "No conversations yet", subtitle: "Start chatting from the Directory tab")
                Spacer()
            } else {
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 0) {
                        ForEach(filteredConvos) { c in
                            NavigationLink {
                                ConversationView(otherUser: .stub(id: c.otherId, name: c.otherName, organization: c.otherOrg, photo_url: c.otherPhoto), myId: auth.userId)
                            } label: {
                                ConvoRow(convo: c)
                            }
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Color.ficaBg)
        .task { await loadMsgs() }
        .onAppear {
            ChatWebSocket.shared.onAnyMessage = { _ in
                Task { await loadMsgs() }
            }
        }
        .onDisappear {
            ChatWebSocket.shared.onAnyMessage = nil
        }
    }

    private var conversations: [ConvoSummary] {
        var map: [String: ConvoSummary] = [:]
        for m in messages {
            let oId = m.sender_id == auth.userId ? m.receiver_id : m.sender_id
            let oName = m.sender_id == auth.userId ? (m.receiver_name ?? "") : (m.sender_name ?? "")
            let oOrg = m.sender_id == auth.userId ? m.receiver_org : m.sender_org
            let oPhoto = m.sender_id == auth.userId ? m.receiver_photo : m.sender_photo
            let key = "\(min(m.sender_id, m.receiver_id))-\(max(m.sender_id, m.receiver_id))"
            let unread = m.receiver_id == auth.userId && m.isUnread

            if map[key] == nil {
                map[key] = ConvoSummary(key: key, otherId: oId, otherName: oName, otherOrg: oOrg, otherPhoto: oPhoto, lastMessage: m.body, lastDate: m.sent_at, unreadCount: unread ? 1 : 0)
            } else if unread {
                let e = map[key]!
                map[key] = ConvoSummary(key: key, otherId: e.otherId, otherName: e.otherName, otherOrg: e.otherOrg, otherPhoto: e.otherPhoto, lastMessage: e.lastMessage, lastDate: e.lastDate, unreadCount: e.unreadCount + 1)
            }
        }
        return Array(map.values).sorted { ($0.lastDate ?? "") > ($1.lastDate ?? "") }
    }

    private var filteredConvos: [ConvoSummary] {
        if search.isEmpty { return conversations }
        let q = search.lowercased()
        return conversations.filter { $0.otherName.lowercased().contains(q) }
    }

    private func loadMsgs() async {
        isLoading = messages.isEmpty
        messages = (try? await APIService.shared.getMyMessages(attendeeId: auth.userId)) ?? []
        isLoading = false
    }
}

struct ConvoRow: View {
    let convo: ChatListView.ConvoSummary

    var body: some View {
        HStack(spacing: 14) {
            AvatarView(name: convo.otherName, photo: convo.otherPhoto, size: 50, borderColor: .ficaBorder, borderWidth: 1)
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(convo.otherName)
                        .font(.system(size: 15, weight: convo.unreadCount > 0 ? .bold : .semibold))
                        .foregroundStyle(Color.ficaText)
                    Spacer()
                    if let d = convo.lastDate {
                        Text(d.relativeTime)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color.ficaMuted)
                    }
                }
                HStack {
                    Text(convo.lastMessage)
                        .font(.system(size: 13))
                        .foregroundStyle(convo.unreadCount > 0 ? Color.ficaText : Color.ficaMuted)
                        .lineLimit(1)
                    Spacer()
                    if convo.unreadCount > 0 {
                        Text("\(convo.unreadCount)")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 22, height: 22)
                            .background(Color.ficaNavySolid)
                            .clipShape(Circle())
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .background(convo.unreadCount > 0 ? Color.ficaNavy.opacity(0.03) : Color(.systemBackground))
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.ficaDivider)
                .frame(height: 0.5)
                .padding(.leading, 80)
        }
    }
}
