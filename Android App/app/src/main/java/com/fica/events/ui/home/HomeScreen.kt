package com.fica.events.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fica.events.data.api.ApiClient
import com.fica.events.data.auth.AuthManager
import com.fica.events.data.models.Announcement
import com.fica.events.data.models.NetworkingEvent
import com.fica.events.data.models.Session
import com.fica.events.data.models.Speaker
import com.fica.events.data.models.Sponsor
import com.fica.events.data.models.toBool
import com.fica.events.ui.components.AvatarView
import com.fica.events.ui.components.FICALogoView
import com.fica.events.ui.components.LoadingView
import com.fica.events.ui.components.SectionHeader
import com.fica.events.ui.theme.FICABg
import com.fica.events.ui.theme.FICACard
import com.fica.events.ui.theme.FICADanger
import com.fica.events.ui.theme.FICAGold
import com.fica.events.ui.theme.FICAHeroGradient
import com.fica.events.ui.theme.FICAInputBg
import com.fica.events.ui.theme.FICAMuted
import com.fica.events.ui.theme.FICANavy
import com.fica.events.ui.theme.FICASecondary
import com.fica.events.ui.theme.FICASuccess
import com.fica.events.ui.theme.FICAText
import com.fica.events.ui.theme.SessionTypeColors
import com.fica.events.ui.theme.TicketBadge
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.time.Duration
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

// ── Relative time helper ───────────────────────────────────────────────────

fun String?.relativeTime(): String {
    if (this == null) return ""
    return try {
        val parsed = ZonedDateTime.parse(this, DateTimeFormatter.ISO_DATE_TIME)
        val now = ZonedDateTime.now()
        val duration = Duration.between(parsed, now)
        val minutes = duration.toMinutes()
        when {
            minutes < 1 -> "Just now"
            minutes < 60 -> "${minutes}m ago"
            minutes < 1440 -> "${minutes / 60}h ago"
            else -> "${minutes / 1440}d ago"
        }
    } catch (_: Exception) {
        try {
            val parsed = java.time.LocalDateTime.parse(
                this.replace(" ", "T"),
                DateTimeFormatter.ISO_LOCAL_DATE_TIME
            )
            val now = java.time.LocalDateTime.now()
            val duration = Duration.between(parsed, now)
            val minutes = duration.toMinutes()
            when {
                minutes < 1 -> "Just now"
                minutes < 60 -> "${minutes}m ago"
                minutes < 1440 -> "${minutes / 60}h ago"
                else -> "${minutes / 1440}d ago"
            }
        } catch (_: Exception) {
            ""
        }
    }
}

