import SwiftUI

/// Q&A board for a single panel. Header is a full-width hero (no card)
/// that carries the panel's identity; below it is a conversation-style
/// feed of questions where each row is a chat bubble rather than another
/// generic card. Composer is pinned to the bottom and self-gates on the
/// combined (per-panel AND response-level) `discussionEnabled` flag.
struct PanelDetailView: View {
    let panel: Panel
    /// Initial discussion state passed in from the list. Tracked as local
    /// state so live WebSocket toggles from admin can update the composer
    /// without having to navigate away + back.
    let initialDiscussionEnabled: Bool

    @State private var discussionEnabled: Bool
    @State private var questions: [PanelQuestion] = []
    @State private var isLoading = true
    @State private var draft = ""
    @State private var isPosting = false
    @State private var postError: String?
    @State private var wsHandlerToken: UUID?
    @FocusState private var composerFocused: Bool

    init(panel: Panel, discussionEnabled: Bool) {
        self.panel = panel
        self.initialDiscussionEnabled = discussionEnabled
        self._discussionEnabled = State(initialValue: discussionEnabled)
    }

    private var accentColor: Color {
        if let group = SessionGroup(raw: sessionGroupRaw) {
            return group.color
        }
        return .ficaNavy
    }

    private var sessionGroupRaw: String? {
        let lower = panel.title.lowercased()
        if lower.contains("session 1") || lower.contains("positioning") { return "session1" }
        if lower.contains("session 2") || lower.contains("transforming") { return "session2" }
        if lower.contains("session 3") || lower.contains("global standards") || lower.contains("governance") { return "session3" }
        if lower.contains("opening") { return "opening" }
        if lower.contains("agm") { return "agm" }
        return nil
    }

