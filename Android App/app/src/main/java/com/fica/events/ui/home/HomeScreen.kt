package com.fica.events.ui.home

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
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
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage
import coil.imageLoader
import coil.request.CachePolicy
import coil.request.ImageRequest
import kotlinx.coroutines.awaitAll
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
import com.fica.events.data.models.CongressYear
import com.fica.events.ui.components.AvatarView
import com.fica.events.ui.components.DashboardSkeleton
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
fun HomeScreen(
    onLogout: (() -> Unit)? = null,
    onSeeAllSpeakers: (() -> Unit)? = null,
    onSeeAllSponsors: (() -> Unit)? = null,
) {
    var sessions by remember { mutableStateOf<List<Session>>(emptyList()) }
    var speakers by remember { mutableStateOf<List<Speaker>>(emptyList()) }
    var announcements by remember { mutableStateOf<List<Announcement>>(emptyList()) }
    var sponsors by remember { mutableStateOf<List<Sponsor>>(emptyList()) }
    var networkingEvents by remember { mutableStateOf<List<NetworkingEvent>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showProfile by remember { mutableStateOf(false) }

    val user = AuthManager.currentUser
    val firstName = user?.name?.split(" ")?.firstOrNull() ?: "Delegate"
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        isLoading = true
        try {
            coroutineScope {
                val currentYear = CongressYear.Y2026.year
                val sessionsDeferred = async { ApiClient.service.getSessions(year = currentYear) }
                val speakersDeferred = async { ApiClient.service.getSpeakers(year = currentYear) }
                val announcementsDeferred = async { ApiClient.service.getAnnouncements() }
                val sponsorsDeferred = async { ApiClient.service.getSponsors(year = currentYear) }
                val eventsDeferred = async { ApiClient.service.getNetworkingEvents(year = currentYear) }

                // Materialize data first; don't commit to state yet so the
                // skeleton stays up while we warm the image cache.
                val sessionsData = sessionsDeferred.await().body()?.sessions ?: emptyList()
                val speakersData = speakersDeferred.await().body()?.speakers ?: emptyList()
                val announcementsData = announcementsDeferred.await().body()?.announcements ?: emptyList()
                val sponsorsData = sponsorsDeferred.await().body()?.sponsors ?: emptyList()
                val eventsData = eventsDeferred.await().body()?.slots ?: emptyList()

                // Every remote image URL the dashboard will render. Deduped
                // because the same speaker photo shows up in both the
                // Keynotes strip and session cards.
                val imageUrls = (
                    sponsorsData.mapNotNull { it.logo_url?.takeIf(String::isNotBlank) } +
                    speakersData.mapNotNull { it.photo_url?.takeIf(String::isNotBlank) } +
                    sessionsData.mapNotNull { it.speaker_photo?.takeIf(String::isNotBlank) }
                ).distinct()

                // Warm Coil's memory + disk cache in parallel. AsyncImage
                // will hit cache on first composition instead of showing a
                // blank box and streaming the image in. Failures are
                // tolerated — if a URL can't be prefetched, AsyncImage
                // still attempts to load it on-appear.
                if (imageUrls.isNotEmpty()) {
                    val loader = context.imageLoader
                    imageUrls.map { url ->
                        async {
                            val req = ImageRequest.Builder(context)
                                .data(url)
                                .memoryCachePolicy(CachePolicy.ENABLED)
                                .diskCachePolicy(CachePolicy.ENABLED)
                                .build()
                            loader.execute(req)
                        }
                    }.awaitAll()
                }

                // Cache is warm — commit state so the dashboard paints
                // once with all imagery already decoded.
                sessions = sessionsData
                speakers = speakersData
                announcements = announcementsData
                sponsors = sponsorsData
                networkingEvents = eventsData
            }
        } catch (_: Exception) { }
        isLoading = false
    }

    // Profile bottom sheet — leaves iOS-style top gap (sheet doesn't cover status bar area)
    if (showProfile) {
        ModalBottomSheet(
            onDismissRequest = { showProfile = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = FICABg,
            contentWindowInsets = { WindowInsets(top = 0, bottom = 0, left = 0, right = 0) },
            modifier = Modifier.windowInsetsPadding(WindowInsets.statusBars),
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
            DashboardSkeleton()
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp),
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

                // Sponsors promoted to near the top — brand visibility sits above
                // everything except the hero + quick stats. Mirrors the iOS home layout.
                if (sponsors.isNotEmpty()) {
                    SponsorsSection(sponsors = sponsors, onSeeAll = onSeeAllSponsors)
                }

                // Announcements
                val publishedAnnouncements = announcements.filter { it.published.toBool() }
                if (publishedAnnouncements.isNotEmpty()) {
                    AnnouncementsSection(announcements = publishedAnnouncements.take(3))
                }

                // Upcoming Sessions
                if (sessions.isNotEmpty()) {
                    SessionsSection(sessions = sessions.take(6))
                }

                // Keynote Speakers
                val keynoteSpeakers = speakers.filter { it.is_keynote.toBool() }
                if (keynoteSpeakers.isNotEmpty()) {
                    SpeakersSection(speakers = keynoteSpeakers, onSeeAll = onSeeAllSpeakers)
                }

                // Networking Events
                if (networkingEvents.isNotEmpty()) {
                    EventsSection(events = networkingEvents.take(5))
                }

                Spacer(modifier = Modifier.height(100.dp))
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
            .shadow(10.dp, RoundedCornerShape(20.dp), ambientColor = FICANavy.copy(alpha = 0.25f))
            .clip(RoundedCornerShape(20.dp))
            .background(FICAHeroGradient)
            .padding(vertical = 22.dp, horizontal = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // Welcome text
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = "Welcome, $firstName",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                lineHeight = 28.sp,
            )
            Text(
                text = "Charting New Horizons for a Changing World",
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = Color.White.copy(alpha = 0.70f),
                textAlign = TextAlign.Center,
                lineHeight = 16.sp,
                modifier = Modifier.padding(horizontal = 8.dp),
            )
        }

        // Info pills row — tighter, bigger icons
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
                        Color.White.copy(alpha = 0.14f),
                        RoundedCornerShape(50),
                    )
                    .padding(horizontal = 14.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(7.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.QrCode,
                    contentDescription = null,
                    tint = FICAGold,
                    modifier = Modifier.size(13.dp),
                )
                Text(
                    text = code,
                    fontSize = 13.sp,
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
        verticalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = FICAGold,
            modifier = Modifier.size(20.dp),
        )
        Text(
            text = text,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.White.copy(alpha = 0.90f),
            textAlign = TextAlign.Center,
            lineHeight = 14.sp,
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
            .shadow(1.5.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .background(FICACard, RoundedCornerShape(14.dp))
            .padding(vertical = 14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(26.dp),
        )
        Text(
            text = value,
            fontSize = 26.sp,
            fontWeight = FontWeight.Black,
            color = FICAText,
            lineHeight = 30.sp,
        )
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = FICAMuted,
            lineHeight = 14.sp,
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

    // Match iOS style: tight, filled card — no colored accent strip, compact layout.
    Column(
        modifier = Modifier
            .width(220.dp)
            .shadow(1.5.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .clip(RoundedCornerShape(14.dp))
            .background(FICACard)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // Row 1: type chip (icon + label, like iOS)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Icon(
                imageVector = Icons.Filled.CalendarMonth,
                contentDescription = null,
                tint = typeColor,
                modifier = Modifier.size(12.dp),
            )
            Text(
                text = (session.sessionType ?: "session").replaceFirstChar { it.uppercase() },
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = typeColor,
            )
        }

        // Row 2: title
        Text(
            text = session.title,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            color = FICAText,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            lineHeight = 19.sp,
        )

        // Row 3: time
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(
                imageVector = Icons.Filled.Schedule,
                contentDescription = null,
                tint = FICAMuted,
                modifier = Modifier.size(11.dp),
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

// ── Announcements Section ──────────────────────────────────────────────────

@Composable
private fun AnnouncementsSection(announcements: List<Announcement>) {
    // Track which rows are expanded. Lifted to the section so each row's
    // expanded state survives recomposition as siblings grow/shrink. Matches
    // iOS HomeView's `expandedAnnouncements: Set<Int>`.
    var expandedIds by remember { mutableStateOf(setOf<Int>()) }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionHeader(title = "Announcements")
        Column(
            modifier = Modifier.padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            announcements.forEach { announcement ->
                val isExpanded = expandedIds.contains(announcement.id)
                AnnouncementRow(
                    announcement = announcement,
                    isExpanded = isExpanded,
                    onToggle = {
                        expandedIds = if (isExpanded) {
                            expandedIds - announcement.id
                        } else {
                            expandedIds + announcement.id
                        }
                    },
                )
            }
        }
    }
}

@Composable
private fun AnnouncementRow(
    announcement: Announcement,
    isExpanded: Boolean,
    onToggle: () -> Unit,
) {
    val isUrgent = announcement.priority == "urgent"
    val accent = if (isUrgent) FICADanger else FICAGold
    val bodyLength = announcement.body?.length ?: 0
    // Show the chevron affordance only when tapping actually changes what
    // you see — either we're already expanded (so "Show less" must be
    // tappable), or the body is long enough to be worth revealing.
    val showChevron = isExpanded || bodyLength > 60

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(1.5.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.03f))
            .clip(RoundedCornerShape(14.dp))
            .background(FICACard)
            .clickable { onToggle() }
            .animateContentSize(animationSpec = tween(durationMillis = 250))
            .padding(horizontal = 14.dp, vertical = 14.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Icon — rounded-square container
        Box(
            modifier = Modifier
                .size(46.dp)
                .background(accent.copy(alpha = 0.12f), RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = if (isUrgent) Icons.Filled.Warning else Icons.Filled.Notifications,
                contentDescription = null,
                tint = accent,
                modifier = Modifier.size(22.dp),
            )
        }

        // Content — title + relative time on the same row, body below, then
        // the expand/collapse affordance when applicable.
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Row(
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = announcement.title,
                    modifier = Modifier.weight(1f),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAText,
                    lineHeight = 18.sp,
                    maxLines = if (isExpanded) Int.MAX_VALUE else 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = announcement.created_at.relativeTime(),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = FICAMuted,
                )
            }

            announcement.body?.takeIf { it.isNotEmpty() }?.let { body ->
                Text(
                    text = body,
                    fontSize = 13.sp,
                    color = FICASecondary,
                    lineHeight = 16.sp,
                    maxLines = if (isExpanded) Int.MAX_VALUE else 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            if (showChevron) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.End,
                ) {
                    Text(
                        text = if (isExpanded) "Show less" else "Read more",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = accent.copy(alpha = 0.75f),
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        imageVector = if (isExpanded) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                        contentDescription = null,
                        tint = accent.copy(alpha = 0.75f),
                        modifier = Modifier.size(14.dp),
                    )
                }
            }
        }
    }
}

// ── Speakers Section ───────────────────────────────────────────────────────

@Composable
private fun SpeakersSection(speakers: List<Speaker>, onSeeAll: (() -> Unit)?) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionHeader(
            title = "Keynote Speakers",
            actionLabel = if (onSeeAll != null) "See All" else null,
            onAction = onSeeAll,
        )
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
            .width(120.dp)
            .shadow(1.5.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .background(FICACard, RoundedCornerShape(14.dp))
            .padding(vertical = 16.dp, horizontal = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        AvatarView(
            name = speaker.name,
            photoUrl = speaker.photo_url,
            size = 72.dp,
            borderColor = FICAGold,
            borderWidth = 2.dp,
        )
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(1.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                text = speaker.name,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
                lineHeight = 15.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                text = speaker.organization ?: "",
                fontSize = 11.sp,
                color = FICAMuted,
                lineHeight = 13.sp,
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
            .shadow(1.5.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.03f))
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
private fun SponsorsSection(sponsors: List<Sponsor>, onSeeAll: (() -> Unit)?) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionHeader(
            title = "Sponsors",
            actionLabel = if (onSeeAll != null) "See All" else null,
            onAction = onSeeAll,
        )
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
            .width(110.dp)
            .shadow(1.5.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .background(FICACard, RoundedCornerShape(14.dp))
            .padding(vertical = 14.dp, horizontal = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // Logo slot — real logo via Coil when logo_url is set, 2-letter
        // initials fallback for empty/null URLs. Mirrors SponsorsScreen so
        // the home-screen card and the full sponsors page render the same
        // way; previously the home card only ever showed the placeholder.
        Box(
            modifier = Modifier
                .size(width = 72.dp, height = 56.dp)
                .background(FICAInputBg, RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center,
        ) {
            if (!sponsor.logo_url.isNullOrBlank()) {
                AsyncImage(
                    model = sponsor.logo_url,
                    contentDescription = sponsor.name,
                    modifier = Modifier.fillMaxSize().padding(6.dp),
                    contentScale = ContentScale.Fit,
                )
            } else {
                Text(
                    text = sponsor.name.take(2).uppercase(),
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black,
                    color = FICANavy,
                    lineHeight = 24.sp,
                )
            }
        }
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                text = sponsor.name,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                lineHeight = 15.sp,
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                text = sponsor.tier?.replaceFirstChar { it.uppercase() } ?: "",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = FICAGold,
                textAlign = TextAlign.Center,
                lineHeight = 13.sp,
            )
        }
    }
}