// ── HomeScreen ─────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(onLogout: (() -> Unit)? = null) {
    var sessions by remember { mutableStateOf<List<Session>>(emptyList()) }
    var speakers by remember { mutableStateOf<List<Speaker>>(emptyList()) }
    var announcements by remember { mutableStateOf<List<Announcement>>(emptyList()) }
    var sponsors by remember { mutableStateOf<List<Sponsor>>(emptyList()) }
    var networkingEvents by remember { mutableStateOf<List<NetworkingEvent>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showProfile by remember { mutableStateOf(false) }

    val user = AuthManager.currentUser
    val firstName = user?.name?.split(" ")?.firstOrNull() ?: "Delegate"

    LaunchedEffect(Unit) {
        isLoading = true
        try {
            coroutineScope {
                val currentYear = 2026
                val sessionsDeferred = async { ApiClient.service.getSessions(year = currentYear) }
                val speakersDeferred = async { ApiClient.service.getSpeakers(year = currentYear) }
                val announcementsDeferred = async { ApiClient.service.getAnnouncements() }
                val sponsorsDeferred = async { ApiClient.service.getSponsors(year = currentYear) }
                val eventsDeferred = async { ApiClient.service.getNetworkingEvents(year = currentYear) }

                sessions = sessionsDeferred.await().body()?.sessions ?: emptyList()
                speakers = speakersDeferred.await().body()?.speakers ?: emptyList()
                announcements = announcementsDeferred.await().body()?.announcements ?: emptyList()
                sponsors = sponsorsDeferred.await().body()?.sponsors ?: emptyList()
                networkingEvents = eventsDeferred.await().body()?.slots ?: emptyList()
            }
        } catch (_: Exception) { }
        isLoading = false
    }

    // Profile bottom sheet
    if (showProfile) {
        ModalBottomSheet(
            onDismissRequest = { showProfile = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = FICABg,
        ) {
            com.fica.events.ui.profile.ProfileScreen(onLogout = {
                showProfile = false
                onLogout?.invoke()
            })
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FICABg),
    ) {
        // Top bar
        TopAppBar(
            title = { FICALogoView(height = 26.dp) },
            actions = {
                IconButton(onClick = { showProfile = true }) {
                    AvatarView(
                        name = user?.name ?: "U",
                        photoUrl = user?.photo_url,
                        size = 34.dp,
                        borderColor = FICAGold,
                        borderWidth = 1.5.dp,
                    )
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = FICABg),
        )

        if (isLoading) {
            LoadingView(message = "Loading...")
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                Spacer(modifier = Modifier.height(4.dp))

                // Hero Card
                HeroCard(firstName = firstName, user = user)

                // Stats Row
                StatsRow(
                    sessionsCount = sessions.size,
                    speakersCount = speakers.size,
                    sponsorsCount = sponsors.size,
                    eventsCount = networkingEvents.size,
                )

                // Upcoming Sessions
                if (sessions.isNotEmpty()) {
                    SessionsSection(sessions = sessions.take(6))
                }

                // Announcements
                val publishedAnnouncements = announcements.filter { it.published.toBool() }
                if (publishedAnnouncements.isNotEmpty()) {
                    AnnouncementsSection(announcements = publishedAnnouncements.take(3))
                }

                // Keynote Speakers
                val keynoteSpeakers = speakers.filter { it.is_keynote.toBool() }
                if (keynoteSpeakers.isNotEmpty()) {
                    SpeakersSection(speakers = keynoteSpeakers)
                }

                // Networking Events
                if (networkingEvents.isNotEmpty()) {
                    EventsSection(events = networkingEvents.take(5))
                }

                // Sponsors
                if (sponsors.isNotEmpty()) {
                    SponsorsSection(sponsors = sponsors)
                }

                Spacer(modifier = Modifier.height(140.dp))
            }
        }
    }
}

// ── Hero Card ──────────────────────────────────────────────────────────────

@Composable
private fun HeroCard(
    firstName: String,
    user: com.fica.events.data.models.Attendee?,
) {
    Column(
        modifier = Modifier
            .padding(horizontal = 20.dp)
            .fillMaxWidth()
            .shadow(16.dp, RoundedCornerShape(20.dp), ambientColor = FICANavy.copy(alpha = 0.3f))
            .clip(RoundedCornerShape(20.dp))
            .background(FICAHeroGradient)
            .padding(vertical = 28.dp, horizontal = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        // Welcome text
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = "Welcome, $firstName",
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )
            Text(
                text = "Charting New Horizons for a Changing World",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = Color.White.copy(alpha = 0.65f),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 8.dp),
            )
        }

        // Info pills row
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            HeroInfoPill(
                icon = Icons.Filled.Place,
                text = "Crowne Plaza Fiji",
                modifier = Modifier.weight(1f),
            )
            HeroDivider()
            HeroInfoPill(
                icon = Icons.Filled.CalendarMonth,
                text = "8–9 May",
                modifier = Modifier.weight(1f),
            )
            HeroDivider()
            HeroInfoPill(
                icon = Icons.Filled.Star,
                text = TicketBadge.labelFor(user?.ticket_type),
                modifier = Modifier.weight(1f),
            )
        }

        // Registration code pill
        val code = user?.registration_code
        if (!code.isNullOrBlank()) {
            Row(
                modifier = Modifier
                    .background(
                        Color.White.copy(alpha = 0.12f),
                        RoundedCornerShape(50),
                    )
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.QrCode,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(14.dp),
                )
                Text(
                    text = code,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = Color.White,
                )
            }
        }
    }
}

