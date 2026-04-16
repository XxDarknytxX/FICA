import SwiftUI

/// Tab-root screen listing every panel-type session for the current
/// congress year. Tapping a row drills into `PanelDetailView` for Q&A.
///
/// The `panel_discussion_enabled` flag from the list response is threaded
/// through to the detail view so its composer can self-gate without an
/// extra fetch.
struct PanelsView: View {
    @State private var panels: [Panel] = []
    @State private var isLoading = true
    @State private var discussionEnabled = true
    @State private var errorMessage: String?

    private let year = CongressYear.y2026.rawValue

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && panels.isEmpty {
                    LoadingView(message: "Loading panels...")
                } else if panels.isEmpty {
                    EmptyStateView(
                        icon: "bubble.left.and.bubble.right",
                        title: "No panel discussions yet",
                        subtitle: "Panels will appear here when the schedule is finalized."
                    )
                } else {
                    ScrollView(showsIndicators: false) {
                        LazyVStack(spacing: 10) {
                            ForEach(panels) { panel in
                                NavigationLink(value: panel) {
                                    PanelRow(panel: panel)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 8)
                        .padding(.bottom, 20)
                    }
                }
            }
            .background(Color.ficaBg)
            .navigationDestination(for: Panel.self) { panel in
                // Gate the composer on the per-panel flag from the selected
                // row. Falls back to `discussionEnabled` (the response-level
                // flag) when the per-panel flag isn't set yet — maintains
                // compat with pre-column backends.
                PanelDetailView(
                    panel: panel,
                    discussionEnabled: panel.isDiscussionEnabled && discussionEnabled
                )
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Panels").font(.system(size: 17, weight: .semibold)).foregroundStyle(Color.ficaText)
                }
            }
            .refreshable { await load() }
            .task { await load() }
        }
    }

    private func load() async {
        do {
            let resp = try await APIService.shared.getPanels(year: year)
            panels = resp.panels
            discussionEnabled = resp.panel_discussion_enabled
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Panel row

private struct PanelRow: View {
    let panel: Panel

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Speaker avatar / panel glyph
            if panel.speaker_name != nil {
                AvatarView(
                    name: panel.speaker_name ?? "P",
                    photo: panel.speaker_photo,
                    size: 44,
                    borderColor: .ficaBorder,
                    borderWidth: 1
                )
            } else {
                Circle()
                    .fill(Color.ficaNavy.opacity(0.08))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "bubble.left.and.bubble.right.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(Color.ficaNavy)
                    )
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(panel.title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color.ficaText)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)

                HStack(spacing: 10) {
                    if let start = panel.start_time, let end = panel.end_time {
                        Label("\(start.shortTime) – \(end.shortTime)", systemImage: "clock")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color.ficaMuted)
                            .labelStyle(.titleAndIcon)
                    }
                    if let room = panel.room, !room.isEmpty {
                        Label(room, systemImage: "mappin")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color.ficaMuted)
                            .labelStyle(.titleAndIcon)
                            .lineLimit(1)
                    }
                }

                HStack(spacing: 6) {
                    // Question count pill
                    Label("\(panel.question_count ?? 0) question\((panel.question_count ?? 0) == 1 ? "" : "s")", systemImage: "text.bubble")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Color.ficaNavy)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.ficaNavy.opacity(0.08))
                        .clipShape(Capsule())
                        .labelStyle(.titleAndIcon)

                    // Closed pill — only when admin has turned this panel's
                    // discussion off. Reading is still allowed (tap still
                    // works); only posting is gated.
                    if !panel.isDiscussionEnabled {
                        Label("Closed", systemImage: "lock.fill")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Color.ficaDanger)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.ficaDanger.opacity(0.1))
                            .clipShape(Capsule())
                            .labelStyle(.titleAndIcon)
                    }

                    // "You're on this panel" badge for panel members
                    if panel.isPanelMember {
                        Label("You're on this panel", systemImage: "star.fill")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Color.ficaGold)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.ficaGold.opacity(0.12))
                            .clipShape(Capsule())
                            .labelStyle(.titleAndIcon)
                    }
                }
            }

            Spacer(minLength: 0)

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Color.ficaMuted)
        }
        .padding(14)
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 3)
    }
}
