import SwiftUI

struct SponsorsView: View {
    @State private var sponsors: [Sponsor] = []
    @State private var isLoading = true

    private let tiers = ["platinum", "gold", "silver", "bronze", "supporter", "media"]

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                if isLoading { LoadingView() }
                else if sponsors.isEmpty { EmptyStateView(icon: "star", title: "No sponsors yet") }
                else {
                    VStack(spacing: 20) {
                        ForEach(tiers, id: \.self) { tier in
                            let list = sponsors.filter { ($0.tier ?? "").lowercased() == tier }
                            if !list.isEmpty {
                                VStack(spacing: 10) {
                                    tierHeader(tier)
                                    ForEach(list) { sp in sponsorCard(sp, tier: tier) }
                                }
                            }
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
                    Text("Sponsors").font(.system(size: 17, weight: .semibold)).foregroundStyle(Color.ficaText)
                }
            }
            .refreshable { await load() }
            .task { await load() }
        }
    }

    private func tierHeader(_ tier: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: tier == "platinum" ? "crown.fill" : tier == "gold" ? "star.fill" : "star.leadinghalf.filled")
                .font(.system(size: 13)).foregroundStyle(tierColor(tier))
            Text(tier.capitalized)
                .font(.system(size: 14, weight: .bold)).foregroundStyle(tierColor(tier))
            VStack { Divider() }
        }
        .padding(.top, 8)
    }

    private func tierColor(_ tier: String) -> Color {
        switch tier {
        case "platinum": return .purple
        case "gold": return .ficaGold
        case "silver": return .gray
        case "bronze": return .orange
        default: return .ficaNavy
        }
    }

    private func sponsorCard(_ sp: Sponsor, tier: String) -> some View {
        HStack(spacing: 14) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.ficaInputBg)
                .frame(width: 56, height: 42)
                .overlay(
                    Text(String(sp.name.prefix(2)).uppercased())
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.ficaNavy)
                )
            VStack(alignment: .leading, spacing: 3) {
                Text(sp.name).font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.ficaText)
                if let desc = sp.description, !desc.isEmpty {
                    Text(desc).font(.system(size: 12)).foregroundStyle(Color.ficaSecondary).lineLimit(2)
                }
            }
            Spacer()
            if sp.website != nil {
                Image(systemName: "arrow.up.right.square")
                    .font(.system(size: 14)).foregroundStyle(Color.ficaMuted)
            }
        }
        .padding(16)
        .background(Color.ficaCard)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(tierColor(tier).opacity(tier == "platinum" || tier == "gold" ? 0.25 : 0), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 3)
    }

    private func load() async {
        isLoading = sponsors.isEmpty
        sponsors = (try? await APIService.shared.getSponsors()) ?? []
        isLoading = false
    }
}
