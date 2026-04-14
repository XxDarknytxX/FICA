import SwiftUI

struct SpeakersView: View {
    @State private var speakers: [Speaker] = []
    @State private var isLoading = true
    @State private var search = ""
    @State private var selectedSpeaker: Speaker?
    @State private var selectedCongress: CongressYear = .y2026

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Congress", selection: $selectedCongress) {
                    ForEach(CongressYear.allCases) { year in
                        Text(year.label).tag(year)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 20)
                .padding(.top, 10)
                .padding(.bottom, 4)
                .onChange(of: selectedCongress) { _, _ in
                    Task { await loadSpeakers() }
                }

                FICASearchBar(text: $search, placeholder: "Search speakers...")
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)

                if isLoading {
                    LoadingView(message: "Loading speakers...")
                } else {
                    ScrollView(showsIndicators: false) {
                        LazyVStack(spacing: 10) {
                            let keynotes = filtered.filter { $0.isKeynote }
                            if !keynotes.isEmpty {
                                SectionHeader(title: "Keynote Speakers")
                                ForEach(keynotes) { sp in
                                    SpeakerRow(speaker: sp, isKeynote: true)
                                        .onTapGesture { selectedSpeaker = sp }
                                }
                            }
                            let others = filtered.filter { !$0.isKeynote }
                            if !others.isEmpty {
                                SectionHeader(title: "Speakers & Panelists")
                                ForEach(others) { sp in
                                    SpeakerRow(speaker: sp, isKeynote: false)
                                        .onTapGesture { selectedSpeaker = sp }
                                }
                            }
                            if filtered.isEmpty {
                                EmptyStateView(icon: "mic.slash", title: "No speakers found")
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 20)
                    }
                }
            }
            .background(Color.ficaBg)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Speakers").font(.system(size: 17, weight: .semibold)).foregroundStyle(Color.ficaText)
                }
            }
            .refreshable { await loadSpeakers() }
            .task { await loadSpeakers() }
            .sheet(item: $selectedSpeaker) { SpeakerDetailView(speaker: $0) }
        }
    }

    private var filtered: [Speaker] {
        if search.isEmpty { return speakers }
        let q = search.lowercased()
        return speakers.filter {
            $0.name.lowercased().contains(q) ||
            ($0.organization ?? "").lowercased().contains(q) ||
            ($0.title ?? "").lowercased().contains(q)
        }
    }

    private func loadSpeakers() async {
        isLoading = speakers.isEmpty
        speakers = (try? await APIService.shared.getSpeakers(year: selectedCongress.rawValue)) ?? []
        isLoading = false
    }
}

struct SpeakerRow: View {
    let speaker: Speaker
    let isKeynote: Bool

    var body: some View {
        HStack(spacing: 14) {
            AvatarView(name: speaker.name, photo: speaker.photo_url, size: isKeynote ? 56 : 46,
                       borderColor: isKeynote ? .ficaGold : .ficaBorder, borderWidth: isKeynote ? 2 : 1)
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(speaker.name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color.ficaText)
                    if isKeynote {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(Color.ficaGold)
                    }
                }
                if let t = speaker.title {
                    Text(t).font(.system(size: 12)).foregroundStyle(Color.ficaSecondary).lineLimit(1)
                }
                if let org = speaker.organization {
                    Text(org).font(.system(size: 12, weight: .medium)).foregroundStyle(Color.ficaNavy).lineLimit(1)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.ficaBorder)
        }
        .padding(16)
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 3)
    }
}

struct SpeakerDetailView: View {
    let speaker: Speaker
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 12) {
                        AvatarView(name: speaker.name, photo: speaker.photo_url, size: 100, borderColor: .ficaGold, borderWidth: 2.5)
                        HStack(spacing: 6) {
                            Text(speaker.name).font(.system(size: 22, weight: .bold)).foregroundStyle(Color.ficaText)
                            if speaker.isKeynote {
                                Image(systemName: "star.fill").font(.system(size: 12)).foregroundStyle(Color.ficaGold)
                            }
                        }
                        if let t = speaker.title {
                            Text(t).font(.system(size: 14)).foregroundStyle(Color.ficaSecondary)
                        }
                        if let org = speaker.organization {
                            Text(org).font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.ficaNavy)
                        }
                    }
                    .padding(.top, 24)

                    if let bio = speaker.bio, !bio.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("ABOUT").font(.system(size: 11, weight: .bold)).foregroundStyle(Color.ficaMuted).tracking(0.8)
                            Text(bio).font(.system(size: 14)).foregroundStyle(Color.ficaSecondary).lineSpacing(5)
                        }
                        .padding(18)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.ficaInputBg)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .padding(.horizontal, 20)
                    }

                    VStack(spacing: 8) {
                        if let e = speaker.email, !e.isEmpty { contactRow(icon: "envelope.fill", text: e, color: .ficaNavy) }
                        if let l = speaker.linkedin, !l.isEmpty { contactRow(icon: "link", text: "LinkedIn Profile", color: .blue) }
                        if let t = speaker.twitter, !t.isEmpty { contactRow(icon: "at", text: t, color: .cyan) }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.bottom, 30)
            }
            .background(Color.ficaBg)
            .navigationTitle("Speaker")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }.fontWeight(.semibold).foregroundStyle(Color.ficaGold)
                }
            }
        }
    }

    private func contactRow(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(color)
                .frame(width: 34, height: 34)
                .background(color.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            Text(text).font(.system(size: 13)).foregroundStyle(Color.ficaText).lineLimit(1)
            Spacer()
            Image(systemName: "arrow.up.right").font(.system(size: 11)).foregroundStyle(Color.ficaMuted)
        }
        .padding(14)
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
