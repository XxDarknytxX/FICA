package com.fica.events.ui.networking

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.EventAvailable
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Business
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Forum
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import com.fica.events.data.auth.AuthManager
import com.fica.events.data.models.*
import com.fica.events.ui.components.*
import com.fica.events.ui.theme.*
import com.fica.events.data.api.ChatWebSocket
import com.fica.events.ui.home.relativeTime
import kotlinx.coroutines.launch

// ── NetworkingScreen (container with 4 sub-tabs) ───────────────────────────

@Composable
fun NetworkingScreen(
    onOpenConversation: (Int, String) -> Unit = { _, _ -> },
    initialTab: Int = 0,
    onTabChanged: (Int) -> Unit = {},
) {
    var selectedTab by remember { mutableIntStateOf(initialTab) }
    var selectedAttendee by remember { mutableStateOf<Attendee?>(null) }

    // Icons chosen to mirror iOS SF Symbols:
    //   person.2 → People | link → Connections
    //   bubble.left.and.bubble.right → Chat | calendar.badge.clock → Meetings
    val tabs = listOf(
        Icons.Filled.People to "People",
        Icons.Filled.Link to "Connections",
        Icons.AutoMirrored.Filled.Chat to "Chat",
        Icons.Filled.EventAvailable to "Meetings",
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FICABg)
    ) {
        // ── Header ─────────────────────────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .background(FICABg),
        ) {
            Text(
                text = "Networking",
                fontSize = 17.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 14.dp, bottom = 12.dp),
                textAlign = TextAlign.Center,
            )

            // iOS-style sub-tab bar — black filled icons (matching bottom nav),
            // subtle navy @ 6% alpha pill behind the selected tab.
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                tabs.forEachIndexed { idx, (icon, label) ->
                    val isSelected = selectedTab == idx
                    // Always-black icons matching the bottom-nav style the user liked
                    val iconColor by androidx.compose.animation.animateColorAsState(
                        targetValue = if (isSelected) Color.Black else Color.Black.copy(alpha = 0.78f),
                        animationSpec = androidx.compose.animation.core.tween(180),
                        label = "subTabIcon",
                    )
                    val labelColor by androidx.compose.animation.animateColorAsState(
                        targetValue = if (isSelected) Color.Black else Color.Black.copy(alpha = 0.62f),
                        animationSpec = androidx.compose.animation.core.tween(180),
                        label = "subTabLabel",
                    )
                    val bgColor by androidx.compose.animation.animateColorAsState(
                        targetValue = if (isSelected) FICANavy.copy(alpha = 0.08f) else Color.Transparent,
                        animationSpec = androidx.compose.animation.core.tween(180),
                        label = "subTabBg",
                    )
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(bgColor)
                            .clickable(
                                indication = null,
                                interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
                            ) { selectedTab = idx; onTabChanged(idx) }
                            .padding(vertical = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = label,
                            tint = iconColor,
                            modifier = Modifier.size(30.dp),
                        )
                        Text(
                            text = label,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
                            color = labelColor,
                            lineHeight = 11.sp,
                            modifier = Modifier.offset(y = (-2).dp),
                            maxLines = 1,
                        )
                    }
                }
            }
            HorizontalDivider(color = FICABorder, thickness = 0.5.dp)
        }

        when (selectedTab) {
            0 -> DirectoryContent(
                onSelectAttendee = { selectedAttendee = it },
            )
            1 -> ConnectionsContent()
            2 -> ChatListContent(
                onOpenConversation = onOpenConversation,
            )
            3 -> MeetingsContent()
        }
    }

    // Profile bottom sheet
    if (selectedAttendee != null) {
        AttendeeProfileSheet(
            attendee = selectedAttendee!!,
            onDismiss = { selectedAttendee = null },
            onMessage = { id, name ->
                selectedAttendee = null
                onOpenConversation(id, name)
            },
        )
    }
}

// ── Full-screen conversation page (navigated to from MainScreen) ─────────

@Composable
fun ConversationScreen(
    otherUserId: Int,
    otherUserName: String,
    otherUserOrg: String? = null,
    onBack: () -> Unit,
) {
    ConversationContent(
        otherUserId = otherUserId,
        otherUserName = otherUserName,
        otherUserOrg = otherUserOrg,
        onBack = onBack,
    )
}

// ── DirectoryContent (People tab) ──────────────────────────────────────────

