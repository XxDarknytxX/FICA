package com.fica.events.data.models

import androidx.compose.ui.graphics.Color
import com.google.gson.annotations.SerializedName

// MARK: - Helper Extension
fun Int?.toBool(): Boolean = this != null && this != 0

// MARK: - Auth

data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val token: String,
    val attendee: Attendee
)

// MARK: - Attendee

data class Attendee(
    val id: Int,
    val name: String,
    val email: String,
    val organization: String? = null,
    val job_title: String? = null,
    val phone: String? = null,
    val registration_code: String? = null,
    val ticket_type: String? = null,
    val check_in_day1: Int? = null,
    val check_in_day2: Int? = null,
    val dietary_requirements: String? = null,
    val notes: String? = null,
    val account_active: Int? = null,
    val bio: String? = null,
    val photo_url: String? = null,
    val linkedin: String? = null,
    val twitter: String? = null,
    val website: String? = null,
    val created_at: String? = null,
    val has_account: Int? = null,
    val msgCount: Int? = null
)

data class ProfileResponse(
    val profile: Attendee
)

data class DirectoryResponse(
    val attendees: List<Attendee>
)

// MARK: - Session

data class Session(
    val id: Int,
    val title: String,
    val description: String? = null,
    val session_date: String? = null,
    val start_time: String? = null,
    val end_time: String? = null,
    val location: String? = null,
    @SerializedName("type") val sessionType: String? = null,
    val speaker_id: Int? = null,
    val speaker_name: String? = null,
    val speaker_title: String? = null,
    val speaker_photo: String? = null,
    val display_order: Int? = null,
    val congress_year: Int? = null,
    val session_group: String? = null
)

data class SessionsResponse(
    val sessions: List<Session>
)

// MARK: - Speaker

data class Speaker(
    val id: Int,
    val name: String,
    val title: String? = null,
    val organization: String? = null,
    val bio: String? = null,
    val photo_url: String? = null,
    val email: String? = null,
    val linkedin: String? = null,
    val twitter: String? = null,
    val is_keynote: Int? = null,
    val display_order: Int? = null
)

data class SpeakersResponse(
    val speakers: List<Speaker>
)

// MARK: - Sponsor

data class Sponsor(
    val id: Int,
    val name: String,
    val tier: String? = null,
    val logo_url: String? = null,
    val website: String? = null,
    val description: String? = null,
    val display_order: Int? = null
)

data class SponsorsResponse(
    val sponsors: List<Sponsor>
)

// MARK: - Message

data class Message(
    val id: Int,
    val sender_id: Int,
    val receiver_id: Int,
    val sender_name: String? = null,
    val sender_org: String? = null,
    val sender_photo: String? = null,
    val receiver_name: String? = null,
    val receiver_org: String? = null,
    val receiver_photo: String? = null,
    val subject: String? = null,
    val body: String,
    val is_read: Int? = null,
    val sent_at: String? = null
)

data class MessagesResponse(
    val messages: List<Message>
)

data class SendMessageRequest(
    val sender_id: Int,
    val receiver_id: Int,
    val subject: String? = null,
    val body: String
)

data class MarkAsReadRequest(
    val reader_id: Int,
    val sender_id: Int
)

data class SendMessageResponse(
    val message: Message
)

// MARK: - Connection

data class Connection(
    val id: Int,
    val requester_id: Int,
    val requested_id: Int,
    val status: String,
    val created_at: String? = null,
    val requester_name: String? = null,
    val requester_org: String? = null,
    val requester_photo: String? = null,
    val requested_name: String? = null,
    val requested_org: String? = null,
    val requested_photo: String? = null
)

data class ConnectionsResponse(
    val connections: List<Connection>
)

data class CreateConnectionRequest(
    val requester_id: Int,
    val requested_id: Int
)

data class ConnectionResponse(
    val connection: Connection
)

// MARK: - Meeting

data class Meeting(
    val id: Int,
    val requester_id: Int,
    val requested_id: Int,
    val title: String? = null,
    val meeting_date: String? = null,
    val start_time: String? = null,
    val end_time: String? = null,
    val location: String? = null,
    val notes: String? = null,
    val status: String? = null,
    val created_at: String? = null,
    val requester_name: String? = null,
    val requester_org: String? = null,
    val requester_photo: String? = null,
    val requester_title: String? = null,
    val requested_name: String? = null,
    val requested_org: String? = null,
    val requested_photo: String? = null,
    val requested_title: String? = null
)

data class MeetingsResponse(
    val meetings: List<Meeting>
)

data class CreateMeetingRequest(
    val requester_id: Int,
    val requested_id: Int,
    val title: String? = null,
    val meeting_date: String? = null,
    val start_time: String? = null,
    val end_time: String? = null,
    val location: String? = null,
    val notes: String? = null
)

data class MeetingResponse(
    val meeting: Meeting
)

// MARK: - Announcement

data class Announcement(
    val id: Int,
    val title: String,
    val body: String? = null,
    val priority: String? = null,
    val target: String? = null,
    val published: Int? = null,
    val publish_date: String? = null,
    val created_at: String? = null
)

data class AnnouncementsResponse(
    val announcements: List<Announcement>
)

// MARK: - Networking Event

data class NetworkingEvent(
    val id: Int,
    val title: String,
    val description: String? = null,
    val start_time: String? = null,
    val end_time: String? = null,
    val slot_date: String? = null,
    val location: String? = null,
    val capacity: Int? = null,
    val type: String? = null,
    val dress_code: String? = null
)

data class NetworkingEventsResponse(
    val slots: List<NetworkingEvent>
)

// MARK: - Project / Voting

