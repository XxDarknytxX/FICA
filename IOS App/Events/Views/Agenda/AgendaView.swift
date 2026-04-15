import SwiftUI

struct AgendaView: View {
    @State private var sessions: [Session] = []
    @State private var isLoading = true
    @State private var selectedCongress: CongressYear = .y2026
    @State private var selectedDay: String = "2026-05-08"
    @State private var selectedType: String? = nil

    private let types: [(String?, String)] = [(nil, "All"), ("keynote", "Keynote"), ("panel", "Panel"), ("ceremony", "Ceremony"), ("networking", "Social"), ("break", "Break")]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Congress year picker
                Picker("Congress", selection: $selectedCongress) {
                    ForEach(CongressYear.allCases) { year in
                        Text(year.label).tag(year)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 20)
                .padding(.top, 10)
                .padding(.bottom, 4)
                .onChange(of: selectedCongress) { _, newYear in
                    selectedDay = newYear.dayDates.first?.0 ?? ""
                    selectedType = nil
                    Task { await loadSessions() }
                }

                // Day picker
                HStack(spacing: 10) {
                    ForEach(selectedCongress.dayDates, id: \.0) { day in
                        Button { withAnimation(.easeInOut(duration: 0.2)) { selectedDay = day.0 } } label: {
                            VStack(spacing: 2) {
                                Text(day.1).font(.system(size: 14, weight: .bold))
                                Text(day.2).font(.system(size: 11, weight: .medium))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(selectedDay == day.0 ? Color.ficaNavy : Color.ficaCard)
                            .foregroundStyle(selectedDay == day.0 ? .white : Color.ficaSecondary)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .shadow(color: selectedDay == day.0 ? .ficaNavy.opacity(0.25) : .clear, radius: 6, y: 3)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)

                // Type chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(types, id: \.1) { t in
                            Button { withAnimation { selectedType = t.0 } } label: {
                                Text(t.1)
                                    .font(.system(size: 12, weight: .semibold))
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 7)
                                    .background(selectedType == t.0 ? Color.ficaNavy.opacity(0.1) : Color.ficaCard)
                                    .foregroundStyle(selectedType == t.0 ? Color.ficaNavy : Color.ficaMuted)
                                    .clipShape(Capsule())
                                    .overlay(Capsule().stroke(selectedType == t.0 ? Color.ficaNavy.opacity(0.3) : Color.ficaBorder, lineWidth: 1))
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.bottom, 10)

                // Sessions grouped by session_group — wrap in a frame that always
                // fills the remaining vertical space so the top controls stay
                // anchored even on the first render before data lands.
                Group {
                    if isLoading {
                        LoadingView(message: "Loading agenda...")
                    } else {
                        ScrollView(showsIndicators: false) {
                            LazyVStack(spacing: 10) {
                                let grouped = groupedSessions
                                if grouped.isEmpty {
                                    EmptyStateView(icon: "calendar.badge.exclamationmark", title: "No sessions found", subtitle: "Try a different filter")
                                } else {
                                    let seenGroups = seenGroupSet(grouped)
                                    ForEach(Array(grouped.enumerated()), id: \.element.key) { idx, section in
                                        // Only show header on first occurrence of each group
                                        if let group = section.group, !seenGroups[idx] {
                                            SessionGroupHeader(group: group, congress: selectedCongress)
                                        }
                                        ForEach(section.sessions) { s in
                                            SessionCard(session: s)
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.bottom, 20)
                        }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(Color.ficaBg)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Agenda")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Color.ficaText)
                }
            }
            .refreshable { await loadSessions() }
            .task { await loadSessions() }
        }
    }

    // MARK: - Grouped Data

    private struct SessionSection {
        let key: String
        let group: SessionGroup?
        let sessions: [Session]
    }

    private var groupedSessions: [SessionSection] {
        let daySessions = sessions
            .filter { ($0.session_date ?? "").hasPrefix(selectedDay) }
            .filter { selectedType == nil || $0.session_type?.lowercased() == selectedType }
            .sorted { ($0.start_time ?? "") < ($1.start_time ?? "") }

        // Walk in time order, emit a new section when the group changes
        var sections: [SessionSection] = []
        var currentKey: String = ""
        var currentItems: [Session] = []

        for s in daySessions {
            let key = s.session_group ?? "_ungrouped_\(s.id)"
            let groupKey = s.session_group ?? "_u"

            // Start a new section when the group changes
            if groupKey != currentKey {
                if !currentItems.isEmpty {
                    let prevGroup = SessionGroup(raw: currentKey == "_u" ? nil : currentKey)
                    sections.append(SessionSection(key: currentKey + "_\(sections.count)", group: prevGroup, sessions: currentItems))
                    currentItems = []
                }
                currentKey = groupKey
            }
            currentItems.append(s)
        }
        // Flush last section
        if !currentItems.isEmpty {
            let group = SessionGroup(raw: currentKey == "_u" ? nil : currentKey)
            sections.append(SessionSection(key: currentKey + "_\(sections.count)", group: group, sessions: currentItems))
        }

        return sections
    }

    /// Returns an array where `true` means this section's group was already shown earlier.
    private func seenGroupSet(_ sections: [SessionSection]) -> [Bool] {
        var seen = Set<String>()
        return sections.map { section in
            guard let group = section.group else { return false }
            let key = group.label
            if seen.contains(key) { return true }
            seen.insert(key)
            return false
        }
    }

    private func loadSessions() async {
        isLoading = sessions.isEmpty
        sessions = (try? await APIService.shared.getSessions(year: selectedCongress.rawValue)) ?? []
        isLoading = false
    }
}

// MARK: - Session Group Header

struct SessionGroupHeader: View {
    let group: SessionGroup
    let congress: CongressYear

    var body: some View {
        VStack(spacing: 0) {
            // Thin divider
            Rectangle()
                .fill(Color.ficaBorder)
                .frame(height: 0.5)
                .padding(.top, 16)
                .padding(.bottom, 12)

            HStack(spacing: 10) {
                // Small colored dot
                Circle()
                    .fill(group.color)
                    .frame(width: 8, height: 8)

                VStack(alignment: .leading, spacing: 2) {
                    Text(group.label.uppercased())
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color.ficaMuted)
                        .tracking(0.8)
                    if let sub = group.subtitle(for: congress) {
                        Text(sub)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Color.ficaSecondary)
                    }
                }
                Spacer()
            }
            .padding(.bottom, 6)
        }
    }
}

// MARK: - Session Card

struct SessionCard: View {
    let session: Session
    @State private var expanded = false
    @State private var truncated = false

    private var accentColor: Color {
        if let group = SessionGroup(raw: session.session_group) {
            return group.color
        }
        return SessionType.color(for: session.session_type)
    }

    var body: some View {
        HStack(spacing: 0) {
            Rectangle()
                .fill(accentColor)
                .frame(width: 4)

            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    HStack(spacing: 6) {
                        Image(systemName: SessionType.symbol(for: session.session_type))
                            .font(.system(size: 11, weight: .semibold))
                        Text(session.session_type?.capitalized ?? "Session")
                            .font(.system(size: 11, weight: .bold))
                    }
                    .foregroundStyle(accentColor)
                    Spacer()
                    if let t = session.start_time, let e = session.end_time {
                        Text("\(t.shortTime) – \(e.shortTime)")
                            .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            .foregroundStyle(Color.ficaMuted)
                    }
                }

                Text(session.title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color.ficaText)
                    .fixedSize(horizontal: false, vertical: true)

                if let loc = session.location, !loc.isEmpty {
                    InfoChip(icon: "mappin", text: loc, color: .ficaMuted)
                }

                if let name = session.speaker_name {
                    HStack(spacing: 8) {
                        AvatarView(name: name, photo: session.speaker_photo, size: 28, borderColor: .ficaBorder, borderWidth: 1)
                        VStack(alignment: .leading, spacing: 0) {
                            Text(name).font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.ficaText)
                            if let t = session.speaker_title {
                                Text(t).font(.system(size: 10)).foregroundStyle(Color.ficaMuted).lineLimit(1)
                            }
                        }
                    }
                }

                if let desc = session.description, !desc.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(desc)
                            .font(.system(size: 12))
                            .foregroundStyle(Color.ficaSecondary)
                            .lineLimit(expanded ? nil : 2)
                            .multilineTextAlignment(.leading)
                            .background(GeometryReader { geo in
                                Color.clear.onAppear { truncated = isTruncated(geo: geo, text: desc) }
                            })
                        if truncated {
                            Button { withAnimation(.easeInOut(duration: 0.2)) { expanded.toggle() } } label: {
                                Text(expanded ? "Show less" : "Read more")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(Color.ficaGold)
                            }
                        }
                    }
                }
            }
            .padding(16)
        }
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 3)
    }

    private func isTruncated(geo: GeometryProxy, text: String) -> Bool {
        let font = UIFont.systemFont(ofSize: 12)
        let attributes: [NSAttributedString.Key: Any] = [.font: font]
        let size = (text as NSString).boundingRect(
            with: CGSize(width: geo.size.width, height: .greatestFiniteMagnitude),
            options: .usesLineFragmentOrigin,
            attributes: attributes,
            context: nil
        )
        let lineHeight = font.lineHeight
        return size.height > lineHeight * 2.2
    }
}
