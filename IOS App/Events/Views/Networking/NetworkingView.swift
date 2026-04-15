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
                // Note: maxHeight: .infinity on this outer VStack below prevents
                // the first-mount layout race where the stack briefly sizes to
                // its intrinsic (header-only) height and renders centered.

                // Keep all four tabs mounted simultaneously — only their opacity
                // toggles. This prevents the "content flashes centered then snaps
                // to top" glitch caused by SwiftUI destroying and re-creating the
                // child view on every tab change (state reset + .task re-fires +
                // intrinsic-height layout race).
                //
                // Side benefit: scroll position, filters, and in-flight data
                // survive across tab switches.
                ZStack(alignment: .top) {
                    DirectoryView()
                        .opacity(selectedTab == 0 ? 1 : 0)
                        .zIndex(selectedTab == 0 ? 1 : 0)
                        .allowsHitTesting(selectedTab == 0)
                    ConnectionsView()
                        .opacity(selectedTab == 1 ? 1 : 0)
                        .zIndex(selectedTab == 1 ? 1 : 0)
                        .allowsHitTesting(selectedTab == 1)
                    ChatListView()
                        .opacity(selectedTab == 2 ? 1 : 0)
                        .zIndex(selectedTab == 2 ? 1 : 0)
                        .allowsHitTesting(selectedTab == 2)
                    MeetingsListView()
                        .opacity(selectedTab == 3 ? 1 : 0)
                        .zIndex(selectedTab == 3 ? 1 : 0)
                        .allowsHitTesting(selectedTab == 3)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
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
