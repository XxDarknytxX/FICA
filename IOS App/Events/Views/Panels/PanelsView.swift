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
    @State private var wsHandlerToken: UUID?
    /// Tracks when each panel was most recently flipped to open. Used to
    /// bubble the latest-opened panel to the top of the list — most
    /// recently opened first, then earlier-opened, then everything closed.
    /// Populated on initial load (all currently-open panels share the same
    /// load timestamp) and updated on WS toggles.
    @State private var openedAt: [Int: Date] = [:]

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
            .onAppear { subscribeToLiveUpdates() }
            .onDisappear { unsubscribeFromLiveUpdates() }
        }
    }

    // MARK: - Live updates

    /// Listen for admin toggles broadcast over the shared WebSocket and
    /// patch the matching panel's `discussion_enabled` in-place so the
    /// list reflects the change without a refresh. When a panel opens,
    /// stamp the current time into `openedAt` so it floats to the top.
    private func subscribeToLiveUpdates() {
        guard wsHandlerToken == nil else { return }
        wsHandlerToken = ChatWebSocket.shared.addPanelDiscussionHandler { sessionId, enabled in
            if let idx = panels.firstIndex(where: { $0.id == sessionId }) {
                // Panel is a struct — rebuild the element with the new flag
                // so SwiftUI picks up the change.
                let old = panels[idx]
                let updated = Panel(
                    id: old.id, title: old.title, description: old.description,
                    session_date: old.session_date, start_time: old.start_time, end_time: old.end_time,
                    room: old.room,
                    speaker_name: old.speaker_name, speaker_title: old.speaker_title,
                    speaker_org: old.speaker_org, speaker_photo: old.speaker_photo,
                    moderator: old.moderator, congress_year: old.congress_year,
                    question_count: old.question_count, is_panel_member: old.is_panel_member,
                    discussion_enabled: enabled
                )
                // `.spring` gives the reorder a natural pop — rows slide
                // smoothly rather than snapping when the list re-orders.
                withAnimation(.spring(response: 0.45, dampingFraction: 0.82)) {
                    panels[idx] = updated
                    if enabled {
                        // Stamp "now" so this panel jumps to position 0.
                        openedAt[sessionId] = Date()
                    }
                    // When `enabled == false` we intentionally keep the
                    // prior `openedAt` value around — harmless (closed
                    // panels are sorted by original order anyway) and
                    // means if the admin flips it back on within the
                    // session it retains its previous ordering hint.
                }
            }
        }
    }

    private func unsubscribeFromLiveUpdates() {
        if let token = wsHandlerToken {
            ChatWebSocket.shared.removePanelDiscussionHandler(token)
            wsHandlerToken = nil
        }
    }

    // MARK: - List

    /// Open panels first, most recently opened at the top. Closed panels
    /// fall through to the bottom, in their original chronological order
    /// (by position in the server-returned `panels` array).
    ///
    /// Tie-breakers:
    ///   • two open panels with the same `openedAt` (e.g. both flipped
    ///     open before we started tracking) → original index asc
    ///   • two closed panels → original index asc (schedule order)
    private var sortedPanels: [Panel] {
        let originalIndex = Dictionary(uniqueKeysWithValues: panels.enumerated().map { ($1.id, $0) })
        return panels.sorted { a, b in
            if a.isDiscussionEnabled != b.isDiscussionEnabled {
                // Open panels always beat closed ones.
                return a.isDiscussionEnabled && !b.isDiscussionEnabled
            }
            if a.isDiscussionEnabled && b.isDiscussionEnabled {
                let ta = openedAt[a.id] ?? .distantPast
                let tb = openedAt[b.id] ?? .distantPast
                if ta != tb { return ta > tb }
            }
            // Both closed OR both opened at the same moment — preserve
            // the server's original (schedule) order.
            return (originalIndex[a.id] ?? .max) < (originalIndex[b.id] ?? .max)
        }
    }

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
                ForEach(sortedPanels) { panel in
                    NavigationLink(value: panel) {
                        PanelCard(panel: panel)
                    }
                    .buttonStyle(.plain)
                    // Make the reorder visually obvious instead of a
                    // sudden hop — the row slides into its new slot.
                    .transition(.asymmetric(
                        insertion: .opacity.combined(with: .move(edge: .top)),
                        removal: .opacity
                    ))
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
            // An `animation` modifier on the container makes every row
            // re-animate as the sorted order changes — combined with the
            // `withAnimation` in the WS handler this gives a clean spring.
            .animation(.spring(response: 0.45, dampingFraction: 0.82), value: sortedPanels.map { $0.id })
        }
    }

    private func load() async {
        do {
            let resp = try await APIService.shared.getPanels(year: year)
            withAnimation(.easeInOut(duration: 0.2)) {
                panels = resp.panels
                responseFlag = resp.panel_discussion_enabled
                // Seed openedAt for every currently-open panel so the
                // sort is stable on first render. All get the same
                // timestamp so the original server order (scheduled time)
                // acts as the tie-breaker — that's the intuitive default
                // when multiple panels are already open at launch.
                let now = Date()
                for p in resp.panels where p.isDiscussionEnabled {
                    if openedAt[p.id] == nil { openedAt[p.id] = now }
                }
            }
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