@Composable
private fun HeroInfoPill(
    icon: ImageVector,
    text: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = FICAGold,
            modifier = Modifier.size(16.dp),
        )
        Text(
            text = text,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.White.copy(alpha = 0.85f),
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun HeroDivider() {
    Box(
        modifier = Modifier
            .width(1.dp)
            .height(32.dp)
            .background(Color.White.copy(alpha = 0.15f)),
    )
}

// ── Stats Row ──────────────────────────────────────────────────────────────

@Composable
private fun StatsRow(
    sessionsCount: Int,
    speakersCount: Int,
    sponsorsCount: Int,
    eventsCount: Int,
) {
    Row(
        modifier = Modifier.padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        StatItem(
            icon = Icons.Filled.CalendarMonth,
            value = "$sessionsCount",
            label = "Sessions",
            color = FICANavy,
            modifier = Modifier.weight(1f),
        )
        StatItem(
            icon = Icons.Filled.Mic,
            value = "$speakersCount",
            label = "Speakers",
            color = FICAGold,
            modifier = Modifier.weight(1f),
        )
        StatItem(
            icon = Icons.Filled.Star,
            value = "$sponsorsCount",
            label = "Sponsors",
            color = Color(0xFF7C3AED),
            modifier = Modifier.weight(1f),
        )
        StatItem(
            icon = Icons.Filled.Groups,
            value = "$eventsCount",
            label = "Events",
            color = FICASuccess,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun StatItem(
    icon: ImageVector,
    value: String,
    label: String,
    color: Color,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .shadow(4.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .background(FICACard, RoundedCornerShape(14.dp))
            .padding(vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(18.dp),
        )
        Text(
            text = value,
            fontSize = 22.sp,
            fontWeight = FontWeight.Black,
            color = FICAText,
        )
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = FICAMuted,
        )
    }
}

// ── Sessions Section ───────────────────────────────────────────────────────

@Composable
private fun SessionsSection(sessions: List<Session>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionHeader(title = "Upcoming Sessions")
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(horizontal = 20.dp),
        ) {
            items(sessions, key = { it.id }) { session ->
                SessionCard(session = session)
            }
        }
    }
}

@Composable
private fun SessionCard(session: Session) {
    val typeColor = SessionTypeColors.colorFor(session.sessionType)

    Column(
        modifier = Modifier
            .width(200.dp)
            .height(140.dp)
            .shadow(3.dp, RoundedCornerShape(16.dp), ambientColor = Color.Black.copy(alpha = 0.05f))
            .clip(RoundedCornerShape(16.dp))
            .background(FICACard),
    ) {
        // Colored top accent
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(3.dp)
                .background(typeColor),
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(14.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            // Top section: badge + title
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                // Type badge pill
                Text(
                    text = session.sessionType?.replaceFirstChar { it.uppercase() } ?: "Session",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = typeColor,
                    modifier = Modifier
                        .background(typeColor.copy(alpha = 0.1f), RoundedCornerShape(50))
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                )

                // Title — fixed 2 lines
                Text(
                    text = session.title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAText,
                    maxLines = 2,
                    minLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 18.sp,
                )
            }

            // Bottom: time pinned to bottom
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.Schedule,
                    contentDescription = null,
                    tint = FICAMuted,
                    modifier = Modifier.size(13.dp),
                )
                Text(
                    text = session.start_time ?: "",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = FICAMuted,
                )
            }
        }
    }
}

// ── Announcements Section ──────────────────────────────────────────────────

@Composable
private fun AnnouncementsSection(announcements: List<Announcement>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionHeader(title = "Announcements")
        Column(
            modifier = Modifier.padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            announcements.forEach { announcement ->
                AnnouncementRow(announcement = announcement)
            }
        }
    }
}

