import Foundation
import SwiftUI

// MARK: - Auth
struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct LoginResponse: Decodable {
    let token: String
    let attendee: Attendee
}

// MARK: - Attendee / User
struct Attendee: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
    let email: String
    let organization: String?
    let job_title: String?
    let phone: String?
    let registration_code: String?
    let ticket_type: String?
    let check_in_day1: IntBool?
    let check_in_day2: IntBool?
    let dietary_requirements: String?
    let notes: String?
    let account_active: IntBool?
    let bio: String?
    let photo_url: String?
    let linkedin: String?
    let twitter: String?
    let website: String?
    let created_at: String?
    let has_account: IntBool?
    let msgCount: Int?

    var isCheckedInDay1: Bool { check_in_day1?.boolValue ?? false }
    var isCheckedInDay2: Bool { check_in_day2?.boolValue ?? false }
    var isActive: Bool { account_active?.boolValue ?? false }
    var hasAccountSet: Bool { has_account?.boolValue ?? false }

    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    static func == (lhs: Attendee, rhs: Attendee) -> Bool { lhs.id == rhs.id }

    static func stub(id: Int, name: String, organization: String? = nil, photo_url: String? = nil) -> Attendee {
        Attendee(id: id, name: name, email: "", organization: organization, job_title: nil, phone: nil, registration_code: nil, ticket_type: nil, check_in_day1: nil, check_in_day2: nil, dietary_requirements: nil, notes: nil, account_active: nil, bio: nil, photo_url: photo_url, linkedin: nil, twitter: nil, website: nil, created_at: nil, has_account: nil, msgCount: nil)
    }
}

/// MySQL returns booleans as 0/1 integers. This type decodes both Int and Bool.
struct IntBool: Codable, Hashable {
    let boolValue: Bool

    init(_ value: Bool) { self.boolValue = value }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intVal = try? container.decode(Int.self) {
            boolValue = intVal != 0
        } else if let boolVal = try? container.decode(Bool.self) {
            boolValue = boolVal
        } else {
            boolValue = false
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(boolValue)
    }
}

struct ProfileResponse: Decodable {
    let profile: Attendee
}

struct DirectoryResponse: Decodable {
    let attendees: [Attendee]
}

struct AttendeeProfileResponse: Decodable {
    let attendee: Attendee
}

// MARK: - Session / Agenda
struct Session: Codable, Identifiable {
    let id: Int
    let title: String
    let description: String?
    let session_date: String?
    let start_time: String?
    let end_time: String?
    let location: String?
    let session_type: String?
    let speaker_id: Int?
    let speaker_name: String?
    let speaker_title: String?
    let speaker_photo: String?
    let display_order: Int?
    let congress_year: Int?
    let session_group: String?

    // Backend returns `type` (DB column name); map it to `session_type` so
    // agenda filters (keynote/panel/etc.) and type labels decode correctly.
    // Android handles this via @SerializedName("type") on its Session model.
    enum CodingKeys: String, CodingKey {
        case id, title, description
        case session_date, start_time, end_time
        case location
        case session_type = "type"
        case speaker_id, speaker_name, speaker_title, speaker_photo
        case display_order, congress_year, session_group
    }
}

// MARK: - Session Group (themed tracks)
enum SessionGroup {
    case opening, session1, session2, session3, agm, social

    init?(raw: String?) {
        switch raw {
        case "opening": self = .opening
        case "session1": self = .session1
        case "session2": self = .session2
        case "session3": self = .session3
        case "agm": self = .agm
        case "social": self = .social
        default: return nil
        }
    }

    var label: String {
        switch self {
        case .opening: return "Opening Ceremony"
        case .session1: return "Session 1"
        case .session2: return "Session 2"
        case .session3: return "Session 3"
        case .agm: return "FICA AGM"
        case .social: return "Social Events"
        }
    }

    /// Subtitle varies by congress year
    func subtitle(for year: CongressYear) -> String? {
        switch (self, year) {
        case (.session1, .y2026): return "NAVIGATING: Global Economics & Fiji's Positioning"
        case (.session2, .y2026): return "TRANSFORMING: AI, Digitalisation & Professional Evolution"
        case (.session3, .y2026): return "SUSTAINING: Governance, Sustainability & Long-Term Value"
        case (.session1, .y2025): return "Balancing Regional and Global Interests"
        case (.session2, .y2025): return "Digitalisation and Ease of Doing Business"
        case (.session3, .y2025): return "Businesses as Catalysts of Economic Growth"
        default: return nil
        }
    }

    var color: Color {
        switch self {
        case .opening: return .ficaNavy
        case .session1: return Color(red: 0.16, green: 0.50, blue: 0.73)   // blue
        case .session2: return Color(red: 0.56, green: 0.27, blue: 0.68)   // purple
        case .session3: return Color(red: 0.13, green: 0.59, blue: 0.47)   // teal
        case .agm: return .ficaGold
        case .social: return Color(red: 0.85, green: 0.45, blue: 0.20)     // warm orange
        }
    }
}

// MARK: - Congress Year
enum CongressYear: Int, CaseIterable, Identifiable {
    case y2026 = 2026
    case y2025 = 2025

    var id: Int { rawValue }

    var label: String {
        switch self {
        case .y2026: return "Congress 2026"
        case .y2025: return "Congress 2025"
        }
    }

    var shortLabel: String { "\(rawValue)" }

    var theme: String {
        switch self {
        case .y2026: return "Charting New Horizons for a Changing World"
        case .y2025: return "Shaping Fiji for Tomorrow's Challenges and Opportunities"
        }
    }

