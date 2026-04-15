import UIKit

/// In-memory decoded-image cache used by `CachedImage` and the home/sponsor
/// screen prefetchers. The goal is to hold ready-to-draw `UIImage`s so that
/// when a SwiftUI view reads the cache during its body, the image appears
/// on the same frame as the surrounding layout — no `AsyncImage` network
/// hit, no fade-in animation.
///
/// `URLCache` + `AsyncImage` is not a reliable substitute: even when the
/// bytes are in `URLCache`, `AsyncImage` still performs an async fetch +
/// placeholder→image transition on every appearance, which looks like
/// streaming to the user.
final class ImageCache: @unchecked Sendable {
    static let shared = ImageCache()

    private let lock = NSLock()
    private var store: [URL: UIImage] = [:]

    private init() {}

    func image(for url: URL) -> UIImage? {
        lock.lock(); defer { lock.unlock() }
        return store[url]
    }

    func set(_ image: UIImage, for url: URL) {
        lock.lock(); defer { lock.unlock() }
        store[url] = image
    }

    /// Downloads and decodes every URL not already cached, in parallel,
    /// with a per-request timeout so a single slow image can't hold up a
    /// screen load. Silently swallows errors — a view reading the cache
    /// later will just miss and can fall back to on-appear loading.
    func preload(_ urls: [URL]) async {
        // Snapshot which URLs still need fetching — anything already cached
        // is skipped so repeat pulls stay cheap.
        lock.lock()
        let toFetch = urls.filter { store[$0] == nil }
        lock.unlock()
        guard !toFetch.isEmpty else { return }

        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 10
        config.urlCache = nil              // we're holding UIImages; don't double-store bytes
        let session = URLSession(configuration: config)

        await withTaskGroup(of: (URL, UIImage?).self) { group in
            for url in toFetch {
                group.addTask {
                    do {
                        let (data, _) = try await session.data(from: url)
                        return (url, UIImage(data: data))
                    } catch {
                        return (url, nil)
                    }
                }
            }
            for await (url, image) in group {
                if let image {
                    self.set(image, for: url)
                }
            }
        }
    }
}
