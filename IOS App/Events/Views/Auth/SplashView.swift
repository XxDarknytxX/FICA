import SwiftUI

struct SplashView: View {
    let onFinished: () -> Void

    // Animation states
    @State private var logoScale: CGFloat = 0.6
    @State private var logoOpacity: Double = 0
    @State private var ringRotation: Double = 0
    @State private var ringScale: CGFloat = 0.5
    @State private var ringOpacity: Double = 0
    @State private var textOpacity: Double = 0
    @State private var textOffset: CGFloat = 20
    @State private var subtitleOpacity: Double = 0
    @State private var shimmerOffset: CGFloat = -200
    @State private var particlesVisible = false
    @State private var lineWidth: CGFloat = 0

    var body: some View {
        ZStack {
            // Background
            Color(.systemBackground).ignoresSafeArea()

            // Subtle radial glow behind logo
            RadialGradient(
                colors: [Color.ficaGold.opacity(0.08), Color.clear],
                center: .center,
                startRadius: 20,
                endRadius: 200
            )
            .scaleEffect(ringScale * 2)
            .opacity(ringOpacity)

            // Floating particles
            ForEach(0..<8, id: \.self) { i in
                Circle()
                    .fill(i % 2 == 0 ? Color.ficaGold.opacity(0.3) : Color.ficaNavy.opacity(0.15))
                    .frame(width: CGFloat.random(in: 4...8), height: CGFloat.random(in: 4...8))
                    .offset(
                        x: particlesVisible ? CGFloat.random(in: -120...120) : 0,
                        y: particlesVisible ? CGFloat.random(in: -160...160) : 0
                    )
                    .opacity(particlesVisible ? Double.random(in: 0.3...0.7) : 0)
                    .blur(radius: 1)
            }

            VStack(spacing: 0) {
                Spacer()

                // Animated ring
                ZStack {
                    // Outer rotating ring
                    Circle()
                        .stroke(
                            AngularGradient(
                                colors: [
                                    Color.ficaGold.opacity(0.5),
                                    Color.ficaNavy.opacity(0.2),
                                    Color.ficaGold.opacity(0.1),
                                    Color.ficaNavy.opacity(0.3),
                                    Color.ficaGold.opacity(0.5),
                                ],
                                center: .center
                            ),
                            lineWidth: 2
                        )
                        .frame(width: 130, height: 130)
                        .scaleEffect(ringScale)
                        .opacity(ringOpacity * 0.6)
                        .rotationEffect(.degrees(ringRotation))

                    // Inner ring
                    Circle()
                        .stroke(Color.ficaGold.opacity(0.2), lineWidth: 1)
                        .frame(width: 110, height: 110)
                        .scaleEffect(ringScale)
                        .opacity(ringOpacity * 0.4)

                    // Logo
                    FICALogoView(height: 50)
                        .scaleEffect(logoScale)
                        .opacity(logoOpacity)
                }

                Spacer().frame(height: 36)

                // Event name with shimmer
                ZStack {
                    Text("Congress 2026")
                        .font(.system(size: 16, weight: .semibold, design: .default))
                        .foregroundStyle(Color.ficaNavy)
                        .opacity(textOpacity)
                        .offset(y: textOffset)

                    // Shimmer overlay
                    Text("Congress 2026")
                        .font(.system(size: 16, weight: .semibold, design: .default))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.clear, Color.ficaGold.opacity(0.6), .clear],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .opacity(textOpacity)
                        .offset(y: textOffset)
                        .mask(
                            Rectangle()
                                .offset(x: shimmerOffset)
                                .frame(width: 80)
                        )
                }

                Spacer().frame(height: 12)

                // Tagline
                Text("Navigating Tomorrow")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.ficaMuted)
                    .opacity(subtitleOpacity)

                Spacer().frame(height: 48)

                // Loading bar
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.ficaInputBg)
                        .frame(width: 120, height: 3)

                    Capsule()
                        .fill(
                            LinearGradient(colors: [Color.ficaNavy, Color.ficaGold], startPoint: .leading, endPoint: .trailing)
                        )
                        .frame(width: lineWidth, height: 3)
                }

                Spacer()
            }
        }
        .onAppear {
            runAnimations()
        }
    }

    private func runAnimations() {
        // Phase 1: Logo fades in and scales up
        withAnimation(.spring(response: 0.7, dampingFraction: 0.65).delay(0.1)) {
            logoScale = 1.0
            logoOpacity = 1.0
        }

        // Phase 2: Ring appears and starts rotating
        withAnimation(.spring(response: 0.8, dampingFraction: 0.7).delay(0.3)) {
            ringScale = 1.0
            ringOpacity = 1.0
        }
        withAnimation(.linear(duration: 8).repeatForever(autoreverses: false).delay(0.3)) {
            ringRotation = 360
        }

        // Phase 3: Particles scatter
        withAnimation(.easeOut(duration: 1.2).delay(0.4)) {
            particlesVisible = true
        }

        // Phase 4: Text slides up
        withAnimation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.6)) {
            textOpacity = 1.0
            textOffset = 0
        }

        // Phase 5: Shimmer across text
        withAnimation(.easeInOut(duration: 0.8).delay(0.8)) {
            shimmerOffset = 300
        }

        // Phase 6: Subtitle fades in
        withAnimation(.easeOut(duration: 0.5).delay(0.9)) {
            subtitleOpacity = 1.0
        }

        // Phase 7: Loading bar fills
        withAnimation(.easeInOut(duration: 1.2).delay(0.5)) {
            lineWidth = 120
        }

        // Phase 8: Dismiss
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) {
            onFinished()
        }
    }
}
