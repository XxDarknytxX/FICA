import SwiftUI

/// "POWERED BY" label + Vodafone icon, with the "vodafone" wordmark sliding
/// out from behind the circular icon.
///
/// Usage:
///     PoweredByVodafone()                  // auto-animates on appear
///     PoweredByVodafone(delay: 1.1)        // with a start delay (splash)
///     PoweredByVodafone(iconHeight: 18)    // bigger
struct PoweredByVodafone: View {
    /// Height of both the icon and the wordmark (they share the same source height).
    var iconHeight: CGFloat = 16
    /// Delay before the animation starts firing on appear.
    var delay: Double = 0

    @State private var iconVisible = false
    @State private var wordmarkRevealed = false

    /// Roughly the icon's rendered width + a small gap (matches the original
    /// visual spacing in the combined Vodafone PNG).
    private var wordmarkSlideOffset: CGFloat { iconHeight + 4 }

    var body: some View {
        HStack(spacing: 8) {
            Text("POWERED BY")
                .font(.system(size: 9, weight: .semibold))
                .kerning(1.4)
                .foregroundStyle(Color.ficaMuted.opacity(0.55))
                .opacity(iconVisible ? 1 : 0)

            ZStack(alignment: .leading) {
                // Wordmark sits behind the icon. Starts at x=0 (hidden behind
                // the icon) and slides right to reveal itself.
                Image("VodafoneWordmark")
                    .resizable()
                    .scaledToFit()
                    .frame(height: iconHeight)
                    .offset(x: wordmarkRevealed ? wordmarkSlideOffset : 0)
                    .opacity(wordmarkRevealed ? 1 : 0)

                // Icon stays anchored at the leading edge, on top of the wordmark.
                Image("VodafoneIcon")
                    .resizable()
                    .scaledToFit()
                    .frame(height: iconHeight)
                    .opacity(iconVisible ? 1 : 0)
                    .scaleEffect(iconVisible ? 1 : 0.7)
            }
        }
        .onAppear {
            // Phase 1 — icon + "POWERED BY" label pop in together.
            withAnimation(.spring(response: 0.5, dampingFraction: 0.75).delay(delay)) {
                iconVisible = true
            }
            // Phase 2 — wordmark slides out from behind the icon.
            withAnimation(.spring(response: 0.65, dampingFraction: 0.85).delay(delay + 0.35)) {
                wordmarkRevealed = true
            }
        }
    }
}

#Preview {
    VStack(spacing: 40) {
        PoweredByVodafone()
        PoweredByVodafone(iconHeight: 22, delay: 0.5)
    }
    .padding()
}
