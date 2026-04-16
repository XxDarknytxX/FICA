import SwiftUI

/// Tab-root list of panel sessions for the current congress year. Reads
/// `/api/delegate/panels`, renders each panel with a session-group colored
/// accent bar (matches the Agenda screen), time, speaker, and a prominent
/// question-count footer that doubles as the Q&A call-to-action.
///
/// Tapping a row pushes `PanelDetailView`. The per-panel `discussion_enabled`
/// flag is threaded through to the detail view so its composer can
/// self-gate without an extra fetch.
struct PanelsView: View {
    @State private var panels: [Panel] = []
    @State private var isLoading = true
    @State private var responseFlag = true   // backend's panel_discussion_enabled (legacy)
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
                    list
                }
            }
            .background(Color.ficaBg)
            .navigationDestination(for: Panel.self) { panel in
                PanelDetailView(
                    panel: panel,
                    // AND the per-panel flag with the response-level flag
                    // so either signal can close the composer.
                    discussionEnabled: panel.isDiscussionEnabled && responseFlag
                )
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Panels")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Color.ficaText)
                }
            }
            .refreshable { await load() }
            .task { await load() }
        }
    }

    // MARK: - List

    private var list: some View {
        ScrollView(showsIndicators: false) {
            // Tight header so users know the list's purpose without a big
            // section label taking up space.
            HStack(spacing: 6) {
                Text("\(panels.count) panel\(panels.count == 1 ? "" : "s")")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(0.8)
                    .foregroundStyle(Color.ficaMuted)
                    .textCase(.uppercase)
                Spacer()
                let open = panels.filter { $0.isDiscussionEnabled }.count
                Text("\(open) open · \(panels.count - open) closed")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Color.ficaMuted)
            }
            .padding(.horizontal, 24)
            .padding(.top, 12)
            .padding(.bottom, 6)

            LazyVStack(spacing: 12) {
                ForEach(panels) { panel in
                    NavigationLink(value: panel) {
                        PanelCard(panel: panel)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
        }
    }

    private func load() async {
        do {
            let resp = try await APIService.shared.getPanels(year: year)
            panels = resp.panels
            responseFlag = resp.panel_discussion_enabled
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Card

/// One row in the Panels list. Structurally mirrors `SessionCard` in the
/// Agenda view (colored accent bar on the left, content block on the right)
/// so panels read as a specialized session card — same design language,
/// different call-to-action.
private struct PanelCard: View {
    let panel: Panel

    /// Accent color follows the session group, falling back to the FICA
    /// navy. Matches what the Agenda view already does.
    private var accentColor: Color {
        if let group = SessionGroup(raw: sessionGroupRaw) {
            return group.color
        }
        return .ficaNavy
    }

    /// Panel doesn't expose `session_group` directly in its model yet —
    /// derive what we can from the title as a best-effort fallback. If we
    /// add `session_group` to the Panel model later this goes away.
    private var sessionGroupRaw: String? {
        let lower = panel.title.lowercased()
        if lower.contains("session 1") || lower.contains("positioning") { return "session1" }
        if lower.contains("session 2") || lower.contains("transforming") { return "session2" }
        if lower.contains("session 3") || lower.contains("global standards") || lower.contains("governance") { return "session3" }
        if lower.contains("opening") { return "opening" }
        if lower.contains("agm") { return "agm" }
        return nil
    }

    private var questionCount: Int { panel.question_count ?? 0 }

    var body: some View {
        HStack(spacing: 0) {
            Rectangle()
                .fill(accentColor)
                .frame(width: 4)

            VStack(alignment: .leading, spacing: 10) {
                // Top meta row — time on the left, session group label
                // (when known) trailing it.
                HStack(spacing: 10) {
                    if let t = panel.start_time, let e = panel.end_time {
                        Text("\(t.shortTime) – \(e.shortTime)")
                            .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            .foregroundStyle(Color.ficaMuted)
                    }
                    if let group = SessionGroup(raw: sessionGroupRaw) {
                        Text(group.label.uppercased())
                            .font(.system(size: 10, weight: .bold))
                            .tracking(0.6)
                            .foregroundStyle(accentColor)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(accentColor.opacity(0.1))
                            .clipShape(Capsule())
                    }
                    Spacer(minLength: 0)
                    // Status dot — quiet indicator that matches iOS status
                    // chips elsewhere in the app.
                    HStack(spacing: 4) {
                        Circle()
                            .fill(panel.isDiscussionEnabled ? Color.ficaSuccess : Color.ficaDanger)
                            .frame(width: 6, height: 6)
                        Text(panel.isDiscussionEnabled ? "Open" : "Closed")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(panel.isDiscussionEnabled ? Color.ficaSuccess : Color.ficaDanger)
                    }
                }

                // Title
                Text(panel.title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color.ficaText)
                    .fixedSize(horizontal: false, vertical: true)
                    .multilineTextAlignment(.leading)

                // Room
                if let room = panel.room, !room.isEmpty {
                    InfoChip(icon: "mappin", text: room, color: .ficaMuted)
                }

                // Speaker (optional — small inline)
                if let name = panel.speaker_name {
                    HStack(spacing: 8) {
                        AvatarView(name: name, photo: panel.speaker_photo, size: 24, borderColor: .ficaBorder, borderWidth: 1)
                        Text(name)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Color.ficaSecondary)
                            .lineLimit(1)
                        if let title = panel.speaker_title, !title.isEmpty {
                            Text("·")
                                .font(.system(size: 11))
                                .foregroundStyle(Color.ficaMuted)
                            Text(title)
                                .font(.system(size: 11))
                                .foregroundStyle(Color.ficaMuted)
                                .lineLimit(1)
                        }
                    }
                }

                // Footer — divider + Q&A call to action. Uses the accent
                // color so it clearly reads as this panel's specific
                // discussion (not just another generic pill).
                Rectangle()
                    .fill(Color.ficaBorder.opacity(0.5))
                    .frame(height: 0.5)
                    .padding(.top, 2)

                HStack(spacing: 10) {
                    HStack(spacing: 6) {
                        Image(systemName: "text.bubble.fill")
                            .font(.system(size: 12))
                        Text(questionCount == 0
                             ? "Start the discussion"
                             : "\(questionCount) question\(questionCount == 1 ? "" : "s")")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundStyle(accentColor)

                    Spacer(minLength: 0)

                    if panel.isPanelMember {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 10, weight: .bold))
                            Text("You're on this panel")
                                .font(.system(size: 11, weight: .bold))
                        }
                        .foregroundStyle(Color.ficaGold)
                    }

                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Color.ficaMuted)
                }
            }
            .padding(16)
        }
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 3)
        .opacity(panel.isDiscussionEnabled ? 1 : 0.85)
    }
}
