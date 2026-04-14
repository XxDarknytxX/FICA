package com.fica.events.ui.agenda

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fica.events.data.api.ApiClient
import com.fica.events.data.models.CongressYear
import com.fica.events.data.models.Session
import com.fica.events.data.models.SessionGroup
import com.fica.events.ui.components.AvatarView
import com.fica.events.ui.components.EmptyStateView
import com.fica.events.ui.components.LoadingView
import com.fica.events.ui.theme.FICABg
import com.fica.events.ui.theme.FICABorder
import com.fica.events.ui.theme.FICACard
import com.fica.events.ui.theme.FICAGold
import com.fica.events.ui.theme.FICAMuted
import com.fica.events.ui.theme.FICANavy
import com.fica.events.ui.theme.FICASecondary
import com.fica.events.ui.theme.FICAText
import com.fica.events.ui.theme.SessionTypeColors
import kotlinx.coroutines.launch

private data class TypeOption(val key: String?, val label: String)

private val types = listOf(
    TypeOption(null, "All"),
    TypeOption("keynote", "Keynote"),
    TypeOption("panel", "Panel"),
    TypeOption("ceremony", "Ceremony"),
    TypeOption("networking", "Social"),
    TypeOption("break", "Break"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgendaScreen() {
    var sessions by remember { mutableStateOf<List<Session>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedCongress by remember { mutableStateOf(CongressYear.Y2026) }
    var selectedDay by remember { mutableStateOf(CongressYear.Y2026.dayDates.first().date) }
    var selectedType by remember { mutableStateOf<String?>(null) }
    var isRefreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun loadSessions() {
        try {
            val response = ApiClient.service.getSessions(year = selectedCongress.year)
            sessions = response.body()?.sessions ?: emptyList()
        } catch (_: Exception) { }
    }

    LaunchedEffect(selectedCongress) {
        isLoading = sessions.isEmpty()
        loadSessions()
        isLoading = false
    }

    // Build grouped sections in time order
    val grouped = remember(sessions, selectedDay, selectedType) {
        val daySessions = sessions
            .filter { (it.session_date ?: "").startsWith(selectedDay) }
            .filter { selectedType == null || it.sessionType?.lowercase() == selectedType }
            .sortedBy { it.start_time ?: "" }

        val sections = mutableListOf<SessionSection>()
        var currentKey = ""
        var currentItems = mutableListOf<Session>()
        val seenGroups = mutableSetOf<String>()

        for (s in daySessions) {
            val groupKey = s.session_group ?: "_u"
            if (groupKey != currentKey) {
                if (currentItems.isNotEmpty()) {
                    val group = SessionGroup.fromKey(if (currentKey == "_u") null else currentKey)
                    val showHeader = group != null && group.key !in seenGroups
                    if (group != null) seenGroups.add(group.key)
                    sections.add(SessionSection(currentKey + "_${sections.size}", group, showHeader, currentItems.toList()))
                    currentItems = mutableListOf()
                }
                currentKey = groupKey
            }
            currentItems.add(s)
        }
        if (currentItems.isNotEmpty()) {
            val group = SessionGroup.fromKey(if (currentKey == "_u") null else currentKey)
            val showHeader = group != null && group.key !in seenGroups
            sections.add(SessionSection(currentKey + "_${sections.size}", group, showHeader, currentItems.toList()))
        }
        sections
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FICABg),
    ) {
        CenterAlignedTopAppBar(
            title = { Text("Agenda", fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = FICAText) },
            colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = FICABg),
        )

        // Congress year picker
        SingleChoiceSegmentedButtonRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 4.dp),
        ) {
            CongressYear.entries.forEachIndexed { index, year ->
                SegmentedButton(
                    selected = selectedCongress == year,
                    onClick = {
                        selectedCongress = year
                        selectedDay = year.dayDates.first().date
                        selectedType = null
                    },
                    shape = SegmentedButtonDefaults.itemShape(index = index, count = CongressYear.entries.size),
                ) {
                    Text(year.label, fontSize = 13.sp)
                }
            }
        }

        // Day picker
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            selectedCongress.dayDates.forEach { day ->
                val isSelected = selectedDay == day.date
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { selectedDay = day.date },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = if (isSelected) FICANavy else FICACard),
                    elevation = if (isSelected) CardDefaults.cardElevation(6.dp) else CardDefaults.cardElevation(0.dp),
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Text(day.label, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = if (isSelected) Color.White else FICASecondary)
                        Text(day.subtitle, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = if (isSelected) Color.White else FICASecondary)
                    }
                }
            }
        }

        // Type chips
        Row(
            modifier = Modifier
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            types.forEach { type ->
                val isSelected = selectedType == type.key
                Text(
                    text = type.label,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isSelected) FICANavy else FICAMuted,
                    modifier = Modifier
                        .clickable { selectedType = type.key }
                        .background(if (isSelected) FICANavy.copy(alpha = 0.1f) else FICACard, RoundedCornerShape(50))
                        .border(1.dp, if (isSelected) FICANavy.copy(alpha = 0.3f) else FICABorder, RoundedCornerShape(50))
                        .padding(horizontal = 14.dp, vertical = 7.dp),
                )
            }
        }

        // Content
        if (isLoading) {
            LoadingView(message = "Loading agenda...")
        } else {
            PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh = { scope.launch { isRefreshing = true; loadSessions(); isRefreshing = false } },
                modifier = Modifier.fillMaxSize(),
            ) {
                if (grouped.isEmpty()) {
                    EmptyStateView(icon = Icons.Outlined.CalendarMonth, title = "No sessions found", subtitle = "Try a different filter")
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        grouped.forEach { section ->
                            if (section.showHeader && section.group != null) {
                                item(key = "header_${section.key}") {
                                    SessionGroupHeader(group = section.group, congress = selectedCongress)
                                }
                            }
                            items(section.sessions, key = { it.id }) { session ->
                                AgendaSessionCard(session = session)
                            }
                        }
                        item { Spacer(modifier = Modifier.height(140.dp)) }
                    }
                }
            }
        }
    }
}

