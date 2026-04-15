import SwiftUI

/// "POWERED BY" label + Vodafone icon, optionally with the "vodafone" wordmark
/// sliding out from behind the circular icon.
///
/// Usage:
///     PoweredByVodafone()                                        // animates on appear
///     PoweredByVodafone(delay: 1.1)                              // with a start delay
///     PoweredByVodafone(iconHeight: 44)                          // bigger
///     PoweredByVodafone(animated: false)                         // static, no reveal
///     PoweredByVodafone(showWordmark: false)                     // label + icon only
struct PoweredByVodafone: View {
    /// Height of both the icon and the wordmark (they share the same source height).
    var iconHeight: CGFloat = 16
    /// Delay before the animation starts firing on appear.
    var delay: Double = 0
    /// Play the reveal animation on appear. When false, render in the final
    /// (fully-revealed) state immediately — use on pages where the user will
    /// see the element alongside other static content.
    var animated: Bool = true
    /// Show the small "POWERED BY" label to the left of the icon.
    var showLabel: Bool = true
    /// Show the "vodafone" wordmark that slides out from behind the icon.
    /// Turn off for a compact label+icon-only presentation.
    var showWordmark: Bool = true
    /// Font size of the "POWERED BY" label. Scales with iconHeight by default.
    var labelSize: CGFloat? = nil

    @State private var iconVisible: Bool
    @State private var wordmarkRevealed: Bool

    init(
        iconHeight: CGFloat = 16,
        delay: Double = 0,
        animated: Bool = true,
        showLabel: Bool = true,
        showWordmark: Bool = true,
        labelSize: CGFloat? = nil
    ) {
        self.iconHeight = iconHeight
        self.delay = delay
        self.animated = animated
        self.showLabel = showLabel
        self.showWordmark = showWordmark
        self.labelSize = labelSize
        // If not animated, jump straight to the final state.
        _iconVisible = State(initialValue: !animated)
        _wordmarkRevealed = State(initialValue: !animated)
    }

    /// Rendered icon width (225/223 of its height — the source is nearly square)
    /// plus the proportional gap from the original combined Vodafone PNG.
    /// Keeps spacing visually consistent across any iconHeight.
    private var wordmarkSlideOffset: CGFloat { iconHeight * 1.17 }

    /// Default label size scales with the icon — about half the height feels right.
    private var resolvedLabelSize: CGFloat {
        labelSize ?? max(9, iconHeight * 0.45)
    }

    var body: some View {
        HStack(spacing: max(6, iconHeight * 0.4)) {
            if showLabel {
                Text("POWERED BY")
                    .font(.system(size: resolvedLabelSize, weight: .semibold))
                    .kerning(resolvedLabelSize * 0.16)
                    .foregroundStyle(Color.ficaMuted.opacity(0.6))
                    .opacity(iconVisible ? 1 : 0)
            }

            ZStack(alignment: .leading) {
                // Wordmark sits behind the icon. Starts at x=0 (hidden behind
                // the icon) and slides right to reveal itself.
                if showWordmark {
                    Image("VodafoneWordmark")
                        .resizable()
                        .scaledToFit()
                        .frame(height: iconHeight)
                        .offset(x: wordmarkRevealed ? wordmarkSlideOffset : 0)
                        .opacity(wordmarkRevealed ? 1 : 0)
                }

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
            guard animated else { return }
            // Phase 1 — icon + "POWERED BY" label pop in together.
            withAnimation(.spring(response: 0.5, dampingFraction: 0.75).delay(delay)) {
                iconVisible = true
            }
            // Phase 2 — wordmark slides out from behind the icon (only if shown).
            if showWordmark {
                withAnimation(.spring(response: 0.65, dampingFraction: 0.85).delay(delay + 0.35)) {
                    wordmarkRevealed = true
                }
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