@Composable
private fun AnnouncementRow(announcement: Announcement) {
    val isUrgent = announcement.priority == "urgent"
    val iconColor = if (isUrgent) FICADanger else FICAGold

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(4.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.03f))
            .background(FICACard, RoundedCornerShape(14.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Icon
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(iconColor.copy(alpha = 0.1f), RoundedCornerShape(11.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = if (isUrgent) Icons.Filled.Warning else Icons.Filled.Notifications,
                contentDescription = null,
                tint = iconColor,
                modifier = Modifier.size(17.dp),
            )
        }

        // Content
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Text(
                text = announcement.title,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            announcement.body?.let { body ->
                Text(
                    text = body,
                    fontSize = 13.sp,
                    color = FICASecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }

        // Relative time
        Text(
            text = announcement.created_at.relativeTime(),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = FICAMuted,
        )
    }
}

// ── Speakers Section ───────────────────────────────────────────────────────

@Composable
private fun SpeakersSection(speakers: List<Speaker>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionHeader(title = "Keynote Speakers")
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.padding(start = 20.dp),
        ) {
            items(speakers, key = { it.id }) { speaker ->
                SpeakerCard(speaker = speaker)
            }
        }
    }
}

@Composable
private fun SpeakerCard(speaker: Speaker) {
    Column(
        modifier = Modifier
            .width(110.dp)
            .shadow(4.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .background(FICACard, RoundedCornerShape(14.dp))
            .padding(vertical = 16.dp, horizontal = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        AvatarView(
            name = speaker.name,
            photoUrl = speaker.photo_url,
            size = 64.dp,
            borderColor = FICAGold,
            borderWidth = 2.dp,
        )
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = speaker.name,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                text = speaker.organization ?: "",
                fontSize = 10.sp,
                color = FICAMuted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

// ── Networking Events Section ──────────────────────────────────────────────

@Composable
private fun EventsSection(events: List<NetworkingEvent>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionHeader(title = "Networking Events")
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.padding(start = 20.dp),
        ) {
            items(events, key = { it.id }) { event ->
                EventCard(event = event)
            }
        }
    }
}

@Composable
private fun EventCard(event: NetworkingEvent) {
    Row(
        modifier = Modifier
            .shadow(4.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.03f))
            .background(FICACard, RoundedCornerShape(14.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Event type icon
        Box(
            modifier = Modifier
                .size(44.dp)
                .background(FICANavy.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.Groups,
                contentDescription = null,
                tint = FICANavy,
                modifier = Modifier.size(20.dp),
            )
        }

        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = event.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                event.start_time?.let { time ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Schedule,
                            contentDescription = null,
                            tint = FICASecondary,
                            modifier = Modifier.size(12.dp),
                        )
                        Text(text = time, fontSize = 12.sp, color = FICASecondary)
                    }
                }
                event.location?.let { location ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Place,
                            contentDescription = null,
                            tint = FICASecondary,
                            modifier = Modifier.size(12.dp),
                        )
                        Text(
                            text = location,
                            fontSize = 12.sp,
                            color = FICASecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }
    }
}

// ── Sponsors Section ───────────────────────────────────────────────────────

@Composable
private fun SponsorsSection(sponsors: List<Sponsor>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionHeader(title = "Sponsors")
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.padding(start = 20.dp),
        ) {
            items(sponsors, key = { it.id }) { sponsor ->
                SponsorCard(sponsor = sponsor)
            }
        }
    }
}

@Composable
private fun SponsorCard(sponsor: Sponsor) {
    Column(
        modifier = Modifier
            .width(85.dp)
            .shadow(2.dp, RoundedCornerShape(12.dp), ambientColor = Color.Black.copy(alpha = 0.03f))
            .background(FICACard, RoundedCornerShape(12.dp))
            .padding(10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        // 2-letter abbreviation
        Box(
            modifier = Modifier
                .size(width = 60.dp, height = 42.dp)
                .background(FICAInputBg, RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = sponsor.name.take(2).uppercase(),
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = FICANavy,
            )
        }
        Text(
            text = sponsor.name,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = FICAText,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            text = sponsor.tier?.replaceFirstChar { it.uppercase() } ?: "",
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = FICAGold,
            textAlign = TextAlign.Center,
        )
    }
}
