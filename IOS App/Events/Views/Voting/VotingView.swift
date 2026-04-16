import SwiftUI

struct VotingView: View {
    @State private var projects: [Project] = []
    @State private var isLoading = true
    @State private var hasVoted = false
    @State private var myVoteProjectId: Int? = nil
    @State private var votingOpen = false
    /// Whether vote tallies are revealed to delegates. When false the
    /// backend also zeroes out vote_count on every project, so treating
    /// this purely in UI is safe — no stale data leaks.
    @State private var resultsVisible = false
    @State private var isVoting = false
    @State private var errorMessage: String? = nil
    @State private var showResults = false
    @State private var selectedProject: Project? = nil
    @State private var wsOpenToken: UUID?
    @State private var wsResultsToken: UUID?

    private var sortedByVotes: [Project] {
        projects.sorted { ($0.vote_count ?? 0) > ($1.vote_count ?? 0) }
    }

    private var maxVotes: Int {
        max(sortedByVotes.first?.vote_count ?? 0, 1)
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                if isLoading {
                    LoadingView()
                } else if projects.isEmpty {
                    EmptyStateView(icon: "trophy", title: "No projects yet", subtitle: "Check back soon for project voting")
                } else {
                    VStack(spacing: 16) {
                        statusBanner

                        // Hide the Projects/Results tab toggle when
                        // results aren't public — delegates just see the
                        // project list. The admin leaderboard is
                        // unaffected; this is only the delegate view.
                        if resultsVisible {
                            tabToggle
                            if showResults {
                                resultsSection
                            } else {
                                projectsList
                            }
                        } else {
                            projectsList
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 20)
                }
            }
            .background(Color.ficaBg)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Project Voting")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Color.ficaText)
                }
            }
            .refreshable { await load() }
            .task { await load() }
            .onAppear { subscribeLiveUpdates() }
            .onDisappear { unsubscribeLiveUpdates() }
            .sheet(item: $selectedProject) { project in
                ProjectDetailSheet(
                    project: project,
                    votingOpen: votingOpen,
                    hasVoted: hasVoted,
                    isMyVote: myVoteProjectId == project.id,
                    isVoting: isVoting,
                    resultsVisible: resultsVisible,
                    onVote: { await vote(for: project) },
                    onDismiss: { selectedProject = nil }
                )
            }
        }
    }

    // MARK: - Status Banner

    private var statusBanner: some View {
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                Circle()
                    .fill(votingOpen ? Color.ficaSuccess : Color.ficaDanger)
                    .frame(width: 8, height: 8)
                Text(votingOpen ? "Voting is Open" : "Voting is Closed")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(votingOpen ? Color.ficaSuccess : Color.ficaDanger)
                Spacer()
                // Show total votes only when results are public; otherwise
                // explain that the tally will be revealed after voting.
                if resultsVisible {
                    Text("\(projects.reduce(0) { $0 + ($1.vote_count ?? 0) }) total votes")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.ficaSecondary)
                } else {
                    HStack(spacing: 4) {
                        Image(systemName: "eye.slash")
                            .font(.system(size: 10))
                        Text("Results hidden")
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundStyle(Color.ficaMuted)
                }
            }

            if hasVoted, let votedId = myVoteProjectId,
               let votedProject = projects.first(where: { $0.id == votedId }) {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.ficaSuccess)
                    Text("You voted for **\(votedProject.name)**")
                        .font(.system(size: 12))
                        .foregroundStyle(Color.ficaSecondary)
                    Spacer()
                }
            }

            if let error = errorMessage {
                HStack(spacing: 6) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(Color.ficaDanger)
                    Text(error)
                        .font(.system(size: 12))
                        .foregroundStyle(Color.ficaDanger)
                    Spacer()
                }
            }
        }
        .ficaCard(padding: 14)
    }

    // MARK: - Tab Toggle

    private var tabToggle: some View {
        HStack(spacing: 0) {
            tabButton(title: "Projects", icon: "trophy.fill", selected: !showResults) {
                withAnimation(.easeInOut(duration: 0.2)) { showResults = false }
            }
            tabButton(title: "Results", icon: "chart.bar.fill", selected: showResults) {
                withAnimation(.easeInOut(duration: 0.2)) { showResults = true }
            }
        }
        .background(Color.ficaInputBg)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func tabButton(title: String, icon: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 12))
                Text(title).font(.system(size: 13, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(selected ? Color.ficaCard : Color.clear)
            .foregroundStyle(selected ? Color.ficaText : Color.ficaMuted)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .shadow(color: selected ? .black.opacity(0.06) : .clear, radius: 4, x: 0, y: 2)
        }
        .buttonStyle(.plain)
        .padding(3)
    }

    // MARK: - Projects List

    private var projectsList: some View {
        VStack(spacing: 14) {
            ForEach(projects) { project in
                Button {
                    selectedProject = project
                } label: {
                    projectCard(project)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func projectCard(_ project: Project) -> some View {
        let catColor = ProjectCategory.color(for: project.category)
        let isMyVote = myVoteProjectId == project.id

        return VStack(alignment: .leading, spacing: 0) {
            // Image
            ZStack(alignment: .bottomTrailing) {
                if let imageUrl = project.image_url, !imageUrl.isEmpty, let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            categoryPlaceholder(project.category)
                        }
                    }
                    .frame(height: 140)
                    .frame(maxWidth: .infinity)
                    .clipped()
                } else {
                    categoryPlaceholder(project.category)
                        .frame(height: 100)
                        .frame(maxWidth: .infinity)
                }

                // Vote count pill overlay — only when results are public.
                if resultsVisible {
                    HStack(spacing: 4) {
                        Image(systemName: "chart.bar.fill").font(.system(size: 9))
                        Text("\(project.vote_count ?? 0)")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.ultraThinMaterial)
                    .clipShape(Capsule())
                    .padding(8)
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                // Name
                Text(project.name)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(Color.ficaText)
                    .lineLimit(2)

                // Team
                if let team = project.team, !team.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "person.2.fill").font(.system(size: 9))
                        Text(team).font(.system(size: 12, weight: .medium))
                    }
                    .foregroundStyle(Color.ficaSecondary)
                }

                // Category badge
                HStack(spacing: 4) {
                    Image(systemName: ProjectCategory.symbol(for: project.category))
                        .font(.system(size: 9))
                    Text(project.category?.capitalized ?? "Other")
                        .font(.system(size: 10, weight: .semibold))
                }
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background(catColor.opacity(0.12))
                .foregroundStyle(catColor)
                .clipShape(Capsule())

                // Tap hint + vote status
                HStack {
                    Text("Tap to view details")
                        .font(.system(size: 11))
                        .foregroundStyle(Color.ficaMuted)
                    Spacer()
                    if isMyVote {
                        HStack(spacing: 3) {
                            Image(systemName: "checkmark.circle.fill").font(.system(size: 11))
                            Text("Your Vote").font(.system(size: 11, weight: .semibold))
                        }
                        .foregroundStyle(Color.ficaSuccess)
                    } else {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Color.ficaMuted)
                    }
                }
                .padding(.top, 2)
            }
            .padding(14)
        }
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(isMyVote ? Color.ficaSuccess.opacity(0.4) : Color.clear, lineWidth: 2)
        )
    }

    private func categoryPlaceholder(_ category: String?) -> some View {
        ZStack {
            ProjectCategory.color(for: category).opacity(0.1)
            Image(systemName: ProjectCategory.symbol(for: category))
                .font(.system(size: 32))
                .foregroundStyle(ProjectCategory.color(for: category).opacity(0.5))
        }
    }

    // MARK: - Results Section

    private var resultsSection: some View {
        VStack(spacing: 12) {
            ForEach(Array(sortedByVotes.enumerated()), id: \.element.id) { index, project in
                let pct = maxVotes > 0 ? CGFloat(project.vote_count ?? 0) / CGFloat(maxVotes) : 0

                Button {
                    selectedProject = project
                } label: {
                    HStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(index == 0 && (project.vote_count ?? 0) > 0 ? Color.ficaGold :
                                      index == 1 ? Color.gray.opacity(0.3) :
                                      index == 2 ? Color.orange.opacity(0.3) :
                                      Color.ficaInputBg)
                                .frame(width: 36, height: 36)
                            if index == 0 && (project.vote_count ?? 0) > 0 {
                                Image(systemName: "trophy.fill")
                                    .font(.system(size: 14))
                                    .foregroundStyle(.white)
                            } else {
                                Text("#\(index + 1)")
                                    .font(.system(size: 13, weight: .bold, design: .rounded))
                                    .foregroundStyle(index < 3 ? Color.ficaText : Color.ficaSecondary)
                            }
                        }

                        VStack(alignment: .leading, spacing: 5) {
                            HStack(spacing: 6) {
                                Text(project.name)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Color.ficaText)
                                    .lineLimit(1)
                                if let team = project.team, !team.isEmpty {
                                    Text(team)
                                        .font(.system(size: 11))
                                        .foregroundStyle(Color.ficaMuted)
                                        .lineLimit(1)
                                }
                            }

                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 3, style: .continuous)
                                        .fill(Color.ficaInputBg)
                                        .frame(height: 6)
                                    RoundedRectangle(cornerRadius: 3, style: .continuous)
                                        .fill(index == 0 ? Color.ficaGold : Color.ficaNavy)
                                        .frame(width: geo.size.width * pct, height: 6)
                                }
                            }
                            .frame(height: 6)
                        }

                        Text("\(project.vote_count ?? 0)")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.ficaText)
                            .frame(minWidth: 30, alignment: .trailing)
                    }
                    .ficaCard(padding: 12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(myVoteProjectId == project.id ? Color.ficaSuccess.opacity(0.4) : Color.clear, lineWidth: 1.5)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Actions

    private func load() async {
        isLoading = projects.isEmpty
        errorMessage = nil
        do {
            let resp = try await APIService.shared.getProjects()
            projects = resp.projects
            hasVoted = resp.has_voted
            myVoteProjectId = resp.my_vote_project_id
            votingOpen = resp.voting_open
            resultsVisible = resp.voting_results_visible ?? false
            // If admin just closed results while the user was on the Results
            // tab, bounce them back to Projects so they don't see an empty /
            // blocked tab.
            if !resultsVisible && showResults { showResults = false }
        } catch {
            if projects.isEmpty {
                errorMessage = error.localizedDescription
            }
        }
        isLoading = false
    }

    // MARK: - Live updates

    private func subscribeLiveUpdates() {
        if wsOpenToken == nil {
            wsOpenToken = ChatWebSocket.shared.addVotingOpenHandler { open in
                withAnimation(.easeInOut(duration: 0.2)) { votingOpen = open }
            }
        }
        if wsResultsToken == nil {
            wsResultsToken = ChatWebSocket.shared.addVotingResultsHandler { visible in
                withAnimation(.easeInOut(duration: 0.2)) {
                    resultsVisible = visible
                    if !visible && showResults { showResults = false }
                }
                // Counts in `projects` are still zero from the last fetch
                // when hidden → visible; pull fresh data so real tallies
                // appear without a manual refresh.
                if visible {
                    Task { await load() }
                }
            }
        }
    }

    private func unsubscribeLiveUpdates() {
        if let t = wsOpenToken { ChatWebSocket.shared.removeVotingOpenHandler(t); wsOpenToken = nil }
        if let t = wsResultsToken { ChatWebSocket.shared.removeVotingResultsHandler(t); wsResultsToken = nil }
    }

    private func vote(for project: Project) async {
        isVoting = true
        errorMessage = nil
        do {
            let _ = try await APIService.shared.castVote(projectId: project.id)
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
        isVoting = false
    }
}

// MARK: - Project Detail Sheet

struct ProjectDetailSheet: View {
    let project: Project
    let votingOpen: Bool
    let hasVoted: Bool
    let isMyVote: Bool
    let isVoting: Bool
    /// Whether vote tallies are revealed — drives whether the Votes
    /// stat item is shown. Hidden by default.
    var resultsVisible: Bool = false
    let onVote: () async -> Void
    let onDismiss: () -> Void

    @State private var showConfirm = false

    private var catColor: Color { ProjectCategory.color(for: project.category) }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    // Hero image
                    ZStack(alignment: .bottomLeading) {
                        if let imageUrl = project.image_url, !imageUrl.isEmpty, let url = URL(string: imageUrl) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let image):
                                    image.resizable().aspectRatio(contentMode: .fill)
                                default:
                                    heroPlaceholder
                                }
                            }
                            .frame(height: 220)
                            .frame(maxWidth: .infinity)
                            .clipped()
                        } else {
                            heroPlaceholder
                                .frame(height: 180)
                                .frame(maxWidth: .infinity)
                        }

                        // Gradient overlay
                        LinearGradient(colors: [.clear, .black.opacity(0.6)], startPoint: .top, endPoint: .bottom)
                            .frame(height: 100)
                            .frame(maxWidth: .infinity, alignment: .bottom)

                        // Category badge on image
                        HStack(spacing: 5) {
                            Image(systemName: ProjectCategory.symbol(for: project.category))
                                .font(.system(size: 11))
                            Text(project.category?.capitalized ?? "Other")
                                .font(.system(size: 12, weight: .bold))
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(.ultraThinMaterial)
                        .clipShape(Capsule())
                        .padding(16)
                    }

                    VStack(alignment: .leading, spacing: 20) {
                        // Title & Team
                        VStack(alignment: .leading, spacing: 6) {
                            Text(project.name)
                                .font(.system(size: 22, weight: .bold))
                                .foregroundStyle(Color.ficaText)

                            if let team = project.team, !team.isEmpty {
                                HStack(spacing: 6) {
                                    Image(systemName: "person.2.fill")
                                        .font(.system(size: 12))
                                    Text(team)
                                        .font(.system(size: 14, weight: .medium))
                                }
                                .foregroundStyle(Color.ficaSecondary)
                            }
                        }

                        // Stats row — Votes column only shown when admin
                        // has revealed results to delegates.
                        HStack(spacing: 0) {
                            if resultsVisible {
                                statItem(value: "\(project.vote_count ?? 0)", label: "Votes", icon: "chart.bar.fill")
                                Divider().frame(height: 30)
                            }
                            statItem(value: project.category?.capitalized ?? "—", label: "Category", icon: ProjectCategory.symbol(for: project.category))
                        }
                        .ficaCard(padding: 12)

                        // Description
                        if let desc = project.description, !desc.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Label("About this Project", systemImage: "doc.text.fill")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(Color.ficaText)

                                Text(desc)
                                    .font(.system(size: 15))
                                    .foregroundStyle(Color.ficaSecondary)
                                    .lineSpacing(4)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .ficaCard(padding: 16)
                        }

                        // Vote action
                        if votingOpen {
                            voteActionSection
                        } else {
                            HStack(spacing: 8) {
                                Image(systemName: "lock.fill")
                                    .font(.system(size: 13))
                                Text("Voting is currently closed")
                                    .font(.system(size: 14, weight: .medium))
                            }
                            .foregroundStyle(Color.ficaSecondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.ficaInputBg)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                    }
                    .padding(20)
                    .padding(.bottom, 20)
                }
            }
            .background(Color.ficaBg)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Project Details")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Color.ficaText)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { onDismiss() }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color.ficaGold)
                }
            }
            .alert("Vote for Project", isPresented: $showConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Confirm Vote") {
                    Task { await onVote() }
                }
            } message: {
                Text("Cast your vote for \"\(project.name)\"?\(hasVoted ? " This will change your current vote." : "")")
            }
        }
    }

    // MARK: - Vote Action

    @ViewBuilder
    private var voteActionSection: some View {
        if isMyVote {
            HStack(spacing: 8) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 18))
                VStack(alignment: .leading, spacing: 2) {
                    Text("You voted for this project")
                        .font(.system(size: 15, weight: .bold))
                    Text("Your vote has been recorded")
                        .font(.system(size: 12))
                        .foregroundStyle(Color.ficaSuccess.opacity(0.8))
                }
                Spacer()
            }
            .foregroundStyle(Color.ficaSuccess)
            .padding(16)
            .background(Color.ficaSuccess.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Color.ficaSuccess.opacity(0.2), lineWidth: 1)
            )
        } else {
            VStack(spacing: 10) {
                Button {
                    showConfirm = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: hasVoted ? "arrow.triangle.2.circlepath" : "hand.thumbsup.fill")
                            .font(.system(size: 16))
                        Text(hasVoted ? "Change Vote to this Project" : "Vote for this Project")
                            .font(.system(size: 16, weight: .bold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background {
                        if hasVoted {
                            AnyView(Color.ficaInputBg)
                        } else {
                            AnyView(LinearGradient.ficaGoldShimmer)
                        }
                    }
                    .foregroundStyle(hasVoted ? Color.ficaText : Color.ficaDark)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .shadow(color: hasVoted ? .clear : .ficaGold.opacity(0.3), radius: 12, y: 6)
                }
                .buttonStyle(.plain)
                .disabled(isVoting)

                if hasVoted {
                    Text("This will replace your current vote")
                        .font(.system(size: 11))
                        .foregroundStyle(Color.ficaMuted)
                }
            }
        }
    }

    // MARK: - Helpers

    private func statItem(value: String, label: String, icon: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(catColor)
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(Color.ficaText)
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(Color.ficaMuted)
        }
        .frame(maxWidth: .infinity)
    }

    private var heroPlaceholder: some View {
        ZStack {
            LinearGradient(colors: [catColor.opacity(0.15), catColor.opacity(0.05)], startPoint: .topLeading, endPoint: .bottomTrailing)
            Image(systemName: ProjectCategory.symbol(for: project.category))
                .font(.system(size: 48))
                .foregroundStyle(catColor.opacity(0.4))
        }
    }
}