@Composable
private fun DirectoryContent(
    onSelectAttendee: (Attendee) -> Unit,
) {
    var attendees by remember { mutableStateOf<List<Attendee>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var search by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        try {
            val resp = ApiClient.service.getDirectory()
            if (resp.isSuccessful) attendees = resp.body()?.attendees ?: emptyList()
        } catch (_: Exception) {}
        isLoading = false
    }

    val filtered = if (search.isBlank()) attendees else {
        val q = search.lowercase()
        attendees.filter {
            it.name.lowercase().contains(q) ||
                    (it.organization ?: "").lowercase().contains(q) ||
                    (it.job_title ?: "").lowercase().contains(q)
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(FICABg)) {
        // iOS-style search bar with inline count badge (both live inside the same pill)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier
                    .weight(1f)
                    .height(40.dp)
                    .clip(RoundedCornerShape(50))
                    .background(FICAInputBg),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Spacer(modifier = Modifier.width(12.dp))
                Icon(
                    Icons.Filled.Search,
                    contentDescription = null,
                    tint = FICAMuted,
                    modifier = Modifier.size(16.dp),
                )
                Spacer(modifier = Modifier.width(8.dp))
                androidx.compose.foundation.text.BasicTextField(
                    value = search,
                    onValueChange = { search = it },
                    singleLine = true,
                    textStyle = androidx.compose.ui.text.TextStyle(
                        fontSize = 15.sp,
                        color = FICAText,
                        fontWeight = FontWeight.Normal,
                    ),
                    cursorBrush = androidx.compose.ui.graphics.SolidColor(FICANavy),
                    modifier = Modifier.weight(1f),
                    decorationBox = { inner ->
                        if (search.isEmpty()) {
                            Text("Search delegates...", fontSize = 15.sp, color = FICAMuted)
                        }
                        inner()
                    },
                )
                Spacer(modifier = Modifier.width(12.dp))
            }
            // Clean iOS-style count pill — capsule shape, muted grey
            Box(
                modifier = Modifier
                    .defaultMinSize(minWidth = 40.dp)
                    .height(40.dp)
                    .clip(RoundedCornerShape(50))
                    .background(FICAInputBg)
                    .padding(horizontal = 12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "${filtered.size}",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICASecondary,
                )
            }
        }

        if (isLoading) {
            LoadingView()
        } else if (filtered.isEmpty()) {
            EmptyStateView(title = "No delegates found")
        } else {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 0.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                items(filtered, key = { it.id }) { attendee ->
                    AttendeeCard(
                        attendee = attendee,
                        onClick = { onSelectAttendee(attendee) },
                    )
                }
                item { Spacer(modifier = Modifier.height(100.dp)) }
            }
        }
    }
}

@Composable
private fun AttendeeCard(attendee: Attendee, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(1.5.dp, RoundedCornerShape(16.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .clip(RoundedCornerShape(16.dp))
            .background(FICACard)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AvatarView(name = attendee.name, photoUrl = attendee.photo_url, size = 50.dp, borderColor = FICABorder, borderWidth = 1.dp)
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(1.dp)) {
            Text(
                attendee.name,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
                lineHeight = 18.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (!attendee.job_title.isNullOrBlank()) {
                Text(
                    attendee.job_title,
                    fontSize = 13.sp,
                    color = FICASecondary,
                    lineHeight = 15.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            if (!attendee.organization.isNullOrBlank()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Business,
                        contentDescription = null,
                        tint = FICANavy,
                        modifier = Modifier.size(12.dp),
                    )
                    Text(
                        attendee.organization,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = FICANavy,
                        lineHeight = 15.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
        Spacer(modifier = Modifier.width(10.dp))
        TicketBadgeView(ticketType = attendee.ticket_type)
    }
}

// ── Attendee Profile Bottom Sheet ──────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AttendeeProfileSheet(
    attendee: Attendee,
    onDismiss: () -> Unit,
    onMessage: (Int, String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var connectionSent by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = FICABg,
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            contentPadding = PaddingValues(bottom = 40.dp),
        ) {
            // Header
            item {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    AvatarView(name = attendee.name, photoUrl = attendee.photo_url, size = 90.dp, borderColor = FICAGold, borderWidth = 2.dp)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(attendee.name, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = FICAText)
                    if (!attendee.job_title.isNullOrBlank()) {
                        Text(attendee.job_title, fontSize = 14.sp, color = FICASecondary)
                    }
                    if (!attendee.organization.isNullOrBlank()) {
                        Text(attendee.organization, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = FICANavy)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    TicketBadgeView(ticketType = attendee.ticket_type)
                    Spacer(modifier = Modifier.height(20.dp))
                }
            }

            // Action buttons (only if not self)
            if (attendee.id != AuthManager.userId) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        // Connect button
                        val connectBg = if (connectionSent) FICAInputBg else FICANavy
                        val connectFg = if (connectionSent) FICASecondary else Color.White
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(connectBg)
                                .clickable(enabled = !connectionSent) {
                                    scope.launch {
                                        try {
                                            ApiClient.service.createConnection(
                                                CreateConnectionRequest(
                                                    requester_id = AuthManager.userId,
                                                    requested_id = attendee.id,
                                                )
                                            )
                                            connectionSent = true
                                        } catch (_: Exception) {}
                                    }
                                },
                            contentAlignment = Alignment.Center,
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                Icon(
                                    if (connectionSent) Icons.Filled.Check else Icons.Filled.PersonAdd,
                                    contentDescription = null,
                                    tint = connectFg,
                                    modifier = Modifier.size(18.dp),
                                )
                                Text(
                                    if (connectionSent) "Sent" else "Connect",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 15.sp,
                                    color = connectFg,
                                )
                            }
                        }

                        // Message button
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(FICAGold)
                                .clickable { onMessage(attendee.id, attendee.name) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                Icon(
                                    Icons.Filled.Email,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp),
                                )
                                Text(
                                    "Message",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 15.sp,
                                    color = Color.White,
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(20.dp))
                }
            }

            // Bio
            if (!attendee.bio.isNullOrBlank()) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp)
                            .background(FICAInputBg, RoundedCornerShape(14.dp))
                            .padding(18.dp),
                        horizontalAlignment = Alignment.Start,
                    ) {
                        Text("ABOUT", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = FICAMuted, letterSpacing = 0.8.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(attendee.bio, fontSize = 14.sp, color = FICASecondary, lineHeight = 20.sp)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }
            }

            // Contact info
            item {
                Column(
                    modifier = Modifier.padding(horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (attendee.email.isNotBlank()) {
                        ContactItem(icon = Icons.Filled.Email, text = attendee.email, color = FICANavy)
                    }
                    if (!attendee.linkedin.isNullOrBlank()) {
                        ContactItem(icon = Icons.Outlined.Link, text = "LinkedIn", color = Color(0xFF0077B5))
                    }
                    if (!attendee.twitter.isNullOrBlank()) {
                        ContactItem(icon = Icons.Outlined.Person, text = attendee.twitter, color = Color(0xFF1DA1F2))
                    }
                    if (!attendee.website.isNullOrBlank()) {
                        ContactItem(icon = Icons.Outlined.Language, text = attendee.website, color = FICASuccess)
                    }
                }
            }
        }
    }
}