data class Project(
    val id: Int,
    val name: String,
    val description: String? = null,
    val team: String? = null,
    val image_url: String? = null,
    val category: String? = null,
    val display_order: Int? = null,
    val vote_count: Int? = null,
    val voted_for_this: Int? = null
)

data class ProjectsResponse(
    val projects: List<Project>,
    val has_voted: Boolean,
    val my_vote_project_id: Int? = null,
    val voting_open: Boolean
)

data class VoteRequest(
    val project_id: Int
)

data class VoteResponse(
    val success: Boolean,
    val project_id: Int? = null
)

// MARK: - Settings

data class EventSettingsResponse(
    val settings: Map<String, String>
)

// MARK: - Panel Discussion

/**
 * A panel session enriched with the logged-in attendee's membership flag
 * and the live question count, returned from `/api/delegate/panels`.
 */
data class Panel(
    val id: Int,
    val title: String,
    val description: String? = null,
    val session_date: String? = null,
    val start_time: String? = null,
    val end_time: String? = null,
    val room: String? = null,
    val speaker_name: String? = null,
    val speaker_title: String? = null,
    val speaker_org: String? = null,
    val speaker_photo: String? = null,
    val moderator: String? = null,
    val congress_year: Int? = null,
    val question_count: Int? = null,
    val is_panel_member: Int? = null,
) {
    val isPanelMember: Boolean get() = (is_panel_member ?: 0) != 0
}

data class PanelsResponse(
    val panels: List<Panel>,
    val panel_discussion_enabled: Boolean,
)

/** A single question on a panel's Q&A board. */
data class PanelQuestion(
    val id: Int,
    val session_id: Int,
    val attendee_id: Int,
    val question: String,
    val created_at: String? = null,
    val attendee_name: String? = null,
    val attendee_org: String? = null,
    val attendee_photo: String? = null,
    val is_panel_member: Int? = null,
) {
    val isPanelMember: Boolean get() = (is_panel_member ?: 0) != 0
}

data class PanelQuestionsResponse(val questions: List<PanelQuestion>)

data class PanelQuestionResponse(val question: PanelQuestion)

data class PostPanelQuestionRequest(val question: String)

// MARK: - Error

data class ApiError(
    val error: String
)

// MARK: - Status Update

data class StatusUpdateRequest(
    val status: String
)

// MARK: - Congress Year

enum class CongressYear(val year: Int) {
    Y2026(2026),
    Y2025(2025);

    val label: String get() = "Congress $year"
    val shortLabel: String get() = "$year"

    val theme: String get() = when (this) {
        Y2026 -> "Charting New Horizons for a Changing World"
        Y2025 -> "Shaping Fiji for Tomorrow's Challenges and Opportunities"
    }

    val venue: String get() = when (this) {
        Y2026 -> "Convention Center at Crowne Plaza Fiji Nadi Bay Resort & Spa"
        Y2025 -> "Baravi Ballroom at Crowne Plaza Fiji Nadi Bay Resort & Spa"
    }

    val venueShort: String get() = when (this) {
        Y2026 -> "Crowne Plaza Fiji"
        Y2025 -> "Crowne Plaza Fiji"
    }

    val dates: String get() = when (this) {
        Y2026 -> "8–9 May 2026"
        Y2025 -> "6–7 June 2025"
    }

    val datesShort: String get() = when (this) {
        Y2026 -> "8–9 May"
        Y2025 -> "6–7 Jun"
    }

    data class DayInfo(val date: String, val label: String, val subtitle: String)

    val dayDates: List<DayInfo> get() = when (this) {
        Y2026 -> listOf(DayInfo("2026-05-08", "Day 1", "Fri 8 May"), DayInfo("2026-05-09", "Day 2", "Sat 9 May"))
        Y2025 -> listOf(DayInfo("2025-06-06", "Day 1", "Fri 6 Jun"), DayInfo("2025-06-07", "Day 2", "Sat 7 Jun"))
    }
}

// MARK: - Session Group

enum class SessionGroup(val key: String) {
    OPENING("opening"),
    SESSION1("session1"),
    SESSION2("session2"),
    SESSION3("session3"),
    AGM("agm"),
    SOCIAL("social");

    val label: String get() = when (this) {
        OPENING -> "Opening Ceremony"
        SESSION1 -> "Session 1"
        SESSION2 -> "Session 2"
        SESSION3 -> "Session 3"
        AGM -> "FICA AGM"
        SOCIAL -> "Social Events"
    }

    fun subtitle(year: CongressYear): String? = when (this to year) {
        SESSION1 to CongressYear.Y2026 -> "NAVIGATING: Global Economics & Fiji's Positioning"
        SESSION2 to CongressYear.Y2026 -> "TRANSFORMING: AI, Digitalisation & Professional Evolution"
        SESSION3 to CongressYear.Y2026 -> "SUSTAINING: Governance, Sustainability & Long-Term Value"
        SESSION1 to CongressYear.Y2025 -> "Balancing Regional and Global Interests"
        SESSION2 to CongressYear.Y2025 -> "Digitalisation and Ease of Doing Business"
        SESSION3 to CongressYear.Y2025 -> "Businesses as Catalysts of Economic Growth"
        else -> null
    }

    val color: Color get() = when (this) {
        OPENING -> Color(0xFF0F2D5E)
        SESSION1 -> Color(0xFF2980B9)
        SESSION2 -> Color(0xFF8F44AD)
        SESSION3 -> Color(0xFF219653)
        AGM -> Color(0xFFC9A84C)
        SOCIAL -> Color(0xFFD97314)
    }

    companion object {
        fun fromKey(key: String?): SessionGroup? = entries.find { it.key == key }
    }
}
