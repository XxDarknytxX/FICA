import SwiftUI

// MARK: - Floating Orb for background animation

struct FloatingOrb: View {
    let color: Color
    let size: CGFloat
    let delay: Double
    @State private var offset: CGSize = .zero
    @State private var opacity: Double = 0

    var body: some View {
        Circle()
            .fill(color.opacity(opacity))
            .frame(width: size, height: size)
            .blur(radius: size * 0.4)
            .offset(offset)
            .onAppear {
                withAnimation(.easeInOut(duration: Double.random(in: 6...10)).repeatForever(autoreverses: true).delay(delay)) {
                    offset = CGSize(
                        width: CGFloat.random(in: -60...60),
                        height: CGFloat.random(in: -80...80)
                    )
                }
                withAnimation(.easeIn(duration: 1.5).delay(delay * 0.3)) {
                    opacity = Double.random(in: 0.08...0.18)
                }
            }
    }
}

// MARK: - Login View

struct LoginView: View {
    @Environment(AuthService.self) private var auth
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var error: String?
    @State private var showPassword = false
    @FocusState private var focus: Field?

    // Animations
    @State private var logoAppeared = false
    @State private var formAppeared = false
    @State private var footerAppeared = false

    private enum Field { case email, password }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                backgroundLayer(geo: geo)