@Composable
private fun ContactItem(icon: ImageVector, text: String, color: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(FICACard, RoundedCornerShape(12.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(34.dp)
                .background(color.copy(alpha = 0.1f), RoundedCornerShape(9.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(16.dp))
        }
        Spacer(modifier = Modifier.width(12.dp))
        Text(text, fontSize = 13.sp, color = FICAText, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

// ── ConnectionsContent (Connections tab) ───────────────────────────────────

@Composable
private fun ConnectionsContent() {
    var connections by remember { mutableStateOf<List<Connection>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var filter by remember { mutableStateOf("all") }
    val scope = rememberCoroutineScope()
    val myId = AuthManager.userId

    val loadConnections: suspend () -> Unit = {
        try {
            val resp = ApiClient.service.getConnections(attendeeId = myId)
            if (resp.isSuccessful) connections = resp.body()?.connections ?: emptyList()
        } catch (_: Exception) {}
        isLoading = false
    }

    LaunchedEffect(Unit) { loadConnections() }

    val filters = listOf("all", "pending", "accepted", "declined")
    val filtered = if (filter == "all") connections else connections.filter { it.status == filter }

    Column(modifier = Modifier.fillMaxSize().background(FICABg)) {
        // Filter chips — clean, no borders, animated color change
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            filters.forEach { f ->
                val count = if (f == "all") connections.size else connections.count { it.status == f }
                val isSelected = filter == f
                val chipBg by androidx.compose.animation.animateColorAsState(
                    targetValue = if (isSelected) FICANavy else FICAInputBg,
                    animationSpec = androidx.compose.animation.core.tween(180),
                    label = "chipBg",
                )
                val chipFg by androidx.compose.animation.animateColorAsState(
                    targetValue = if (isSelected) Color.White else FICASecondary,
                    animationSpec = androidx.compose.animation.core.tween(180),
                    label = "chipFg",
                )
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(chipBg)
                        .clickable(
                            indication = null,
                            interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
                        ) { filter = f }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        text = f.replaceFirstChar { it.uppercase() },
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = chipFg,
                    )
                    if (count > 0) {
                        Text(
                            text = "$count",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = chipFg.copy(alpha = 0.8f),
                            modifier = Modifier
                                .background(
                                    if (isSelected) Color.White.copy(alpha = 0.2f) else FICANavy.copy(alpha = 0.10f),
                                    RoundedCornerShape(50),
                                )
                                .padding(horizontal = 7.dp, vertical = 2.dp),
                        )
                    }
                }
            }
        }

        if (isLoading) {
            LoadingView()
        } else {
            val incoming = filtered.filter { it.status == "pending" && it.requested_id == myId }
            val rest = filtered.filter { !(it.status == "pending" && it.requested_id == myId) }

            if (filtered.isEmpty()) {
                EmptyStateView(
                    title = "No connections",
                    subtitle = "Visit the Directory to connect with delegates",
                )
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    if (incoming.isNotEmpty()) {
                        item { SectionHeader(title = "Incoming Requests") }
                        items(incoming, key = { it.id }) { conn ->
                            ConnectionCard(connection = conn, myId = myId) { status ->
                                scope.launch {
                                    try {
                                        ApiClient.service.updateConnection(conn.id, StatusUpdateRequest(status))
                                        loadConnections()
                                    } catch (_: Exception) {}
                                }
                            }
                        }
                    }
                    if (rest.isNotEmpty()) {
                        if (incoming.isNotEmpty()) {
                            item { SectionHeader(title = "All Connections") }
                        }
                        items(rest, key = { it.id }) { conn ->
                            ConnectionCard(connection = conn, myId = myId)
                        }
                    }
                    item { Spacer(modifier = Modifier.height(100.dp)) }
                }
            }
        }
    }
}

@Composable
private fun ConnectionCard(
    connection: Connection,
    myId: Int,
    onAction: ((String) -> Unit)? = null,
) {
    val isIncoming = connection.requested_id == myId && connection.status == "pending"
    val otherName = if (connection.requester_id == myId) connection.requested_name ?: "" else connection.requester_name ?: ""
    val otherOrg = if (connection.requester_id == myId) connection.requested_org else connection.requester_org
    val otherPhoto = if (connection.requester_id == myId) connection.requested_photo else connection.requester_photo

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(1.5.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .clip(RoundedCornerShape(14.dp))
            .background(FICACard)
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AvatarView(name = otherName, photoUrl = otherPhoto, size = 44.dp, borderColor = FICABorder, borderWidth = 1.dp)
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(1.dp)) {
                Text(
                    otherName,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAText,
                    lineHeight = 17.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (!otherOrg.isNullOrBlank()) {
                    Text(
                        otherOrg,
                        fontSize = 12.sp,
                        color = FICASecondary,
                        lineHeight = 14.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
            StatusBadgeView(status = connection.status)
        }

        if (isIncoming && onAction != null) {
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(FICASuccess)
                        .clickable { onAction("accepted") },
                    contentAlignment = Alignment.Center,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(15.dp))
                        Text("Accept", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color.White)
                    }
                }
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(FICAInputBg)
                        .clickable { onAction("declined") },
                    contentAlignment = Alignment.Center,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Icon(Icons.Filled.Close, contentDescription = null, tint = FICASecondary, modifier = Modifier.size(15.dp))
                        Text("Decline", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = FICASecondary)
                    }
                }
            }
        }
    }
}

