package com.fica.events.ui.panels

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fica.events.data.api.ApiClient
import com.fica.events.data.api.ChatWebSocket
import com.fica.events.data.models.CongressYear
import com.fica.events.data.models.Panel
import com.fica.events.data.models.SessionGroup
import com.fica.events.ui.components.AvatarView
import com.fica.events.ui.components.EmptyStateView
import com.fica.events.ui.components.LoadingView
import com.fica.events.ui.theme.FICABg
import com.fica.events.ui.theme.FICABorder
import com.fica.events.ui.theme.FICACard
import com.fica.events.ui.theme.FICADanger
import com.fica.events.ui.theme.FICAGold
import com.fica.events.ui.theme.FICAMuted
import com.fica.events.ui.theme.FICANavy
import com.fica.events.ui.theme.FICASecondary
import com.fica.events.ui.theme.FICASuccess
import com.fica.events.ui.theme.FICAText
import kotlinx.coroutines.launch

/**
 * Tab-root screen listing every `type='panel'` session for the current
 * congress year. Redesign ports the iOS PanelsView rework: each row is
 * a specialized agenda-style card with a colored accent bar on the left,
 * session-group label, quiet status dot, and a Q&A-forward footer.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PanelsScreen(onOpenPanel: (Int) -> Unit) {
    var panels by remember { mutableStateOf<List<Panel>>(emptyList()) }
    var responseFlag by remember { mutableStateOf(true) }
    var isLoading by remember { mutableStateOf(true) }
    var isRefreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun load() {
        try {
            val resp = ApiClient.service.getPanels(year = CongressYear.Y2026.year)
            val body = resp.body()
            panels = body?.panels ?: emptyList()
            responseFlag = body?.panel_discussion_enabled ?: true
        } catch (_: Exception) {
            // Leave prior list in place on failure.
        }
    }

    LaunchedEffect(Unit) {
        isLoading = panels.isEmpty()
        load()
        isLoading = false
    }

    // Live updates — admin flipping a panel's discussion open/closed is
    // pushed over the shared WebSocket; patch the matching row in place.
    DisposableEffect(Unit) {
        val token = ChatWebSocket.addPanelDiscussionHandler { sessionId, enabled ->
            panels = panels.map { p ->
                if (p.id == sessionId) p.copy(discussion_enabled = enabled) else p
            }
        }
        onDispose { ChatWebSocket.removePanelDiscussionHandler(token) }
    }

    Column(modifier = Modifier.fillMaxSize().background(FICABg)) {
        CenterAlignedTopAppBar(
            title = {
                Text(
                    text = "Panels",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAText,
                )
            },
            colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = FICABg),
        )

        if (isLoading && panels.isEmpty()) {
            LoadingView(message = "Loading panels...")
        } else if (panels.isEmpty()) {
            EmptyStateView(
                icon = Icons.Filled.Forum,
                title = "No panel discussions yet",
                subtitle = "Panels will appear here when the schedule is finalized.",
            )
        } else {
            PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh = {
                    scope.launch {
                        isRefreshing = true
                        load()
                        isRefreshing = false
                    }
                },
                modifier = Modifier.fillMaxSize(),
            ) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(
                        start = 20.dp, end = 20.dp, top = 6.dp, bottom = 24.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item(key = "__summary") {
                        // Quiet header: count + open/closed split.
                        val open = panels.count { it.isDiscussionEnabled }
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 4.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "${panels.size} panel${if (panels.size == 1) "" else "s"}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = FICAMuted,
                                letterSpacing = 0.8.sp,
                            )
                            Text(
                                text = "$open open · ${panels.size - open} closed",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = FICAMuted,
                            )
                        }
                    }
                    items(panels, key = { it.id }) { panel ->
                        PanelCard(panel = panel, onClick = { onOpenPanel(panel.id) })
                    }
                }
            }
        }
    }
}

/**
 * Derive a SessionGroup from the panel title. Mirrors the iOS heuristic —
 * Panel rows don't carry `session_group` yet, so we inspect the title for
 * known keywords. Returns null when it can't classify; the card then
 * falls back to the FICA navy accent.
 *
 * Shared with PanelDetailScreen so both views pick the same accent for
 * a given panel.
 */