// ── Data ──────────────────────────────────────────────────────────────────────

private data class SessionSection(
    val key: String,
    val group: SessionGroup?,
    val showHeader: Boolean,
    val sessions: List<Session>,
)

// ── Group Header ──────────────────────────────────────────────────────────────

@Composable
private fun SessionGroupHeader(group: SessionGroup, congress: CongressYear) {
    Column {
        HorizontalDivider(
            modifier = Modifier.padding(top = 16.dp, bottom = 12.dp),
            thickness = 0.5.dp,
            color = FICABorder,
        )
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(group.color, CircleShape),
            )
            Column {
                Text(
                    text = group.label.uppercase(),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = FICAMuted,
                    letterSpacing = 0.8.sp,
                )
                group.subtitle(congress)?.let { sub ->
                    Text(
                        text = sub,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = FICASecondary,
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
    }
}

// ── Session Card ──────────────────────────────────────────────────────────────

@Composable
private fun AgendaSessionCard(session: Session) {
    var expanded by remember { mutableStateOf(false) }
    val group = SessionGroup.fromKey(session.session_group)
    val accentColor = group?.color ?: SessionTypeColors.colorFor(session.sessionType)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .shadow(4.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .background(FICACard, RoundedCornerShape(14.dp))
            .clip(RoundedCornerShape(14.dp)),
    ) {
        Box(modifier = Modifier.width(4.dp).fillMaxHeight().background(accentColor))

        Column(
            modifier = Modifier.weight(1f).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // Type badge + time
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = session.sessionType?.replaceFirstChar { it.uppercase() } ?: "Session",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = accentColor,
                )
                if (session.start_time != null && session.end_time != null) {
                    Text(
                        text = "${session.start_time} - ${session.end_time}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        fontFamily = FontFamily.Monospace,
                        color = FICAMuted,
                    )
                }
            }

            // Title
            Text(session.title, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = FICAText)

            // Location
            if (!session.location.isNullOrBlank()) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Outlined.Place, null, tint = FICAMuted, modifier = Modifier.size(14.dp))
                    Text(session.location, fontSize = 12.sp, color = FICAMuted)
                }
            }

            // Speaker
            if (!session.speaker_name.isNullOrBlank()) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AvatarView(name = session.speaker_name, photoUrl = session.speaker_photo, size = 28.dp, borderColor = FICABorder, borderWidth = 1.dp)
                    Column {
                        Text(session.speaker_name, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = FICAText)
                        session.speaker_title?.let { Text(it, fontSize = 10.sp, color = FICAMuted, maxLines = 1) }
                    }
                }
            }

            // Description with smart read-more
            if (!session.description.isNullOrBlank()) {
                Column(
                    modifier = Modifier.animateContentSize(),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    var hasOverflow by remember { mutableStateOf(false) }
                    Text(
                        text = session.description,
                        fontSize = 12.sp,
                        color = FICASecondary,
                        maxLines = if (expanded) Int.MAX_VALUE else 2,
                        overflow = TextOverflow.Ellipsis,
                        onTextLayout = { result -> hasOverflow = result.hasVisualOverflow },
                    )
                    if (hasOverflow || expanded) {
                        Text(
                            text = if (expanded) "Show less" else "Read more",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = FICAGold,
                            modifier = Modifier.clickable { expanded = !expanded },
                        )
                    }
                }
            }
        }
    }
}