// ── ChatListContent (Chat tab) ─────────────────────────────────────────────

private data class ConvoSummary(
    val key: String,
    val otherId: Int,
    val otherName: String,
    val otherOrg: String?,
    val otherPhoto: String?,
    val lastMessage: String,
    val lastDate: String?,
    val unreadCount: Int,
)

@Composable
private fun ChatListContent(
    onOpenConversation: (Int, String) -> Unit,
) {
    var messages by remember { mutableStateOf<List<Message>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var search by remember { mutableStateOf("") }
    val myId = AuthManager.userId

    val loadMessages: suspend () -> Unit = {
        try {
            val resp = ApiClient.service.getMessages(attendeeId = myId)
            if (resp.isSuccessful) messages = resp.body()?.messages ?: emptyList()
        } catch (_: Exception) {}
        isLoading = false
    }

    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { loadMessages() }

    // WebSocket listener to refresh chat list on any new message
    LaunchedEffect(Unit) {
        ChatWebSocket.onAnyMessage = { _ ->
            scope.launch { loadMessages() }
        }
    }
    androidx.compose.runtime.DisposableEffect(Unit) {
        onDispose { ChatWebSocket.onAnyMessage = null }
    }

    // Build conversation summaries
    val conversations = remember(messages) {
        val map = mutableMapOf<String, ConvoSummary>()
        for (m in messages) {
            val oId = if (m.sender_id == myId) m.receiver_id else m.sender_id
            val oName = if (m.sender_id == myId) (m.receiver_name ?: "") else (m.sender_name ?: "")
            val oOrg = if (m.sender_id == myId) m.receiver_org else m.sender_org
            val oPhoto = if (m.sender_id == myId) m.receiver_photo else m.sender_photo
            val key = "${minOf(m.sender_id, m.receiver_id)}-${maxOf(m.sender_id, m.receiver_id)}"
            val isUnread = m.receiver_id == myId && (m.is_read == null || m.is_read == 0)

            val existing = map[key]
            if (existing == null) {
                map[key] = ConvoSummary(key, oId, oName, oOrg, oPhoto, m.body, m.sent_at, if (isUnread) 1 else 0)
            } else if (isUnread) {
                map[key] = existing.copy(unreadCount = existing.unreadCount + 1)
            }
        }
        map.values.sortedByDescending { it.lastDate ?: "" }
    }

    val filteredConvos = if (search.isBlank()) conversations else {
        val q = search.lowercase()
        conversations.filter { it.otherName.lowercase().contains(q) }
    }

    Column(modifier = Modifier.fillMaxSize().background(FICABg)) {
        // Search
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .height(46.dp)
                .shadow(2.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
                .clip(RoundedCornerShape(14.dp))
                .background(FICACard),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Spacer(modifier = Modifier.width(14.dp))
            Icon(Icons.Filled.Search, contentDescription = null, tint = FICAMuted, modifier = Modifier.size(17.dp))
            Spacer(modifier = Modifier.width(10.dp))
            androidx.compose.foundation.text.BasicTextField(
                value = search,
                onValueChange = { search = it },
                singleLine = true,
                textStyle = androidx.compose.ui.text.TextStyle(
                    fontSize = 14.sp,
                    color = FICAText,
                ),
                modifier = Modifier.weight(1f),
                decorationBox = { inner ->
                    if (search.isEmpty()) {
                        Text("Search conversations...", fontSize = 14.sp, color = FICAMuted)
                    }
                    inner()
                },
            )
            Spacer(modifier = Modifier.width(12.dp))
        }

        if (isLoading) {
            LoadingView()
        } else if (filteredConvos.isEmpty()) {
            Spacer(modifier = Modifier.weight(1f))
            EmptyStateView(
                icon = Icons.Filled.Forum,
                title = "No conversations yet",
                subtitle = "Start chatting from the Directory tab",
            )
            Spacer(modifier = Modifier.weight(1f))
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(filteredConvos, key = { it.key }) { convo ->
                    ConvoRow(
                        convo = convo,
                        onClick = { onOpenConversation(convo.otherId, convo.otherName) },
                    )
                }
            }
        }
    }
}

