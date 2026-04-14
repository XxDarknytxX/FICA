import SwiftUI

@main
struct EventsApp: App {
    @State private var auth = AuthService.shared
    @State private var showSplash = true
    @State private var splashDone = false
    @AppStorage("appDarkMode") private var isDarkMode = false

    init() {
        configureAppearance()
    }

    var body: some Scene {
        WindowGroup {
            ZStack {
                Color(.systemBackground).ignoresSafeArea()

                if splashDone {
                    if auth.isAuthenticated {
                        MainTabView()
                    } else {
                        LoginView()
                    }
                }
            }
            .environment(auth)
            .preferredColorScheme(isDarkMode ? .dark : .light)
            .opacity(showSplash ? 0 : 1)
            .animation(.easeInOut(duration: 0.7), value: showSplash)
            .animation(.easeInOut(duration: 0.4), value: auth.isAuthenticated)
            .overlay {
                if showSplash {
                    SplashView {
                        splashDone = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                            withAnimation(.easeInOut(duration: 0.8)) {
                                showSplash = false
                            }
                        }
                    }
                }
            }
        }
    }

    private func configureAppearance() {
        // Tab bar
        let tab = UITabBarAppearance()
        tab.configureWithOpaqueBackground()
        tab.shadowColor = UIColor.separator
        tab.stackedLayoutAppearance.selected.iconColor = UIColor(Color.ficaNavy)
        tab.stackedLayoutAppearance.selected.titleTextAttributes = [.foregroundColor: UIColor(Color.ficaNavy), .font: UIFont.systemFont(ofSize: 10, weight: .semibold)]
        tab.stackedLayoutAppearance.normal.iconColor = UIColor.secondaryLabel
        tab.stackedLayoutAppearance.normal.titleTextAttributes = [.foregroundColor: UIColor.secondaryLabel, .font: UIFont.systemFont(ofSize: 10, weight: .medium)]
        UITabBar.appearance().standardAppearance = tab
        UITabBar.appearance().scrollEdgeAppearance = tab

        // Nav bar
        let nav = UINavigationBarAppearance()
        nav.configureWithDefaultBackground()
        nav.titleTextAttributes = [.font: UIFont.systemFont(ofSize: 17, weight: .semibold)]
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
        UINavigationBar.appearance().compactAppearance = nav
    }
}
