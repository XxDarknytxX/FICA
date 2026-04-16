import SwiftUI

/// Q&A board for a single panel. Header shows panel context (title, time,
/// speaker, moderator, description). Scrollable list shows every submitted
/// question newest-first with the asker's avatar/name/org and a "Panel
/// Member" chip where applicable. A footer composer posts new questions;
/// it's disabled when `discussionEnabled` is false.
struct PanelDetailView: View {
    let panel: Panel
    let discussionEnabled: Bool

    @State private var questions: [PanelQuestion] = []
    @State private var isLoading = true
    @State private var draft: String = ""
    @State private var isPosting = false
    @State private var postError: String?
    @FocusState private var composerFocused: Bool

    private var canSubmit: Bool {
        discussionEnabled
            && !isPosting
            && !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView(showsIndicators: false) {
                LazyVStack(spacing: 10) {
                    header
                    questionsSection
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 20)
            }
            .refreshable { await loadQuestions() }

            Divider()
            composer
        }
        .background(Color.ficaBg)
        .navigationTitle(panel.title)
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadQuestions() }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .font(.system(size: 11, weight: .semibold))
                Text("Panel")
                    .font(.system(size: 11, weight: .bold))
            }
            .foregroundStyle(Color.ficaNavy)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(Color.ficaNavy.opacity(0.08))
            .clipShape(Capsule())

            Text(panel.title)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(Color.ficaText)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 12) {
                if let start = panel.start_time, let end = panel.end_time {
                    Label("\(start.shortTime) – \(end.shortTime)", systemImage: "clock")
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

            if panel.speaker_name != nil || panel.moderator != nil {
                HStack(spacing: 10) {
                    if let name = panel.speaker_name {
                        HStack(spacing: 8) {
                            AvatarView(name: name, photo: panel.speaker_photo, size: 32, borderColor: .ficaBorder, borderWidth: 1)
                            VStack(alignment: .leading, spacing: 0) {
                                Text(name).font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.ficaText)
                                if let role = panel.speaker_title ?? panel.speaker_org {
                                    Text(role).font(.system(size: 10)).foregroundStyle(Color.ficaMuted).lineLimit(1)
                                }
                            }
                        }
                    }
                    if let moderator = panel.moderator, !moderator.isEmpty {
                        Label("Moderator: \(moderator)", systemImage: "person.wave.2.fill")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color.ficaMuted)
                            .labelStyle(.titleAndIcon)
                    }
                }
            }

            if let desc = panel.description, !desc.isEmpty {
                Text(desc)
                    .font(.system(size: 13))
                    .foregroundStyle(Color.ficaSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if panel.isPanelMember {
                HStack(spacing: 6) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 11, weight: .semibold))
                    Text("You're on this panel — attendee questions appear below.")
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundStyle(Color.ficaGold)
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.ficaGold.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 3)
    }

    // MARK: - Questions

    @ViewBuilder
    private var questionsSection: some View {
        HStack {
            Text("Questions".uppercased())
                .font(.system(size: 11, weight: .bold))
                .tracking(0.8)
                .foregroundStyle(Color.ficaMuted)
            Spacer()
            Text("\(questions.count)")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(Color.ficaMuted)
        }
        .padding(.horizontal, 4)
        .padding(.top, 8)

        if isLoading && questions.isEmpty {
            LoadingView(message: "Loading questions...")
                .padding(.top, 20)
        } else if questions.isEmpty {
            VStack(spacing: 8) {
                Image(systemName: "text.bubble")
                    .font(.system(size: 32, weight: .light))
                    .foregroundStyle(Color.ficaBorder)
                Text("No questions yet")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.ficaSecondary)
                Text(discussionEnabled ? "Be the first to ask." : "The panel is closed for new questions.")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.ficaMuted)
            }
            .padding(.vertical, 32)
            .frame(maxWidth: .infinity)
            .background(Color.ficaCard)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        } else {
            ForEach(questions) { q in
                QuestionRow(question: q)
            }
        }
    }

    // MARK: - Composer

    private var composer: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let err = postError {
                Text(err)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.ficaDanger)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
            }
            HStack(alignment: .bottom, spacing: 10) {
                ZStack(alignment: .topLeading) {
                    if draft.isEmpty {
                        Text(discussionEnabled ? "Ask a question..." : "Panel discussion is currently closed")
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
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                Button(action: submit) {
                    ZStack {
                        Circle()
                            .fill(canSubmit ? Color.ficaNavy : Color.ficaNavy.opacity(0.3))
                            .frame(width: 40, height: 40)
                        if isPosting {
                            ProgressView().tint(.white).controlSize(.small)
                        } else {
                            Image(systemName: "arrow.up")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(.white)
                        }
                    }
                }
                .disabled(!canSubmit)
                .animation(.easeInOut(duration: 0.15), value: canSubmit)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .background(Color.ficaBg)
    }

    // MARK: - Actions

    private func loadQuestions() async {
        do {
            questions = try await APIService.shared.getPanelQuestions(sessionId: panel.id)
        } catch {
            // Leave current list in place on fetch error.
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
                // Prepend optimistically — backend returns newest-first.
                questions.insert(inserted, at: 0)
                draft = ""
                composerFocused = false
            } catch {
                postError = error.localizedDescription
            }
            isPosting = false
        }
    }
}

// MARK: - Question row

private struct QuestionRow: View {
    let question: PanelQuestion

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            AvatarView(
                name: question.attendee_name ?? "?",
                photo: question.attendee_photo,
                size: 36,
                borderColor: .ficaBorder,
                borderWidth: 1
            )
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Text(question.attendee_name ?? "Attendee")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color.ficaText)
                    if question.isPanelMember {
                        Text("Panel Member")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Color.ficaGold)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.ficaGold.opacity(0.12))
                            .clipShape(Capsule())
                    }
                    Spacer()
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
                    .font(.system(size: 13))
                    .foregroundStyle(Color.ficaSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: .black.opacity(0.03), radius: 4, x: 0, y: 2)
    }
}