    private var canSubmit: Bool {
        discussionEnabled
            && !isPosting
            && !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    hero
                    feed
                    // Bottom padding so the last question doesn't hide
                    // under the composer.
                    Spacer().frame(height: 120)
                }
            }
            .refreshable { await loadQuestions() }

            composer
        }
        .background(Color.ficaBg)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 1) {
                    Text("Discussion")
                        .font(.system(size: 10, weight: .bold))
                        .tracking(0.6)
                        .foregroundStyle(Color.ficaMuted)
                        .textCase(.uppercase)
                    Text(panel.title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.ficaText)
                        .lineLimit(1)
                }
            }
        }
        .task { await loadQuestions() }
        .onAppear { subscribeToLiveUpdates() }
        .onDisappear { unsubscribeFromLiveUpdates() }
    }

    // MARK: - Live updates

    private func subscribeToLiveUpdates() {
        guard wsHandlerToken == nil else { return }
        wsHandlerToken = ChatWebSocket.shared.addPanelDiscussionHandler { [panelId = panel.id] sessionId, enabled in
            // Only react to events for the panel we're currently viewing.
            guard sessionId == panelId else { return }
            withAnimation(.easeInOut(duration: 0.2)) {
                discussionEnabled = enabled
                // Clear any stale "closed" error message if we just opened.
                if enabled { postError = nil }
            }
        }
    }

    private func unsubscribeFromLiveUpdates() {
        if let token = wsHandlerToken {
            ChatWebSocket.shared.removePanelDiscussionHandler(token)
            wsHandlerToken = nil
        }
    }

    // MARK: - Hero

    private var hero: some View {
        // Full-width header that carries the accent color at the top edge.
        // Not a card — flows into the feed below.
        VStack(alignment: .leading, spacing: 14) {
            // Accent stripe + session group label pill.
            HStack(spacing: 8) {
                Rectangle()
                    .fill(accentColor)
                    .frame(width: 20, height: 3)
                if let group = SessionGroup(raw: sessionGroupRaw) {
                    Text(group.label.uppercased())
                        .font(.system(size: 10, weight: .bold))
                        .tracking(0.6)
                        .foregroundStyle(accentColor)
                } else {
                    Text("PANEL DISCUSSION")
                        .font(.system(size: 10, weight: .bold))
                        .tracking(0.6)
                        .foregroundStyle(accentColor)
                }
                Spacer()
                // Status chip at top-right
                HStack(spacing: 4) {
                    Circle()
                        .fill(discussionEnabled ? Color.ficaSuccess : Color.ficaDanger)
                        .frame(width: 6, height: 6)
                    Text(discussionEnabled ? "Open for questions" : "Closed")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(discussionEnabled ? Color.ficaSuccess : Color.ficaDanger)
                }
            }

            // Title
            Text(panel.title)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(Color.ficaText)
                .fixedSize(horizontal: false, vertical: true)

            // Meta row — time + room
            HStack(spacing: 14) {
                if let t = panel.start_time, let e = panel.end_time {
                    Label("\(t.shortTime) – \(e.shortTime)", systemImage: "clock")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.ficaSecondary)
                        .labelStyle(.titleAndIcon)
                }
                if let room = panel.room, !room.isEmpty {
                    Label(room, systemImage: "mappin")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.ficaSecondary)
                        .labelStyle(.titleAndIcon)
                }
            }

            // Speaker / moderator
            if panel.speaker_name != nil || !(panel.moderator ?? "").isEmpty {
                HStack(spacing: 14) {
                    if let name = panel.speaker_name {
                        HStack(spacing: 10) {
                            AvatarView(name: name, photo: panel.speaker_photo, size: 36, borderColor: .ficaBorder, borderWidth: 1)
                            VStack(alignment: .leading, spacing: 0) {
                                Text(name)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(Color.ficaText)
                                if let role = panel.speaker_title ?? panel.speaker_org {
                                    Text(role)
                                        .font(.system(size: 11))
                                        .foregroundStyle(Color.ficaMuted)
                                        .lineLimit(1)
                                }
                            }
                        }
                    }
                    if let moderator = panel.moderator, !moderator.isEmpty {
                        Divider().frame(height: 28)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("MODERATOR")
                                .font(.system(size: 9, weight: .bold))
                                .tracking(0.6)
                                .foregroundStyle(Color.ficaMuted)
                            Text(moderator)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color.ficaSecondary)
                                .lineLimit(1)
                        }
                    }
                }
            }

            // Description
            if let desc = panel.description, !desc.isEmpty {
                Text(desc)
                    .font(.system(size: 13))
                    .foregroundStyle(Color.ficaSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            // Panel-member callout
            if panel.isPanelMember {
                HStack(spacing: 8) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 11, weight: .semibold))
                    Text("You're on this panel — audience questions appear below.")
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundStyle(Color.ficaGold)
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.ficaGold.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 16)
        .padding(.bottom, 18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.ficaBg)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.ficaBorder.opacity(0.4))
                .frame(height: 0.5)
        }
    }

    // MARK: - Feed

    private var feed: some View {
        VStack(spacing: 0) {
            // Section header
            HStack {
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Color.ficaMuted)
                Text("Questions · \(questions.count)")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(0.6)
                    .foregroundStyle(Color.ficaMuted)
                    .textCase(.uppercase)
                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 14)
            .padding(.bottom, 10)

            Group {
                if isLoading && questions.isEmpty {
                    LoadingView(message: "Loading questions...")
                        .padding(.top, 10)
                } else if questions.isEmpty {
                    emptyFeed
                } else {
                    LazyVStack(spacing: 14) {
                        ForEach(questions) { q in
                            QuestionBubble(question: q, accent: accentColor)
                        }
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
    }

    private var emptyFeed: some View {
        VStack(spacing: 10) {
            Image(systemName: "text.bubble")
                .font(.system(size: 36, weight: .light))
                .foregroundStyle(Color.ficaBorder)
            Text(questions.isEmpty ? "No questions yet" : "")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color.ficaSecondary)
            Text(discussionEnabled ? "Be the first to ask." : "This panel is closed for new questions.")
                .font(.system(size: 12))
                .foregroundStyle(Color.ficaMuted)
        }
        .padding(.vertical, 40)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Composer

    private var composer: some View {
        VStack(spacing: 0) {
            if let err = postError {
                Text(err)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.ficaDanger)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 20)
                    .padding(.top, 6)
                    .padding(.bottom, 4)
                    .background(Color.ficaDanger.opacity(0.06))
            }

            HStack(alignment: .bottom, spacing: 10) {
                ZStack(alignment: .topLeading) {
                    if draft.isEmpty {
                        Text(discussionEnabled ? "Ask the panel..." : "This panel is closed for new questions")
                            .font(.system(size: 14))
                            .foregroundStyle(Color.ficaMuted.opacity(0.7))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                    }
                    TextField("", text: $draft, axis: .vertical)
                        .font(.system(size: 14))
                        .foregroundStyle(Color.ficaText)
                        .focused($composerFocused)
                        .disabled(!discussionEnabled || isPosting)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .lineLimit(1...5)
                }
                .background(Color.ficaInputBg)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(composerFocused ? accentColor : Color.clear, lineWidth: 1.5)
                )

                Button(action: submit) {
                    ZStack {
                        Circle()
                            .fill(canSubmit ? accentColor : Color.ficaBorder)
                            .frame(width: 42, height: 42)
                            .shadow(
                                color: canSubmit ? accentColor.opacity(0.3) : .clear,
                                radius: 8, y: 3
                            )
                        if isPosting {
                            ProgressView().tint(.white).controlSize(.small)
                        } else {
                            Image(systemName: "arrow.up")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(.white)
                        }
                    }
                }
                .disabled(!canSubmit)
                .animation(.easeInOut(duration: 0.15), value: canSubmit)
            }
            .padding(.horizontal, 16)
            .padding(.top, 10)
            .padding(.bottom, 12)
        }
        .background(
            Color.ficaBg
                .overlay(alignment: .top) {
                    Rectangle()
                        .fill(Color.ficaBorder.opacity(0.4))
                        .frame(height: 0.5)
                }
        )
    }

    // MARK: - Actions

    private func loadQuestions() async {
        do {
            questions = try await APIService.shared.getPanelQuestions(sessionId: panel.id)
        } catch {
            // Leave existing questions in place on error.
        }
        isLoading = false
    }

    private func submit() {
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard canSubmit, !trimmed.isEmpty else { return }
        isPosting = true
        postError = nil
        Task {
            do {
                let inserted = try await APIService.shared.postPanelQuestion(sessionId: panel.id, question: trimmed)
                withAnimation(.easeOut(duration: 0.25)) {
                    questions.insert(inserted, at: 0)
                }
                draft = ""
                composerFocused = false
            } catch {
                postError = error.localizedDescription
            }
            isPosting = false
        }
    }
}