    var venue: String {
        switch self {
        case .y2026: return "Convention Center at Crowne Plaza Fiji Nadi Bay Resort & Spa"
        case .y2025: return "Baravi Ballroom at Crowne Plaza Fiji Nadi Bay Resort & Spa"
        }
    }

    var dates: String {
        switch self {
        case .y2026: return "8–9 May 2026"
        case .y2025: return "6–7 June 2025"
        }
    }

    var dayDates: [(String, String, String)] {
        switch self {
        case .y2026: return [("2026-05-08", "Day 1", "Fri 8 May"), ("2026-05-09", "Day 2", "Sat 9 May")]
        case .y2025: return [("2025-06-06", "Day 1", "Fri 6 Jun"), ("2025-06-07", "Day 2", "Sat 7 Jun")]
        }
    }
}

struct SessionsResponse: Decodable {
    let sessions: [Session]
}

// MARK: - Speaker
struct Speaker: Codable, Identifiable {
    let id: Int
    let name: String
    let title: String?
    let organization: String?
    let bio: String?
    let photo_url: String?
    let email: String?
    let linkedin: String?
    let twitter: String?
    let is_keynote: IntBool?
    let display_order: Int?

    var isKeynote: Bool { is_keynote?.boolValue ?? false }
}

struct SpeakersResponse: Decodable {
    let speakers: [Speaker]
}

// MARK: - Sponsor
struct Sponsor: Codable, Identifiable {
    let id: Int
    let name: String
    let tier: String?
    let logo_url: String?
    let website: String?
    let description: String?
    let display_order: Int?
}

struct SponsorsResponse: Decodable {
    let sponsors: [Sponsor]
}

// MARK: - Message
struct Message: Codable, Identifiable {
    let id: Int
    let sender_id: Int
    let receiver_id: Int
    let sender_name: String?
    let sender_org: String?
    let sender_photo: String?
    let receiver_name: String?
    let receiver_org: String?
    let receiver_photo: String?
    let subject: String?
    let body: String
    let is_read: IntBool?
    let sent_at: String?

    var isUnread: Bool { !(is_read?.boolValue ?? false) }
}

struct MessagesResponse: Decodable {
    let messages: [Message]
}

struct SendMessageRequest: Encodable {
    let sender_id: Int
    let receiver_id: Int
    let subject: String?
    let body: String
}

struct SendMessageResponse: Decodable {
    let message: Message
}

// MARK: - Connection
struct Connection: Codable, Identifiable {
    let id: Int
    let requester_id: Int
    let requested_id: Int
    let status: String
    let created_at: String?
    let requester_name: String?
    let requester_org: String?
    let requester_photo: String?
    let requested_name: String?
    let requested_org: String?
    let requested_photo: String?
}

struct ConnectionsResponse: Decodable {
    let connections: [Connection]
}

struct CreateConnectionRequest: Encodable {
    let requester_id: Int
    let requested_id: Int
}

struct ConnectionResponse: Decodable {
    let connection: Connection
}

// MARK: - Meeting
struct Meeting: Codable, Identifiable {
    let id: Int
    let requester_id: Int
    let requested_id: Int
    let title: String?
    let meeting_date: String?
    let start_time: String?
    let end_time: String?
    let location: String?
    let notes: String?
    let status: String?
    let created_at: String?
    let requester_name: String?
    let requester_org: String?
    let requester_photo: String?
    let requester_title: String?
    let requested_name: String?
    let requested_org: String?
    let requested_photo: String?
    let requested_title: String?
}

struct MeetingsResponse: Decodable {
    let meetings: [Meeting]
}

struct CreateMeetingRequest: Encodable {
    let requester_id: Int
    let requested_id: Int
    let title: String?
    let meeting_date: String?
    let start_time: String?
    let end_time: String?
    let location: String?
    let notes: String?
}

struct MeetingResponse: Decodable {
    let meeting: Meeting
}

// MARK: - Announcement
struct Announcement: Codable, Identifiable {
    let id: Int
    let title: String
    let body: String?
    let priority: String?
    let target: String?
    let published: IntBool?
    let publish_date: String?

    var isPublished: Bool { published?.boolValue ?? false }
    let created_at: String?
}

struct AnnouncementsResponse: Decodable {
    let announcements: [Announcement]
}

// MARK: - Networking Event
struct NetworkingEvent: Codable, Identifiable {
    let id: Int
    let title: String
    let description: String?
    let start_time: String?
    let end_time: String?
    let slot_date: String?
    let location: String?
    let capacity: Int?
    let type: String?
    let dress_code: String?
}

struct NetworkingEventsResponse: Decodable {
    let slots: [NetworkingEvent]
}

// MARK: - Project (Voting)
struct Project: Codable, Identifiable {
    let id: Int
    let name: String
    let description: String?
    let team: String?
    let image_url: String?
    let category: String?
    let display_order: Int?
    let vote_count: Int?
    let voted_for_this: Int?

    var isVotedFor: Bool { (voted_for_this ?? 0) != 0 }
}

struct ProjectsResponse: Decodable {
    let projects: [Project]
    let has_voted: Bool
    let my_vote_project_id: Int?
    let voting_open: Bool
}

struct VoteRequest: Encodable {
    let project_id: Int
}

struct VoteResponse: Decodable {
    let success: Bool
    let project_id: Int?
}

// MARK: - Settings
struct EventSettings: Decodable {
    let settings: [String: String]
}

// MARK: - Generic Error
struct APIError: Decodable {
    let error: String
}