@Composable
private fun ConvoRow(convo: ConvoSummary, onClick: () -> Unit) {
    val isUnread = convo.unreadCount > 0
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(FICACard)
                .clickable(onClick = onClick)
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box {
                AvatarView(
                    name = convo.otherName,
                    photoUrl = convo.otherPhoto,
                    size = 50.dp,
                    borderColor = if (isUnread) FICAGold else FICABorder,
                    borderWidth = if (isUnread) 2.dp else 1.dp,
                )
                if (isUnread) {
                    // Unread indicator dot
                    Box(
                        modifier = Modifier
                            .size(14.dp)
                            .background(FICAGold, CircleShape)
                            .border(2.dp, FICACard, CircleShape)
                            .align(Alignment.TopEnd),
                    )
                }
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        convo.otherName,
                        fontSize = 15.sp,
                        fontWeight = if (isUnread) FontWeight.Bold else FontWeight.SemiBold,
                        color = FICAText,
                        lineHeight = 17.sp,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (convo.lastDate != null) {
                        Text(
                            convo.lastDate.relativeTime(),
                            fontSize = 11.sp,
                            fontWeight = if (isUnread) FontWeight.SemiBold else FontWeight.Medium,
                            color = if (isUnread) FICANavy else FICAMuted,
                            lineHeight = 13.sp,
                        )
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        convo.lastMessage,
                        fontSize = 13.sp,
                        fontWeight = if (isUnread) FontWeight.Medium else FontWeight.Normal,
                        color = if (isUnread) FICAText else FICAMuted,
                        lineHeight = 15.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    if (isUnread) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .defaultMinSize(24.dp, 24.dp)
                                .background(FICANavy, CircleShape)
                                .padding(horizontal = 7.dp, vertical = 4.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = if (convo.unreadCount > 99) "99+" else "${convo.unreadCount}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                            )
                        }
                    }
                }
            }
        }
        HorizontalDivider(
            modifier = Modifier.padding(start = 84.dp),
            thickness = 0.5.dp,
            color = FICABorder,
        )
    }
}

// ── ConversationContent (Chat detail) ──────────────────────────────────────

