package com.fica.events.ui.panels

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fica.events.data.api.ApiClient
import com.fica.events.data.models.CongressYear
import com.fica.events.data.models.Panel
import com.fica.events.ui.components.AvatarView
import com.fica.events.ui.components.EmptyStateView
import com.fica.events.ui.components.LoadingView
import com.fica.events.ui.theme.FICABg
import com.fica.events.ui.theme.FICABorder
import com.fica.events.ui.theme.FICACard
import com.fica.events.ui.theme.FICAGold
import com.fica.events.ui.theme.FICAInputBg
import com.fica.events.ui.theme.FICAMuted
import com.fica.events.ui.theme.FICANavy
import com.fica.events.ui.theme.FICASecondary
import com.fica.events.ui.theme.FICAText
import kotlinx.coroutines.launch

/**
 * Tab-root screen listing every `type='panel'` session for the current
 * congress year. Tapping a row calls [onOpenPanel] so the host can push
 * the detail route. `panel_discussion_enabled` is surfaced as a banner
 * when closed; the per-panel detail screen uses it to gate its composer.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PanelsScreen(onOpenPanel: (Int) -> Unit) {
    var panels by remember { mutableStateOf<List<Panel>>(emptyList()) }
    var discussionEnabled by remember { mutableStateOf(true) }
    var isLoading by remember { mutableStateOf(true) }
    var isRefreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun load() {
        try {
            val resp = ApiClient.service.getPanels(year = CongressYear.Y2026.year)
            val body = resp.body()
            panels = body?.panels ?: emptyList()
            discussionEnabled = body?.panel_discussion_enabled ?: true
        } catch (_: Exception) {
            // Leave prior list in place on failure.
        }
    }

    LaunchedEffect(Unit) {
        isLoading = panels.isEmpty()
        load()
        isLoading = false
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
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(
                        start = 20.dp, end = 20.dp, top = 10.dp, bottom = 100.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (!discussionEnabled) {
                        item(key = "closed-banner") { ClosedBanner() }
                    }
                    items(panels, key = { it.id }) { panel ->
                        PanelRow(
                            panel = panel,
                            onClick = { onOpenPanel(panel.id) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ClosedBanner() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(FICAInputBg)
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Filled.Lock,
            contentDescription = null,
            tint = FICAMuted,
            modifier = Modifier.size(16.dp),
        )
        Text(
            text = "Panel discussion is currently closed — you can read questions but not post new ones.",
            fontSize = 12.sp,
            color = FICASecondary,
        )
    }
}

@Composable
private fun PanelRow(panel: Panel, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(1.5.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .clip(RoundedCornerShape(14.dp))
            .background(FICACard)
            .clickable { onClick() }
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        if (panel.speaker_name != null) {
            AvatarView(
                name = panel.speaker_name,
                photoUrl = panel.speaker_photo,
                size = 44.dp,
                borderColor = FICABorder,
                borderWidth = 1.dp,
            )
        } else {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(FICANavy.copy(alpha = 0.08f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Forum,
                    contentDescription = null,
                    tint = FICANavy,
                    modifier = Modifier.size(20.dp),
                )
            }
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = panel.title,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
                lineHeight = 18.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            // Time + room
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (!panel.start_time.isNullOrBlank() && !panel.end_time.isNullOrBlank()) {
                    IconChip(
                        icon = Icons.Filled.Schedule,
                        text = "${panel.start_time} – ${panel.end_time}",
                        color = FICAMuted,
                    )
                }
                if (!panel.room.isNullOrBlank()) {
                    IconChip(
                        icon = Icons.Filled.LocationOn,
                        text = panel.room,
                        color = FICAMuted,
                    )
                }
            }
            // Badges row
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                val count = panel.question_count ?: 0
                Badge(
                    icon = Icons.Filled.ChatBubbleOutline,
                    text = "$count question${if (count == 1) "" else "s"}",
                    textColor = FICANavy,
                    bgColor = FICANavy.copy(alpha = 0.08f),
                )
                if (panel.isPanelMember) {
                    Badge(
                        icon = Icons.Filled.Star,
                        text = "You're on this panel",
                        textColor = FICAGold,
                        bgColor = FICAGold.copy(alpha = 0.12f),
                    )
                }
            }
        }
    }
}

@Composable
private fun IconChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String,
    color: Color,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = color, modifier = Modifier.size(11.dp))
        Text(text = text, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = color)
    }
}

@Composable
private fun Badge(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String,
    textColor: Color,
    bgColor: Color,
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(bgColor)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = textColor,
            modifier = Modifier.size(11.dp),
        )
        Text(
            text = text,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = textColor,
        )
    }
}
