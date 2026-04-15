package com.fica.events.ui.announcements

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsOff
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Celebration
import androidx.compose.material.icons.filled.LocalBar
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fica.events.data.api.ApiClient
import com.fica.events.data.models.Announcement
import com.fica.events.data.models.NetworkingEvent
import com.fica.events.ui.components.*
import com.fica.events.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

// ── Relative time helper ─────────────────────────────────────────────────────

private fun relativeTime(isoString: String?): String {
    if (isoString.isNullOrBlank()) return ""
    return try {
        val formats = listOf(
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US),
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US),
            SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US),
        )
        var date: Date? = null
        for (fmt in formats) {
            try {
                fmt.isLenient = false
                date = fmt.parse(isoString)
                if (date != null) break
            } catch (_: Exception) {}
        }
        if (date == null) return isoString
        val diff = System.currentTimeMillis() - date.time
        val mins = TimeUnit.MILLISECONDS.toMinutes(diff)
        val hours = TimeUnit.MILLISECONDS.toHours(diff)
        val days = TimeUnit.MILLISECONDS.toDays(diff)
        when {
            mins < 1 -> "Just now"
            mins < 60 -> "${mins}m ago"
            hours < 24 -> "${hours}h ago"
            days < 7 -> "${days}d ago"
            else -> SimpleDateFormat("d MMM", Locale.US).format(date)
        }
    } catch (_: Exception) {
        isoString
    }
}

// ── Main Screen ──────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnnouncementsScreen() {
    var announcements by remember { mutableStateOf<List<Announcement>>(emptyList()) }
    var networkingEvents by remember { mutableStateOf<List<NetworkingEvent>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isRefreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val loadData: suspend () -> Unit = {
        try {
            val aResp = ApiClient.service.getAnnouncements()
            if (aResp.isSuccessful) announcements = aResp.body()?.announcements ?: emptyList()
        } catch (_: Exception) {}
        try {
            val neResp = ApiClient.service.getNetworkingEvents(year = 2026)
            if (neResp.isSuccessful) networkingEvents = neResp.body()?.slots ?: emptyList()
        } catch (_: Exception) {}
        isLoading = false
        isRefreshing = false
    }

    LaunchedEffect(Unit) { loadData() }

    val publishedAnnouncements = announcements.filter { it.published == 1 }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FICABg),
    ) {
        // ── Header ─ matches Agenda/Networking/Profile titles ──────────
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .background(FICABg),
        ) {
            Text(
                text = "Updates",
                fontSize = 17.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 14.dp, bottom = 12.dp),
                textAlign = TextAlign.Center,
            )
        }

        // ── Content ──────────────────────────────────────────────────────
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = {
                isRefreshing = true
                scope.launch { loadData() }
            },
            modifier = Modifier.fillMaxSize(),
        ) {
            if (isLoading) {
                LoadingView(message = "Loading updates...")
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(top = 8.dp, bottom = 120.dp),
                    verticalArrangement = Arrangement.spacedBy(0.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    // ── Networking Events ─────────────────────────────────
                    if (networkingEvents.isNotEmpty()) {
                        item {
                            SectionHeader(title = "Networking Events")
                            Spacer(modifier = Modifier.height(6.dp))
                        }
                        items(networkingEvents, key = { it.id }) { event ->
                            NetworkingEventCard(event = event)
                        }
                        item { Spacer(modifier = Modifier.height(10.dp)) }
                    }

                    // ── Announcements ─────────────────────────────────────
                    item {
                        SectionHeader(title = "Announcements")
                        Spacer(modifier = Modifier.height(6.dp))
                    }

                    if (publishedAnnouncements.isEmpty()) {
                        item {
                            EmptyStateView(
                                icon = Icons.Filled.NotificationsOff,
                                title = "No announcements yet",
                                subtitle = "Check back closer to the event",
                            )
                        }
                    } else {
                        items(publishedAnnouncements, key = { it.id }) { announcement ->
                            AnnouncementCard(announcement = announcement)
                        }
                    }
                }
            }
        }
    }
}

// ── Networking Event Card ────────────────────────────────────────────────────

@Composable
private fun NetworkingEventCard(event: NetworkingEvent) {
    // Compact, iOS-style: single line title + one row of inline icons + compact capacity
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 4.dp)
            .shadow(1.5.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .clip(RoundedCornerShape(14.dp))
            .background(FICACard)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Event type icon — colored per type (wine glass for cocktails, plate for dinners, etc.)
        EventTypeIcon(type = event.type, title = event.title, size = 40)

        Spacer(modifier = Modifier.width(12.dp))

        // Event details — compact
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Text(
                event.title,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
                lineHeight = 17.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )

            // Inline row: date · time (both on one line, compact chips)
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (!event.slot_date.isNullOrBlank()) {
                    CompactChip(icon = Icons.Filled.CalendarMonth, text = shortDate(event.slot_date))
                }
                if (!event.start_time.isNullOrBlank()) {
                    val timeText = event.start_time +
                        if (!event.end_time.isNullOrBlank()) " – ${event.end_time}" else ""
                    CompactChip(icon = Icons.Filled.Schedule, text = timeText)
                }
            }

            // Location on its own line (small pin + muted text)
            if (!event.location.isNullOrBlank()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Icon(
                        Icons.Filled.LocationOn,
                        contentDescription = null,
                        tint = FICAMuted,
                        modifier = Modifier.size(11.dp),
                    )
                    Text(
                        text = event.location,
                        fontSize = 11.sp,
                        color = FICAMuted,
                        lineHeight = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }

        // Compact capacity — just icon + number stacked, no bg
        if (event.capacity != null) {
            Spacer(modifier = Modifier.width(8.dp))
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Filled.Groups,
                    contentDescription = null,
                    tint = FICAMuted,
                    modifier = Modifier.size(14.dp),
                )
                Text(
                    "${event.capacity}",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = FICAMuted,
                    lineHeight = 12.sp,
                )
            }
        }
    }
}