// MARK: - Question bubble

/// Each question rendered as a conversation bubble: small avatar on the
/// left, name + timestamp header above an indented message card with a
/// subtle tinted background. Panel-member questions get the accent color;
/// audience questions sit in a neutral muted bubble so panelists can scan
/// who's who at a glance.
private struct QuestionBubble: View {
    let question: PanelQuestion
    let accent: Color

    private var bubbleBackground: Color {
        question.isPanelMember ? accent.opacity(0.08) : Color.ficaCard
    }

    private var bubbleBorder: Color {
        question.isPanelMember ? accent.opacity(0.25) : Color.ficaBorder.opacity(0.4)
    }

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            AvatarView(
                name: question.attendee_name ?? "?",
                photo: question.attendee_photo,
                size: 36,
                borderColor: .ficaBorder,
                borderWidth: 1
            )

            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 6) {
                    Text(question.attendee_name ?? "Attendee")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color.ficaText)
                    if question.isPanelMember {
                        Text("Panelist")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(accent)
                            .tracking(0.4)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(accent.opacity(0.15))
                            .clipShape(Capsule())
                    }
                    Spacer(minLength: 0)
                    if let d = question.created_at {
                        Text(d.relativeTime)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Color.ficaMuted)
                    }
                }

                if let org = question.attendee_org, !org.isEmpty {
                    Text(org)
                        .font(.system(size: 10))
                        .foregroundStyle(Color.ficaMuted)
                        .lineLimit(1)
                }

                Text(question.question)
                    .font(.system(size: 14))
                    .foregroundStyle(Color.ficaText)
                    .fixedSize(horizontal: false, vertical: true)
                    .multilineTextAlignment(.leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(bubbleBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(bubbleBorder, lineWidth: 0.5)
                    )
                    .padding(.top, 2)
            }
        }
    }
}
