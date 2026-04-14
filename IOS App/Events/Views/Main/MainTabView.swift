import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    @State private var appeared = false

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem { Label("Home", systemImage: "house.fill") }.tag(0)
            AgendaView()
                .tabItem { Label("Agenda", systemImage: "calendar") }.tag(1)
            VotingView()
                .tabItem { Label("Vote", systemImage: "hand.thumbsup.fill") }.tag(2)
            NetworkingView()
                .tabItem { Label("Network", systemImage: "person.2.fill") }.tag(3)
            AnnouncementsView()
                .tabItem { Label("Updates", systemImage: "bell.fill") }.tag(4)
        }
        .tint(.ficaNavy)
        .opacity(appeared ? 1 : 0)
        .onAppear {
            selectedTab = 0
            withAnimation(.easeOut(duration: 0.3)) { appeared = true }
        }
    }
}