// Convert ISO date ("2026-05-08") → display format ("8 May")
private fun shortDate(iso: String): String {
    return try {
        val parts = iso.split("-")
        val day = parts[2].toIntOrNull() ?: return iso
        val monthIdx = (parts[1].toIntOrNull() ?: return iso) - 1
        val months = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
        "$day ${months[monthIdx]}"
    } catch (_: Exception) {
        iso
    }
}

// Small inline chip used inside NetworkingEventCard (icon + text, no bg)
@Composable
private fun CompactChip(
    icon: ImageVector,
    text: String,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = FICASecondary,
            modifier = Modifier.size(11.dp),
        )
        Text(
            text = text,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = FICASecondary,
            lineHeight = 13.sp,
        )
    }
}

// ── Event Type Icon (different icons + colors per event type, iOS-style) ─────

@Composable
private fun EventTypeIcon(type: String?, title: String?, size: Int) {
    // Detect from type first, fall back to title keywords
    val key = when {
        type?.lowercase() == "cocktail" -> "cocktail"
        type?.lowercase() == "dinner" -> "dinner"
        type?.lowercase() == "gala" -> "gala"
        title?.lowercase()?.contains("cocktail") == true -> "cocktail"
        title?.lowercase()?.contains("dinner") == true -> "dinner"
        else -> "default"
    }

    val icon: ImageVector = when (key) {
        "cocktail" -> Icons.Filled.LocalBar         // wine glass
        "dinner" -> Icons.Filled.Restaurant         // fork + knife
        "gala" -> Icons.Filled.Celebration          // party/champagne
        else -> Icons.Filled.Groups
    }
    val color = when (key) {
        "cocktail" -> Color(0xFF9333EA)             // vivid purple
        "dinner" -> Color(0xFF059669)               // emerald green
        "gala" -> Color(0xFFC9A84C)                 // FICA gold
        else -> FICANavy
    }

    Box(
        modifier = Modifier
            .size(size.dp)
            .background(color.copy(alpha = 0.12f), RoundedCornerShape((size * 0.28f).dp)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size((size * 0.50f).dp))
    }
}

// ── Announcement Card ────────────────────────────────────────────────────────

@Composable
private fun AnnouncementCard(announcement: Announcement) {
    val priorityIcon: ImageVector
    val priorityColor: Color
    when (announcement.priority?.lowercase()) {
        "urgent" -> {
            priorityIcon = Icons.Filled.Warning
            priorityColor = FICADanger
        }
        "important" -> {
            priorityIcon = Icons.Filled.Notifications
            priorityColor = FICAWarning
        }
        else -> {
            priorityIcon = Icons.Filled.Info
            priorityColor = FICAGold
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 5.dp)
            .shadow(1.5.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .clip(RoundedCornerShape(14.dp))
            .background(FICACard)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Header row: icon + title/meta
        Row(
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // Priority icon box — fixed 44dp to match event card icons
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(priorityColor.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    priorityIcon,
                    contentDescription = null,
                    tint = priorityColor,
                    modifier = Modifier.size(20.dp),
                )
            }

            // Title + meta
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(1.dp),
            ) {
                // Title row with optional URGENT badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        announcement.title,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = FICAText,
                        lineHeight = 18.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    if (announcement.priority?.lowercase() == "urgent") {
                        Text(
                            text = "URGENT",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White,
                            modifier = Modifier
                                .background(FICADanger, RoundedCornerShape(50))
                                .padding(horizontal = 7.dp, vertical = 2.dp),
                        )
                    }
                }

                // Timestamp — relative
                Text(
                    relativeTime(announcement.created_at),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = FICAMuted,
                    lineHeight = 13.sp,
                )
            }
        }

        // Body text
        if (!announcement.body.isNullOrBlank()) {
            Text(
                announcement.body,
                fontSize = 14.sp,
                color = FICASecondary,
                lineHeight = 19.sp,
            )
        }

        // Target audience chip
        if (announcement.target != null && announcement.target != "all") {
            InfoChip(
                icon = Icons.Filled.Groups,
                text = "For ${announcement.target} attendees",
                color = FICAMuted,
            )
        }
    }
}