                VStack(spacing: 24) {
                    Spacer().frame(maxHeight: .infinity)

                    logoSection
                        .opacity(logoAppeared ? 1 : 0)

                    formCard
                        .opacity(formAppeared ? 1 : 0)

                    footerSection
                        .opacity(footerAppeared ? 1 : 0)
                        .padding(.bottom, 8)

                    Spacer().frame(maxHeight: 50)
                }
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.5).delay(0.1)) { logoAppeared = true }
            withAnimation(.easeOut(duration: 0.5).delay(0.2)) { formAppeared = true }
            withAnimation(.easeOut(duration: 0.4).delay(0.3)) { footerAppeared = true }
        }
        .onSubmit {
            switch focus {
            case .email: focus = .password
            case .password: login()
            case nil: break
            }
        }
    }

    // MARK: - Background

    private func backgroundLayer(geo: GeometryProxy) -> some View {
        ZStack {
            // Base
            Color(.systemBackground)

            // Floating orbs
            FloatingOrb(color: .ficaNavy, size: 200, delay: 0)
                .position(x: geo.size.width * 0.15, y: geo.size.height * 0.12)
            FloatingOrb(color: .ficaGold, size: 160, delay: 0.5)
                .position(x: geo.size.width * 0.85, y: geo.size.height * 0.25)
            FloatingOrb(color: .ficaNavy.opacity(0.5), size: 120, delay: 1.0)
                .position(x: geo.size.width * 0.7, y: geo.size.height * 0.85)
            FloatingOrb(color: .ficaGold.opacity(0.4), size: 140, delay: 1.5)
                .position(x: geo.size.width * 0.2, y: geo.size.height * 0.75)

            // Subtle top accent line
            VStack {
                LinearGradient(colors: [.ficaGold.opacity(0.6), .ficaNavy.opacity(0.4), .clear], startPoint: .leading, endPoint: .trailing)
                    .frame(height: 3)
                Spacer()
            }
        }
        .ignoresSafeArea()
    }

    // MARK: - Logo

    private var logoSection: some View {
        VStack(spacing: 18) {
            // FICA Logo
            FICALogoView(height: 55)
                .padding(.horizontal, 40)

            VStack(spacing: 6) {
                Text("Congress 2026")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.ficaMuted)
            }
        }
    }

    // MARK: - Form

    private var formCard: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 6) {
                Text("Welcome")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(Color.ficaText)
                Text("Sign in with your delegate credentials")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.ficaMuted)
            }

            // Error
            if let error {
                HStack(spacing: 10) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 14))
                    Text(error)
                        .font(.system(size: 13, weight: .medium))
                }
                .foregroundStyle(Color.ficaDanger)
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.ficaDanger.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Color.ficaDanger.opacity(0.12), lineWidth: 1))
                .transition(.move(edge: .top).combined(with: .opacity))
            }

            // Email field
            VStack(alignment: .leading, spacing: 8) {
                Text("Email")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.ficaSecondary)

                HStack(spacing: 12) {
                    Image(systemName: "envelope")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(focus == .email ? Color.ficaGold : Color.ficaMuted)
                        .frame(width: 20)
                        .animation(.easeInOut(duration: 0.2), value: focus)

                    ZStack(alignment: .leading) {
                        if email.isEmpty {
                            Text("Enter your email address")
                                .font(.system(size: 15))
                                .foregroundStyle(Color.ficaMuted.opacity(0.6))
                        }
                        TextField("", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .focused($focus, equals: .email)
                            .font(.system(size: 15))
                            .foregroundStyle(Color.ficaText)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 15)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(focus == .email ? Color(.systemBackground) : Color.ficaInputBg)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(focus == .email ? Color.ficaGold : Color.clear, lineWidth: 1.5)
                )
                .shadow(color: focus == .email ? .ficaGold.opacity(0.12) : .clear, radius: 8, y: 2)
                .animation(.easeInOut(duration: 0.2), value: focus)
            }

            // Password field
            VStack(alignment: .leading, spacing: 8) {
                Text("Password")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.ficaSecondary)

                HStack(spacing: 12) {
                    Image(systemName: "lock")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(focus == .password ? Color.ficaGold : Color.ficaMuted)
                        .frame(width: 20)
                        .animation(.easeInOut(duration: 0.2), value: focus)

                    ZStack(alignment: .leading) {
                        if password.isEmpty {
                            Text("Enter your password")
                                .font(.system(size: 15))
                                .foregroundStyle(Color.ficaMuted.opacity(0.6))
                        }
                        Group {
                            if showPassword {
                                TextField("", text: $password)
                            } else {
                                SecureField("", text: $password)
                            }
                        }
                        .focused($focus, equals: .password)
                        .font(.system(size: 15))
                        .foregroundStyle(Color.ficaText)
                    }

                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) { showPassword.toggle() }
                    } label: {
                        Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(Color.ficaMuted)
                            .contentTransition(.symbolEffect(.replace))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 15)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(focus == .password ? Color(.systemBackground) : Color.ficaInputBg)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(focus == .password ? Color.ficaGold : Color.clear, lineWidth: 1.5)
                )
                .shadow(color: focus == .password ? .ficaGold.opacity(0.12) : .clear, radius: 8, y: 2)
                .animation(.easeInOut(duration: 0.2), value: focus)
            }

            // Sign in button
            Button(action: login) {
                ZStack {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(
                            canSubmit
                                ? LinearGradient(colors: [Color.ficaNavySolid, Color.ficaNavyLight], startPoint: .leading, endPoint: .trailing)
                                : LinearGradient(colors: [Color.ficaNavySolid.opacity(0.3), Color.ficaNavySolid.opacity(0.3)], startPoint: .leading, endPoint: .trailing)
                        )
                        .frame(height: 52)
                        .shadow(color: canSubmit ? .ficaNavy.opacity(0.3) : .clear, radius: 12, y: 6)

                    HStack(spacing: 8) {
                        if isLoading {
                            ProgressView().tint(.white).controlSize(.small)
                        }
                        Text(isLoading ? "Signing in..." : "Sign In")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                        if !isLoading {
                            Image(systemName: "arrow.right")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white.opacity(0.7))
                        }
                    }
                }
            }
            .disabled(!canSubmit || isLoading)
            .animation(.easeInOut(duration: 0.2), value: canSubmit)
            .padding(.top, 4)
        }
        .padding(28)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color(.secondarySystemGroupedBackground))
                .shadow(color: .black.opacity(0.08), radius: 24, x: 0, y: 12)
        )
        .padding(.horizontal, 24)
    }

    // MARK: - Footer

    private var footerSection: some View {
        VStack(spacing: 10) {
            // Divider with diamond
            HStack(spacing: 12) {
                VStack { Divider() }.frame(maxWidth: 60)
                Image(systemName: "diamond.fill")
                    .font(.system(size: 6))
                    .foregroundStyle(Color.ficaGold)
                VStack { Divider() }.frame(maxWidth: 60)
            }

            HStack(spacing: 20) {
                HStack(spacing: 5) {
                    Image(systemName: "mappin.and.ellipse")
                        .font(.system(size: 11))
                    Text("Crowne Plaza Fiji")
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundStyle(Color.ficaSecondary)

                HStack(spacing: 5) {
                    Image(systemName: "calendar")
                        .font(.system(size: 11))
                    Text("8–9 May 2026")
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundStyle(Color.ficaSecondary)
            }

            Text("Navigating Tomorrow:\nAccountancy in the Age of Change")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color.ficaMuted)
                .multilineTextAlignment(.center)
                .lineSpacing(2)

            // Powered by Vodafone — animated reveal on first appear
            PoweredByVodafone(iconHeight: 16, delay: 0.3)
                .padding(.top, 12)
        }
    }

    // MARK: - Helpers

    private var canSubmit: Bool { !email.isEmpty && !password.isEmpty }

    private func login() {
        guard canSubmit else { return }
        isLoading = true
        error = nil
        Task {
            do {
                try await auth.login(email: email, password: password)
            } catch {
                withAnimation(.spring(response: 0.4)) { self.error = error.localizedDescription }
            }
            isLoading = false
        }
    }
}
