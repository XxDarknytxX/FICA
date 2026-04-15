import SwiftUI

struct NetworkingView: View {
    @State private var selectedTab = 0

    private let tabs: [(String, String)] = [
        ("person.2", "People"),
        ("link", "Connections"),
        ("bubble.left.and.bubble.right", "Chat"),
        ("calendar.badge.clock", "Meetings"),
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                tabBar
                Divider()

                // Only render the active tab. The content swap must be instant —
                // any lingering animation makes the new view's VStack briefly land
                // mid-screen (content shorter than container) before snapping up.
                Group {
                    switch selectedTab {
                    case 0: DirectoryView()
                    case 1: ConnectionsView()
                    case 2: ChatListView()
                    case 3: MeetingsListView()
                    default: DirectoryView()
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                // Nuke any inherited animation on the view swap (belt-and-braces
                // against any withAnimation callers upstream).
                .transaction { $0.animation = nil }
            }
            .background(Color.ficaBg)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Networking")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Color.ficaText)
                }
            }
        }
    }

    private var tabBar: some View {
        HStack(spacing: 4) {
            ForEach(Array(tabs.enumerated()), id: \.offset) { idx, tab in
                Button {
                    // Instant swap. The pill-highlight animation below is scoped
                    // via .animation(_:value:) so it doesn't leak into the content.
                    selectedTab = idx
                } label: {
                    VStack(spacing: 5) {
                        Image(systemName: tab.0)
                            .font(.system(size: 17, weight: selectedTab == idx ? .semibold : .regular))
                            .frame(height: 22)

                        Text(tab.1)
                            .font(.system(size: 10, weight: selectedTab == idx ? .bold : .medium))
                    }
                    .foregroundStyle(selectedTab == idx ? Color.ficaNavy : Color.ficaMuted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(selectedTab == idx ? Color.ficaNavy.opacity(0.06) : .clear)
                    )
                    // Animate only the pill tint + weight change, nothing else.
                    .animation(.easeInOut(duration: 0.18), value: selectedTab)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color(.systemBackground))
    }
}