@Composable
private fun ConversationContent(
    otherUserId: Int,
    otherUserName: String,
    otherUserOrg: String? = null,
    onBack: () -> Unit,
) {
    var messages by remember { mutableStateOf<List<Message>>(emptyList()) }
    var newMessage by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSending by remember { mutableStateOf(false) }
    var resolvedSubtitle by remember { mutableStateOf(otherUserOrg) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val myId = AuthManager.userId

    // Initial load
    LaunchedEffect(Unit) {
        try {
            val resp = ApiClient.service.getConversation(a = myId, b = otherUserId)
            if (resp.isSuccessful) messages = resp.body()?.messages ?: emptyList()
        } catch (_: Exception) {}
        // Fetch attendee details to show the job title under the name.
        // Backend wraps single-attendee lookup in {attendee:{...}} which doesn't
        // match Retrofit's signature — use the directory list and find by id.
        if (resolvedSubtitle.isNullOrBlank()) {
            try {
                val dirResp = ApiClient.service.getDirectory()
                if (dirResp.isSuccessful) {
                    val a = dirResp.body()?.attendees?.firstOrNull { it.id == otherUserId }
                    // Prefer job title (e.g. "Developer"); fall back to organization
                    resolvedSubtitle = a?.job_title?.takeIf { it.isNotBlank() }
                        ?: a?.organization
                }
            } catch (_: Exception) {}
        }
        isLoading = false
    }

    // WebSocket listener for live messages
    LaunchedEffect(Unit) {
        ChatWebSocket.addConversationHandler(myId, otherUserId) { msg ->
            // Avoid duplicates (optimistically appended on send)
            if (messages.none { it.id == msg.id }) {
                messages = messages + msg
            }
            // Mark as read if we're the receiver
            if (msg.receiver_id == myId) {
                scope.launch {
                    try { ApiClient.service.markAsRead(MarkAsReadRequest(reader_id = myId, sender_id = msg.sender_id)) }
                    catch (_: Exception) {}
                }
            }
        }
    }

    // Clean up handler when leaving
    androidx.compose.runtime.DisposableEffect(Unit) {
        onDispose {
            ChatWebSocket.removeConversationHandler(myId, otherUserId)
        }
    }

    // Scroll to bottom when messages change
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FICABg)
            .imePadding(),
    ) {
        // Header — iOS-style: rounded back button on left, centered avatar + name + org
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(FICABg)
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(horizontal = 12.dp, vertical = 10.dp),
            contentAlignment = Alignment.Center,
        ) {
            // Back button (rounded square chip on the left, iOS-style)
            Box(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(FICACard)
                    .clickable(onClick = onBack),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = FICAText,
                    modifier = Modifier.size(18.dp),
                )
            }

            // Centered: avatar + name + org stack
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.padding(horizontal = 52.dp),
            ) {
                AvatarView(
                    name = otherUserName,
                    size = 34.dp,
                    borderColor = FICAGold,
                    borderWidth = 1.5.dp,
                )
                Column(
                    verticalArrangement = Arrangement.spacedBy(0.dp),
                ) {
                    Text(
                        otherUserName,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = FICAText,
                        lineHeight = 17.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (!resolvedSubtitle.isNullOrBlank()) {
                        Text(
                            resolvedSubtitle ?: "",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = FICASecondary,
                            lineHeight = 13.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }

        // Messages
        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (isLoading) {
                item { LoadingView(message = "Loading messages...") }
            } else if (messages.isEmpty()) {
                item {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(top = 48.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        AvatarView(name = otherUserName, size = 64.dp, borderColor = FICAGold, borderWidth = 2.dp)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(otherUserName, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = FICAText)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Start the conversation", fontSize = 13.sp, color = FICAMuted)
                    }
                }
            } else {
                items(messages, key = { it.id }) { msg ->
                    ChatBubble(message = msg, isMe = msg.sender_id == myId)
                }
            }
        }

        // Input bar — polished pill with gradient send button
        HorizontalDivider(color = FICABorder, thickness = 0.5.dp)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(FICACard)
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .defaultMinSize(minHeight = 44.dp)
                    .clip(RoundedCornerShape(22.dp))
                    .background(FICAInputBg)
                    .padding(horizontal = 18.dp, vertical = 10.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                if (newMessage.isEmpty()) {
                    Text(
                        "Type a message...",
                        fontSize = 15.sp,
                        color = FICAMuted,
                    )
                }
                BasicTextField(
                    value = newMessage,
                    onValueChange = { newMessage = it },
                    textStyle = androidx.compose.ui.text.TextStyle(
                        color = FICAText,
                        fontSize = 15.sp,
                        lineHeight = 20.sp,
                    ),
                    cursorBrush = androidx.compose.ui.graphics.SolidColor(FICANavy),
                    maxLines = 4,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            val canSend = newMessage.trim().isNotBlank() && !isSending
            val sendBg by androidx.compose.animation.animateColorAsState(
                targetValue = if (canSend) FICANavy else FICAInputBg,
                animationSpec = androidx.compose.animation.core.tween(180),
                label = "sendBg",
            )
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(sendBg)
                    .clickable(enabled = canSend) {
                        val body = newMessage.trim()
                        if (body.isNotBlank() && !isSending) {
                            isSending = true
                            val msgText = body
                            newMessage = ""
                            scope.launch {
                                try {
                                    val resp = ApiClient.service.sendMessage(
                                        SendMessageRequest(
                                            sender_id = myId,
                                            receiver_id = otherUserId,
                                            subject = null,
                                            body = msgText,
                                        )
                                    )
                                    if (resp.isSuccessful) {
                                        resp.body()?.message?.let { msg ->
                                            if (messages.none { it.id == msg.id }) {
                                                messages = messages + msg
                                            }
                                        }
                                    } else {
                                        newMessage = msgText
                                    }
                                } catch (_: Exception) {
                                    newMessage = msgText
                                }
                                isSending = false
                            }
                        }
                    },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.Send,
                    contentDescription = "Send",
                    tint = if (canSend) Color.White else FICAMuted,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}

@Composable
private fun ChatBubble(message: Message, isMe: Boolean) {
    // Bubble shape — mimics iMessage with a "tail" via asymmetric corners
    val bubbleShape = if (isMe) {
        RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp, bottomStart = 20.dp, bottomEnd = 6.dp)
    } else {
        RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp, bottomStart = 6.dp, bottomEnd = 20.dp)
    }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isMe) Arrangement.End else Arrangement.Start,
        verticalAlignment = Alignment.Bottom,
    ) {
        if (!isMe) {
            AvatarView(
                name = message.sender_name ?: "",
                photoUrl = message.sender_photo,
                size = 30.dp,
                borderColor = FICABorder,
                borderWidth = 1.dp,
            )
            Spacer(modifier = Modifier.width(8.dp))
        }
        if (isMe) Spacer(modifier = Modifier.width(54.dp))

        Column(
            horizontalAlignment = if (isMe) Alignment.End else Alignment.Start,
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Column(
                modifier = Modifier
                    .shadow(1.dp, bubbleShape, ambientColor = Color.Black.copy(alpha = 0.03f))
                    .clip(bubbleShape)
                    .background(if (isMe) FICANavy else FICACard)
                    .padding(horizontal = 14.dp, vertical = 9.dp),
            ) {
                if (!message.subject.isNullOrBlank()) {
                    Text(
                        message.subject,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isMe) FICAGold else FICANavy,
                        modifier = Modifier.padding(bottom = 3.dp),
                    )
                }
                Text(
                    text = message.body,
                    fontSize = 14.sp,
                    color = if (isMe) Color.White else FICAText,
                    lineHeight = 19.sp,
                )
            }
            if (message.sent_at != null) {
                Text(
                    text = message.sent_at.relativeTime(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    color = FICAMuted,
                    modifier = Modifier.padding(horizontal = 4.dp),
                )
            }
        }

        if (!isMe) Spacer(modifier = Modifier.width(54.dp))
    }
}

