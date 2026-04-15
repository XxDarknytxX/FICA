import SwiftUI

struct ConnectionsView: View {
    @Environment(AuthService.self) private var auth
    @State private var connections: [Connection] = []
    @State private var isLoading = true
    @State private var filter = "all"

    var body: some View {
        VStack(spacing: 0) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(["all", "pending", "accepted", "declined"], id: \.self) { f in
                        let c = f == "all" ? connections.count : connections.filter { $0.status == f }.count
                        Button { withAnimation { filter = f } } label: {
                            Text("\(f.capitalized) (\(c))")
                                .font(.system(size: 12, weight: .semibold))
                                .padding(.horizontal, 14)
                                .padding(.vertical, 7)
                                .background(filter == f ? Color.ficaNavy : Color.ficaCard)
                                .foregroundStyle(filter == f ? .white : Color.ficaMuted)
                                .clipShape(Capsule())
                                .shadow(color: filter == f ? .ficaNavy.opacity(0.2) : .clear, radius: 4, y: 2)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
            }

            if isLoading { LoadingView() }
            else {
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 8) {
                        let incoming = filtered.filter { $0.status == "pending" && $0.requested_id == auth.userId }
                        if !incoming.isEmpty {
                            SectionHeader(title: "Incoming Requests")
                            ForEach(incoming) { c in
                                ConnectionCard(connection: c, myId: auth.userId) { status in await update(c.id, status) }
                            }
                        }
                        let rest = filtered.filter { !($0.status == "pending" && $0.requested_id == auth.userId) }
                        if !rest.isEmpty {
                            if !incoming.isEmpty { SectionHeader(title: "All Connections") }
                            ForEach(rest) { c in
                                ConnectionCard(connection: c, myId: auth.userId) { status in await update(c.id, status) }
                            }
                        }
                        if filtered.isEmpty { EmptyStateView(icon: "person.2.slash", title: "No connections", subtitle: "Visit the Directory to connect with delegates") }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Color.ficaBg)
        .task { await load() }
    }

    private var filtered: [Connection] { filter == "all" ? connections : connections.filter { $0.status == filter } }
    private func load() async { isLoading = connections.isEmpty; connections = (try? await APIService.shared.getMyConnections(attendeeId: auth.userId)) ?? []; isLoading = false }
    private func update(_ id: Int, _ status: String) async { _ = try? await APIService.shared.updateConnection(id: id, status: status); await load() }
}

struct ConnectionCard: View {
    let connection: Connection
    let myId: Int
    let onAction: (String) async -> Void

    private var other: (String, String?, String?) {
        connection.requester_id == myId
            ? (connection.requested_name ?? "", connection.requested_org, connection.requested_photo)
            : (connection.requester_name ?? "", connection.requester_org, connection.requester_photo)
    }
    private var isIncoming: Bool { connection.requested_id == myId && connection.status == "pending" }

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                AvatarView(name: other.0, photo: other.2, size: 46, borderColor: .ficaBorder, borderWidth: 1)
                VStack(alignment: .leading, spacing: 2) {
                    Text(other.0).font(.system(size: 15, weight: .semibold)).foregroundStyle(Color.ficaText)
                    if let org = other.1 { Text(org).font(.system(size: 12)).foregroundStyle(Color.ficaSecondary).lineLimit(1) }
                }
                Spacer()
                StatusBadgeView(status: connection.status)
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
