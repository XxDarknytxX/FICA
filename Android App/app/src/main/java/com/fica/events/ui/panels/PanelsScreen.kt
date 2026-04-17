package com.fica.events.ui.panels

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.TrendingFlat
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Schedule
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
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fica.events.data.api.ApiClient
import com.fica.events.data.api.ChatWebSocket
import com.fica.events.data.models.CongressYear
import com.fica.events.data.models.Panel
import com.fica.events.data.models.SessionGroup
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
 * Tab-root screen for panel sessions.
 *
 * Redesigned for density + modern feel:
 *   - One card per panel with all metadata in three visual tiers
 *     (eyebrow row, title, CTA row) — no internal dividers, no accent bar.
 *   - Colored "SESSION" eyebrow pill is the only chromatic signal per card.
 *   - Bottom content padding reserves 100dp for the floating pill tab bar,
 *     matching HomeScreen's trailing spacer convention.
 */
@OptIn(ExperimentalMaterial3Api::class, androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
fun PanelsScreen(onOpenPanel: (Int) -> Unit) {
    var panels by remember { mutableStateOf<List<Panel>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isRefreshing by remember { mutableStateOf(false) }
    // Tracks when each panel id was most recently flipped to `open` (epoch
    // millis). Used to float the latest-opened panel to the top — most
    // recently opened first, earlier-opened after, closed panels last in
    // their original schedule order.
    val openedAt = remember { mutableStateMapOf<Int, Long>() }
    val scope = rememberCoroutineScope()

    suspend fun load() {
        try {
            val resp = ApiClient.service.getPanels(year = CongressYear.Y2026.year)
            val body = resp.body()
            panels = body?.panels ?: emptyList()
            // Seed openedAt for every currently-open panel so the sort is
            // stable on first render. All get the same timestamp so the
            // server's original (scheduled) order acts as the tie-breaker.
            val now = System.currentTimeMillis()
            body?.panels?.forEach { p ->
                if (p.isDiscussionEnabled && !openedAt.containsKey(p.id)) {
                    openedAt[p.id] = now
                }
            }
        } catch (_: Exception) {
            // Leave prior list in place on failure.
        }
    }

    LaunchedEffect(Unit) {
        isLoading = panels.isEmpty()
        load()
        isLoading = false
    }

    // Live — admin flipping a panel's discussion open/closed is pushed over
    // the shared WebSocket; patch the matching row in place and stamp the
    // open-time so it bubbles to the top.
    DisposableEffect(Unit) {
        val token = ChatWebSocket.addPanelDiscussionHandler { sessionId, enabled ->
            panels = panels.map { p ->
                if (p.id == sessionId) p.copy(discussion_enabled = enabled) else p
            }
            if (enabled) {
                openedAt[sessionId] = System.currentTimeMillis()
            }
            // When `enabled == false` we intentionally keep the prior
            // openedAt value — closed panels don't use it for sorting, and
            // if the admin flips it back on later we'll overwrite it.
        }
        onDispose { ChatWebSocket.removePanelDiscussionHandler(token) }
    }

    // Compute the sorted list once per panels/openedAt change.
    val sortedPanels = remember(panels, openedAt.toMap()) {
        val originalIndex = panels.withIndex().associate { (i, p) -> p.id to i }
        panels.sortedWith(Comparator { a, b ->
            // Open > Closed
            if (a.isDiscussionEnabled != b.isDiscussionEnabled) {
                return@Comparator if (a.isDiscussionEnabled) -1 else 1
            }
            // Both open — most recent open-time first
            if (a.isDiscussionEnabled) {
                val ta = openedAt[a.id] ?: Long.MIN_VALUE
                val tb = openedAt[b.id] ?: Long.MIN_VALUE
                if (ta != tb) return@Comparator tb.compareTo(ta)
            }
            // Tie or both closed — preserve server order (schedule)
            (originalIndex[a.id] ?: Int.MAX_VALUE).compareTo(originalIndex[b.id] ?: Int.MAX_VALUE)
        })
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
                    // 100dp bottom reserves room for the floating pill tab bar
                    // (72dp bar + 8dp pad + safe-area insets). Matches the
                    // trailing spacer in HomeScreen.
                    contentPadding = PaddingValues(
                        start = 20.dp, end = 20.dp, top = 8.dp, bottom = 100.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    item(key = "__summary") {
                        ListSummary(
                            total = sortedPanels.size,
                            open = sortedPanels.count { it.isDiscussionEnabled },
                        )
                    }
                    items(sortedPanels, key = { it.id }) { panel ->
                        // animateItemPlacement gives a smooth slide when a
                        // row is re-ordered because a panel just opened —
                        // no snap-cut.
                        PanelCard(
                            panel = panel,
                            onClick = { onOpenPanel(panel.id) },
                            modifier = Modifier.animateItemPlacement(
                                animationSpec = androidx.compose.animation.core.spring(
                                    dampingRatio = 0.82f,
                                    stiffness = 380f,
                                ),
                            ),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ListSummary(total: Int, open: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "$total panel${if (total == 1) "" else "s"}",
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = FICASecondary,
        )
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(FICASuccess),
            )
            Text(
                text = "$open open",
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                color = FICAMuted,
            )
        }
    }
}

/**
 * Derive a SessionGroup from the panel title — Panel rows don't carry
 * `session_group` yet, so we inspect the title for known keywords.
 * Shared with PanelDetailScreen so both views pick the same accent.
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
private fun PanelCard(
    panel: Panel,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val group = panelSessionGroup(panel)
    val accent = group?.color ?: FICANavy
    val count = panel.question_count ?: 0
    val enabled = panel.isDiscussionEnabled

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(FICACard)
            .clickable { onClick() }
            .alpha(if (enabled) 1f else 0.72f)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // Eyebrow: session-group pill (if known) + bullet + time + bullet + room.
        // One compact line instead of three separate stacked rows.
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            if (group != null) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(accent.copy(alpha = 0.12f))
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                ) {
                    Text(
                        text = group.label.uppercase(),
                        fontSize = 9.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = accent,
                        letterSpacing = 0.6.sp,
                    )
                }
            }
            MetaBullet(show = group != null && !panel.start_time.isNullOrBlank())
            if (!panel.start_time.isNullOrBlank()) {
                MetaIconText(icon = Icons.Filled.Schedule, text = panel.start_time)
            }
            MetaBullet(show = !panel.start_time.isNullOrBlank() && !panel.room.isNullOrBlank())
            if (!panel.room.isNullOrBlank()) {
                MetaIconText(icon = Icons.Filled.LocationOn, text = panel.room)
            }
            Spacer(modifier = Modifier.weight(1f))
            // Status pill — tight. Green dot + 1-word state.
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

        // Title — the main thing.
        Text(
            text = panel.title,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color = FICAText,
            lineHeight = 21.sp,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
        )

        // Speaker inline — lightweight. Skip if we don't have one.
        if (!panel.speaker_name.isNullOrBlank()) {
            Text(
                text = buildString {
                    append(panel.speaker_name)
                    if (!panel.speaker_title.isNullOrBlank()) {
                        append(" · ")
                        append(panel.speaker_title)
                    } else if (!panel.speaker_org.isNullOrBlank()) {
                        append(" · ")
                        append(panel.speaker_org)
                    }
                },
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = FICASecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        // Footer CTA — single line, accent-colored for the Q&A invite,
        // with the panelist star pushed to the right when applicable.
        Row(
            modifier = Modifier.padding(top = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(
                imageVector = Icons.Filled.ChatBubbleOutline,
                contentDescription = null,
                tint = accent,
                modifier = Modifier.size(13.dp),
            )
            Text(
                text = if (count == 0) "Start the discussion"
                       else "$count question${if (count == 1) "" else "s"}",
                fontSize = 12.5.sp,
                fontWeight = FontWeight.SemiBold,
                color = accent,
            )
            Spacer(modifier = Modifier.weight(1f))
            if (panel.isPanelMember) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Star,
                        contentDescription = null,
                        tint = FICAGold,
                        modifier = Modifier.size(11.dp),
                    )
                    Text(
                        text = "Panelist",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = FICAGold,
                    )
                }
            }
            Icon(
                imageVector = Icons.AutoMirrored.Filled.TrendingFlat,
                contentDescription = null,
                tint = accent.copy(alpha = 0.75f),
                modifier = Modifier.size(14.dp),
            )
        }
    }
}

@Composable
private fun MetaIconText(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = FICAMuted,
            modifier = Modifier.size(11.dp),
        )
        Text(
            text = text,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = FICAMuted,
            maxLines = 1,
        )
    }
}

/** Compact "·" separator between meta items — only rendered when both sides show. */
@Composable
private fun MetaBullet(show: Boolean) {
    if (show) {
        Text(
            text = "·",
            fontSize = 11.sp,
            color = FICABorder,
        )
    }
}