// ── MeetingsContent (Meetings tab) ─────────────────────────────────────────

@Composable
private fun MeetingsContent() {
    var meetings by remember { mutableStateOf<List<Meeting>>(emptyList()) }
    var attendees by remember { mutableStateOf<List<Attendee>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showCreateDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val myId = AuthManager.userId

    val loadData: suspend () -> Unit = {
        try {
            val mResp = ApiClient.service.getMeetings(attendeeId = myId)
            if (mResp.isSuccessful) meetings = mResp.body()?.meetings ?: emptyList()
            val aResp = ApiClient.service.getDirectory()
            if (aResp.isSuccessful) attendees = aResp.body()?.attendees ?: emptyList()
        } catch (_: Exception) {}
        isLoading = false
    }

    LaunchedEffect(Unit) { loadData() }

    Box(modifier = Modifier.fillMaxSize().background(FICABg)) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text(
                        "My Meetings",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = FICAText,
                    )
                    Text(
                        "${meetings.size} scheduled",
                        fontSize = 12.sp,
                        color = FICAMuted,
                    )
                }
                Spacer(modifier = Modifier.weight(1f))
                Row(
                    modifier = Modifier
                        .shadow(3.dp, RoundedCornerShape(12.dp), ambientColor = Color.Black.copy(alpha = 0.08f))
                        .clip(RoundedCornerShape(12.dp))
                        .background(FICANavySolid)
                        .clickable { showCreateDialog = true }
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Icon(
                        Icons.Filled.Add,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(15.dp),
                    )
                    Text(
                        text = "Request",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                    )
                }
            }

            if (isLoading) {
                LoadingView()
            } else if (meetings.isEmpty()) {
                EmptyStateView(
                    title = "No meetings",
                    subtitle = "Request a 1:1 meeting with a delegate",
                )
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(meetings, key = { it.id }) { meeting ->
                        MeetingCard(meeting = meeting, myId = myId) { status ->
                            scope.launch {
                                try {
                                    ApiClient.service.updateMeeting(meeting.id, StatusUpdateRequest(status))
                                    loadData()
                                } catch (_: Exception) {}
                            }
                        }
                    }
                    item { Spacer(modifier = Modifier.height(100.dp)) }
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateMeetingDialog(
            attendees = attendees.filter { it.id != myId },
            onDismiss = { showCreateDialog = false },
            onCreated = {
                showCreateDialog = false
                scope.launch { loadData() }
            },
        )
    }
}

@Composable
private fun MeetingCard(
    meeting: Meeting,
    myId: Int,
    onAction: (String) -> Unit,
) {
    val isIncoming = meeting.requested_id == myId && meeting.status == "pending"
    val otherName = if (meeting.requester_id == myId) meeting.requested_name ?: "" else meeting.requester_name ?: ""
    val otherOrg = if (meeting.requester_id == myId) meeting.requested_org else meeting.requester_org
    val otherPhoto = if (meeting.requester_id == myId) meeting.requested_photo else meeting.requester_photo

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(1.5.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .clip(RoundedCornerShape(14.dp))
            .background(FICACard)
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AvatarView(name = otherName, photoUrl = otherPhoto, size = 44.dp, borderColor = FICABorder, borderWidth = 1.dp)
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(1.dp)) {
                Text(
                    otherName,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAText,
                    lineHeight = 17.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (!otherOrg.isNullOrBlank()) {
                    Text(
                        otherOrg,
                        fontSize = 12.sp,
                        color = FICASecondary,
                        lineHeight = 14.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
            StatusBadgeView(status = meeting.status ?: "pending")
        }

        if (!meeting.title.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(meeting.title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = FICANavy)
        }

        // Meeting detail chips
        val hasAny = !meeting.meeting_date.isNullOrBlank() ||
            !meeting.start_time.isNullOrBlank() ||
            !meeting.location.isNullOrBlank()
        if (hasAny) {
            Spacer(modifier = Modifier.height(10.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (!meeting.meeting_date.isNullOrBlank()) {
                    MeetingChip(icon = Icons.Filled.CalendarMonth, text = meeting.meeting_date)
                }
                if (!meeting.start_time.isNullOrBlank()) {
                    val timeText = meeting.start_time + if (!meeting.end_time.isNullOrBlank()) "–${meeting.end_time}" else ""
                    MeetingChip(icon = Icons.Filled.Schedule, text = timeText)
                }
                if (!meeting.location.isNullOrBlank()) {
                    MeetingChip(icon = Icons.Filled.LocationOn, text = meeting.location, modifier = Modifier.weight(1f))
                }
            }
        }

        if (isIncoming) {
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(FICASuccess)
                        .clickable { onAction("accepted") },
                    contentAlignment = Alignment.Center,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(15.dp))
                        Text("Accept", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color.White)
                    }
                }
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(FICAInputBg)
                        .clickable { onAction("declined") },
                    contentAlignment = Alignment.Center,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(Icons.Filled.Close, contentDescription = null, tint = FICASecondary, modifier = Modifier.size(15.dp))
                        Text("Decline", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = FICASecondary)
                    }
                }
            }
        }
    }
}