internal fun panelSessionGroup(panel: Panel): SessionGroup? {
    val t = panel.title.lowercase()
    return when {
        t.contains("session 1") || t.contains("positioning") -> SessionGroup.SESSION1
        t.contains("session 2") || t.contains("transforming") -> SessionGroup.SESSION2
        t.contains("session 3") || t.contains("global standards") || t.contains("governance") -> SessionGroup.SESSION3
        t.contains("opening") -> SessionGroup.OPENING
        t.contains("agm") -> SessionGroup.AGM
        else -> null
    }
}

@Composable
private fun PanelCard(panel: Panel, onClick: () -> Unit) {
    val group = panelSessionGroup(panel)
    val accent = group?.color ?: FICANavy
    val count = panel.question_count ?: 0
    val enabled = panel.isDiscussionEnabled

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(3.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .clip(RoundedCornerShape(14.dp))
            .background(FICACard)
            .clickable { onClick() }
            .alpha(if (enabled) 1f else 0.85f)
            // IntrinsicSize.Min lets the accent bar stretch to the content
            // column's height; otherwise a shrink-to-fit 0dp bar shows up.
            .height(IntrinsicSize.Min),
    ) {
        // Accent bar on the left — matches AgendaView.SessionCard.
        Box(
            modifier = Modifier
                .width(4.dp)
                .fillMaxHeight()
                .background(accent),
        )

        Column(
            modifier = Modifier.padding(16.dp).weight(1f),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // Top meta row: time + group pill + status dot
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (!panel.start_time.isNullOrBlank() && !panel.end_time.isNullOrBlank()) {
                    Text(
                        text = "${panel.start_time} – ${panel.end_time}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = FICAMuted,
                        fontFamily = FontFamily.Monospace,
                    )
                }
                if (group != null) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(accent.copy(alpha = 0.10f))
                            .padding(horizontal = 7.dp, vertical = 3.dp),
                    ) {
                        Text(
                            text = group.label.uppercase(),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = accent,
                            letterSpacing = 0.6.sp,
                        )
                    }
                }
                Spacer(modifier = Modifier.weight(1f))
                // Quiet status dot — green/red + label.
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(if (enabled) FICASuccess else FICADanger),
                    )
                    Text(
                        text = if (enabled) "Open" else "Closed",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (enabled) FICASuccess else FICADanger,
                    )
                }
            }

            // Title
            Text(
                text = panel.title,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
                lineHeight = 19.sp,
            )

            // Room
            if (!panel.room.isNullOrBlank()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.LocationOn,
                        contentDescription = null,
                        tint = FICAMuted,
                        modifier = Modifier.size(11.dp),
                    )
                    Text(
                        text = panel.room,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = FICAMuted,
                    )
                }
            }

            // Speaker inline (avatar + name + title)
            if (!panel.speaker_name.isNullOrBlank()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    AvatarView(
                        name = panel.speaker_name,
                        photoUrl = panel.speaker_photo,
                        size = 24.dp,
                        borderColor = FICABorder,
                        borderWidth = 1.dp,
                    )
                    Text(
                        text = panel.speaker_name,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = FICASecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    if (!panel.speaker_title.isNullOrBlank()) {
                        Text("·", fontSize = 11.sp, color = FICAMuted)
                        Text(
                            text = panel.speaker_title,
                            fontSize = 11.sp,
                            color = FICAMuted,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }

            // Divider + Q&A footer CTA
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(0.5.dp)
                    .background(FICABorder.copy(alpha = 0.5f)),
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.ChatBubble,
                        contentDescription = null,
                        tint = accent,
                        modifier = Modifier.size(13.dp),
                    )
                    Text(
                        text = if (count == 0) "Start the discussion"
                               else "$count question${if (count == 1) "" else "s"}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = accent,
                    )
                }
                Spacer(modifier = Modifier.weight(1f))
                if (panel.isPanelMember) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Star,
                            contentDescription = null,
                            tint = FICAGold,
                            modifier = Modifier.size(11.dp),
                        )
                        Text(
                            text = "You're on this panel",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = FICAGold,
                        )
                    }
                }
                Icon(
                    imageVector = Icons.Filled.ChevronRight,
                    contentDescription = null,
                    tint = FICAMuted,
                    modifier = Modifier.size(14.dp),
                )
            }
        }
    }
}

