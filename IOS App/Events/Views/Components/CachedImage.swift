import SwiftUI

/// Drop-in replacement for `AsyncImage` that first checks `ImageCache.shared`
/// and renders a ready `UIImage` synchronously when available. Falls back to
/// `AsyncImage` only when the cache misses (e.g. the screen's prefetch
/// timed out on this URL, or a new URL arrived after prefetch finished).
///
/// The cached path produces zero fade / no placeholder flash, so a screen
/// that called `ImageCache.shared.preload(...)` before committing state
/// paints with every image already visible on the first frame.
struct CachedImage<Placeholder: View>: View {
    let url: URL?
    var contentMode: ContentMode = .fit
    @ViewBuilder var placeholder: () -> Placeholder

    var body: some View {
        if let url {
            if let cached = ImageCache.shared.image(for: url) {
                Image(uiImage: cached)
                    .resizable()
                    .aspectRatio(contentMode: contentMode)
            } else {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: contentMode)
                            .onAppear {
                                // Populate the cache so later appearances of
                                // this URL (e.g. scrolling back) are instant
                                // even without an explicit preload pass.
                                if let rendered = renderToUIImage(phase: phase) {
                                    ImageCache.shared.set(rendered, for: url)
                                }
                            }
                    default:
                        placeholder()
                    }
                }
            }
        } else {
            placeholder()
        }
    }

    /// SwiftUI's `AsyncImagePhase` exposes `Image`, not `UIImage`. We can't
    /// pull a `UIImage` back out for free; on cache miss we just re-fetch
    /// next time. This hook is intentionally a no-op for now — kept so the
    /// shape is obvious if we later add a custom loader that yields both.
    private func renderToUIImage(phase: AsyncImagePhase) -> UIImage? { nil }
}
