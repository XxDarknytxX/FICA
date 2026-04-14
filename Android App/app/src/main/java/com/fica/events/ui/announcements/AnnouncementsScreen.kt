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
        // ── Header ───────────────────────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(FICABg),
        ) {
            Text(
                text = "Updates",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = FICAText,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp, bottom = 16.dp),
                textAlign = TextAlign.Center,
            )
            HorizontalDivider(color = FICABorder, thickness = 0.5.dp)
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
                    contentPadding = PaddingValues(top = 16.dp, bottom = 140.dp),
                    verticalArrangement = Arrangement.spacedBy(0.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    // ── Networking Events ─────────────────────────────────
                    if (networkingEvents.isNotEmpty()) {
                        item {
                            SectionHeader(title = "Networking Events")
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                        items(networkingEvents, key = { it.id }) { event ->
                            NetworkingEventCard(event = event)
                        }
                        item { Spacer(modifier = Modifier.height(16.dp)) }
                    }

                    // ── Announcements ─────────────────────────────────────
                    item {
                        SectionHeader(title = "Announcements")
                        Spacer(modifier = Modifier.height(8.dp))
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
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 5.dp)
            .shadow(3.dp, RoundedCornerShape(16.dp), ambientColor = Color.Black.copy(alpha = 0.05f))
            .clip(RoundedCornerShape(16.dp))
            .background(FICACard)
            .padding(18.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Event type icon
        EventTypeIcon(type = event.type, size = 44)

        Spacer(modifier = Modifier.width(14.dp))

        // Event details
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(
                event.title,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (!event.slot_date.isNullOrBlank()) {
                    InfoChip(icon = Icons.Filled.CalendarMonth, text = event.slot_date)
                }
                if (!event.start_time.isNullOrBlank()) {
                    val timeText = event.start_time +
                        if (!event.end_time.isNullOrBlank()) " – ${event.end_time}" else ""
                    InfoChip(icon = Icons.Filled.Schedule, text = timeText)
                }
            }

            if (!event.location.isNullOrBlank()) {
                InfoChip(icon = Icons.Filled.LocationOn, text = event.location)
            }

            if (!event.dress_code.isNullOrBlank()) {
                Text(
                    text = event.dress_code,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAGold,
                    modifier = Modifier
                        .background(FICAGold.copy(alpha = 0.1f), RoundedCornerShape(50))
                        .padding(horizontal = 10.dp, vertical = 3.dp),
                )
            }
        }

        // Capacity
        if (event.capacity != null) {
            Spacer(modifier = Modifier.width(8.dp))
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .background(FICABg, RoundedCornerShape(10.dp))
                    .padding(horizontal = 8.dp, vertical = 6.dp),
            ) {
                Icon(
                    Icons.Filled.Groups,
                    contentDescription = null,
                    tint = FICAMuted,
                    modifier = Modifier.size(14.dp),
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    "${event.capacity}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = FICASecondary,
                )
            }
        }
    }
}

// ── Event Type Icon ──────────────────────────────────────────────────────────

@Composable
private fun EventTypeIcon(type: String?, size: Int) {
    val color = SessionTypeColors.colorFor(type)
    val icon: ImageVector = when (type?.lowercase()) {
        "networking" -> Icons.Filled.Groups
        "social" -> Icons.Filled.Groups
        "dinner" -> Icons.Filled.Groups
        else -> Icons.Filled.CalendarMonth
    }
    Box(
        modifier = Modifier
            .size(size.dp)
            .background(color.copy(alpha = 0.12f), RoundedCornerShape((size * 0.28f).dp)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size((size * 0.45f).dp))
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
            .shadow(3.dp, RoundedCornerShape(16.dp), ambientColor = Color.Black.copy(alpha = 0.05f))
            .clip(RoundedCornerShape(16.dp))
            .background(FICACard)
            .padding(18.dp),
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
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                // Title row with optional URGENT badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        announcement.title,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = FICAText,
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
                )
            }
        }

        // Body text
        if (!announcement.body.isNullOrBlank()) {
            Text(
                announcement.body,
                fontSize = 13.sp,
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