@Composable
private fun MeetingChip(
    icon: ImageVector,
    text: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(FICAInputBg)
            .padding(horizontal = 9.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(icon, contentDescription = null, tint = FICASecondary, modifier = Modifier.size(12.dp))
        Text(
            text = text,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = FICASecondary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun CreateMeetingDialog(
    attendees: List<Attendee>,
    onDismiss: () -> Unit,
    onCreated: () -> Unit,
) {
    var selected by remember { mutableStateOf<Attendee?>(null) }
    var title by remember { mutableStateOf("") }
    var date by remember { mutableStateOf("2026-05-08") }
    var startTime by remember { mutableStateOf("") }
    var endTime by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var search by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val myId = AuthManager.userId

    val filteredAttendees = if (search.isBlank()) attendees.take(6) else {
        attendees.filter { it.name.lowercase().contains(search.lowercase()) }.take(6)
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                onClick = {
                    val a = selected ?: return@TextButton
                    saving = true
                    scope.launch {
                        try {
                            ApiClient.service.createMeeting(
                                CreateMeetingRequest(
                                    requester_id = myId,
                                    requested_id = a.id,
                                    title = title.ifBlank { null },
                                    meeting_date = date,
                                    start_time = startTime.ifBlank { null },
                                    end_time = endTime.ifBlank { null },
                                    location = location.ifBlank { null },
                                    notes = notes.ifBlank { null },
                                )
                            )
                            onCreated()
                        } catch (_: Exception) {
                            saving = false
                        }
                    }
                },
                enabled = selected != null && !saving,
            ) {
                Text("Send", fontWeight = FontWeight.Bold, color = FICAGold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = FICASecondary)
            }
        },
        title = { Text("Request Meeting", fontWeight = FontWeight.Bold) },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Attendee selection
                item {
                    Text("Meet With", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = FICAMuted)
                    Spacer(modifier = Modifier.height(6.dp))
                    if (selected != null) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            AvatarView(name = selected!!.name, photoUrl = selected!!.photo_url, size = 36.dp, borderColor = FICABorder, borderWidth = 1.dp)
                            Spacer(modifier = Modifier.width(10.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(selected!!.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = FICAText)
                                Text(selected!!.organization ?: "", fontSize = 12.sp, color = FICASecondary)
                            }
                            Text(
                                "Change",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = FICAGold,
                                modifier = Modifier.clickable { selected = null },
                            )
                        }
                    } else {
                        OutlinedTextField(
                            value = search,
                            onValueChange = { search = it },
                            placeholder = { Text("Search delegates...") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp),
                        )
                        filteredAttendees.forEach { a ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { selected = a; search = "" }
                                    .padding(vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                AvatarView(name = a.name, photoUrl = a.photo_url, size = 32.dp, borderColor = FICABorder, borderWidth = 1.dp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text(a.name, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = FICAText)
                                    Text(a.organization ?: "", fontSize = 11.sp, color = FICASecondary)
                                }
                            }
                        }
                    }
                }

                // Details
                item {
                    Text("Details", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = FICAMuted)
                    Spacer(modifier = Modifier.height(6.dp))
                    OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Meeting title") }, modifier = Modifier.fillMaxWidth(), singleLine = true, shape = RoundedCornerShape(10.dp))
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("2026-05-08" to "Day 1 - 8 May", "2026-05-09" to "Day 2 - 9 May").forEach { (value, label) ->
                            Text(
                                text = label,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (date == value) Color.White else FICAText,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (date == value) FICANavy else FICAInputBg)
                                    .clickable { date = value }
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                            )
                        }
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(value = startTime, onValueChange = { startTime = it }, label = { Text("Start") }, modifier = Modifier.weight(1f), singleLine = true, shape = RoundedCornerShape(10.dp))
                        OutlinedTextField(value = endTime, onValueChange = { endTime = it }, label = { Text("End") }, modifier = Modifier.weight(1f), singleLine = true, shape = RoundedCornerShape(10.dp))
                    }
                }
                item {
                    OutlinedTextField(value = location, onValueChange = { location = it }, label = { Text("Location") }, modifier = Modifier.fillMaxWidth(), singleLine = true, shape = RoundedCornerShape(10.dp))
                }
                item {
                    OutlinedTextField(value = notes, onValueChange = { notes = it }, label = { Text("Notes (optional)") }, modifier = Modifier.fillMaxWidth(), maxLines = 3, shape = RoundedCornerShape(10.dp))
                }
            }
        },
    )
}
