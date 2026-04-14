import SwiftUI

struct ConversationView: View {
    let otherUser: Attendee
    let myId: Int

    @State private var messages: [Message] = []
    @State private var newMessage = ""
    @State private var isLoading = true
    @State private var isSending = false
    @FocusState private var inputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 10) {
                        if isLoading {
                            LoadingView(message: "Loading messages...")
                        } else if messages.isEmpty {
                            VStack(spacing: 12) {
                                AvatarView(name: otherUser.name, photo: otherUser.photo_url, size: 64, borderColor: .ficaGold, borderWidth: 2)
                                Text(otherUser.name).font(.system(size: 17, weight: .bold)).foregroundStyle(Color.ficaText)
                                if let org = otherUser.organization {
                                    Text(org).font(.system(size: 13)).foregroundStyle(Color.ficaSecondary)
                                }
                                Text("Start the conversation")
                                    .font(.system(size: 13)).foregroundStyle(Color.ficaMuted)
                                    .padding(.top, 4)
                            }
                            .padding(.top, 48)
                        } else {
                            ForEach(messages) { msg in
                                ChatBubble(message: msg, isMe: msg.sender_id == myId).id(msg.id)
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                }
                .onChange(of: messages.count) {
                    if let last = messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }

            // Input
            VStack(spacing: 0) {
                Divider()
                HStack(spacing: 10) {
                    TextField("Type a message...", text: $newMessage, axis: .vertical)
                        .font(.system(size: 15))
                        .lineLimit(1...4)
                        .focused($inputFocused)
                        .foregroundStyle(Color.ficaText)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.ficaInputBg)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .onTapGesture { inputFocused = true }

                    Button(action: send) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 34))
                            .foregroundStyle(newMessage.trimmingCharacters(in: .whitespaces).isEmpty ? Color.ficaBorder : Color.ficaNavy)
                    }
                    .disabled(newMessage.trimmingCharacters(in: .whitespaces).isEmpty || isSending)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Color(.systemBackground))
            }
        }
        .background(Color.ficaBg)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                HStack(spacing: 8) {
                    AvatarView(name: otherUser.name, photo: otherUser.photo_url, size: 30, borderColor: .ficaBorder, borderWidth: 1)
                    VStack(alignment: .leading, spacing: 0) {
                        Text(otherUser.name).font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.ficaText)
                        if let org = otherUser.organization {
                            Text(org).font(.system(size: 10)).foregroundStyle(Color.ficaMuted)
                        }
                    }
                }
            }
        }
        .task { await loadConvo() }
        .onAppear {
            // Listen for new messages via WebSocket
            ChatWebSocket.shared.addConversationHandler(myId: myId, otherId: otherUser.id) { msg in
                // Avoid duplicates (message we just sent is already appended optimistically)
                if !messages.contains(where: { $0.id == msg.id }) {
                    messages.append(msg)
                }
                // Mark as read if we're the receiver
                if msg.receiver_id == myId {
                    Task { try? await APIService.shared.markAsRead(readerId: myId, senderId: msg.sender_id) }
                }
            }
        }
        .onDisappear {
            ChatWebSocket.shared.removeConversationHandler(myId: myId, otherId: otherUser.id)
        }
    }

    private func loadConvo() async {
        isLoading = messages.isEmpty
        messages = (try? await APIService.shared.getConversation(a: myId, b: otherUser.id)) ?? []
        isLoading = false
    }

    private func send() {
        let body = newMessage.trimmingCharacters(in: .whitespaces)
        guard !body.isEmpty else { return }
        isSending = true; newMessage = ""
        Task {
            do {
                let msg = try await APIService.shared.sendMessage(SendMessageRequest(sender_id: myId, receiver_id: otherUser.id, subject: nil, body: body))
                // Append only if WebSocket hasn't already delivered it
                if !messages.contains(where: { $0.id == msg.id }) {
                    messages.append(msg)
                }
            } catch { newMessage = body }
            isSending = false
        }
    }
}

struct ChatBubble: View {
    let message: Message
    let isMe: Bool

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if isMe { Spacer(minLength: 50) }
            if !isMe {
                AvatarView(name: message.sender_name ?? "", photo: message.sender_photo, size: 30, borderColor: .ficaBorder, borderWidth: 1)
            }
            VStack(alignment: isMe ? .trailing : .leading, spacing: 4) {
                if let sub = message.subject, !sub.isEmpty {
                    Text(sub).font(.system(size: 10, weight: .bold)).foregroundStyle(isMe ? .white.opacity(0.6) : Color.ficaMuted)
                }
                Text(message.body)
                    .font(.system(size: 14))
                    .foregroundStyle(isMe ? .white : Color.ficaText)
                    .lineSpacing(3)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(isMe ? Color.ficaNavySolid : Color.ficaCard)
                    .clipShape(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                    )
                    .shadow(color: .black.opacity(isMe ? 0 : 0.04), radius: 3, x: 0, y: 1)

                if let d = message.sent_at {
                    Text(d.relativeTime)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(Color.ficaMuted)
                }
            }
            if !isMe { Spacer(minLength: 50) }
        }
    }
}
