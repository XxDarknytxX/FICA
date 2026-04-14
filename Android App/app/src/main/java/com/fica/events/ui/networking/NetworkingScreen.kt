package com.fica.events.ui.networking

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.statusBars
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
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
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

    val tabs = listOf(
        Icons.Outlined.Groups to "People",
        Icons.Outlined.Link to "Connections",
        Icons.Outlined.Forum to "Chat",
        Icons.Outlined.CalendarMonth to "Meetings",
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
                .background(FICABg),
        ) {
            // Title — larger, bolder, more breathing room
            Text(
                text = "Networking",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = FICAText,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp, bottom = 16.dp),
                textAlign = TextAlign.Center,
            )

            // Sub-tab bar — full-width segmented control with bigger tap targets
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .shadow(3.dp, RoundedCornerShape(16.dp), ambientColor = Color.Black.copy(alpha = 0.05f))
                    .clip(RoundedCornerShape(16.dp))
                    .background(FICACard)
                    .padding(5.dp),
                horizontalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                tabs.forEachIndexed { idx, (icon, label) ->
                    val isSelected = selectedTab == idx
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .shadow(
                                elevation = if (isSelected) 4.dp else 0.dp,
                                shape = RoundedCornerShape(12.dp),
                                ambientColor = Color.Black.copy(alpha = 0.07f),
                            )
                            .background(if (isSelected) FICABg else Color.Transparent)
                            .clickable { selectedTab = idx; onTabChanged(idx) }
                            .padding(vertical = 11.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(5.dp),
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = label,
                            tint = if (isSelected) FICANavy else FICAMuted,
                            modifier = Modifier.size(22.dp),
                        )
                        Text(
                            text = label,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) FICANavy else FICAMuted,
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
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
    onBack: () -> Unit,
) {
    ConversationContent(
        otherUserId = otherUserId,
        otherUserName = otherUserName,
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
        // Search bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                modifier = Modifier
                    .weight(1f)
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
                        fontWeight = FontWeight.Normal,
                    ),
                    modifier = Modifier.weight(1f),
                    decorationBox = { inner ->
                        if (search.isEmpty()) {
                            Text("Search delegates...", fontSize = 14.sp, color = FICAMuted)
                        }
                        inner()
                    },
                )
                Spacer(modifier = Modifier.width(12.dp))
            }
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .shadow(2.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
                    .clip(RoundedCornerShape(14.dp))
                    .background(FICANavy.copy(alpha = 0.08f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "${filtered.size}",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = FICANavy,
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
                item { Spacer(modifier = Modifier.height(140.dp)) }
            }
        }
    }
}

@Composable
private fun AttendeeCard(attendee: Attendee, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(3.dp, RoundedCornerShape(16.dp), ambientColor = Color.Black.copy(alpha = 0.05f))
            .clip(RoundedCornerShape(16.dp))
            .background(FICACard)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AvatarView(name = attendee.name, photoUrl = attendee.photo_url, size = 52.dp, borderColor = FICABorder, borderWidth = 1.dp)
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(
                attendee.name,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (!attendee.job_title.isNullOrBlank()) {
                Text(
                    attendee.job_title,
                    fontSize = 12.sp,
                    color = FICASecondary,
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
                        Icons.Filled.Groups,
                        contentDescription = null,
                        tint = FICANavy.copy(alpha = 0.6f),
                        modifier = Modifier.size(11.dp),
                    )
                    Text(
                        attendee.organization,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = FICANavy.copy(alpha = 0.7f),
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
                        Button(
                            onClick = {
                                if (!connectionSent) {
                                    scope.launch {
                                        try {
                                            ApiClient.service.createConnection(
                                                CreateConnectionRequest(
                                                    requester_id = AuthManager.userId,
                                                    requested_id = attendee.id
                                                )
                                            )
                                            connectionSent = true
                                        } catch (_: Exception) {}
                                    }
                                }
                            },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (connectionSent) FICAInputBg else FICANavy,
                                contentColor = if (connectionSent) FICASecondary else Color.White,
                            ),
                        ) {
                            Icon(
                                if (connectionSent) Icons.Filled.Check else Icons.Filled.PersonAdd,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                if (connectionSent) "Sent" else "Connect",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                            )
                        }

                        // Message button
                        Button(
                            onClick = { onMessage(attendee.id, attendee.name) },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = FICAGold,
                                contentColor = FICADark,
                            ),
                        ) {
                            Icon(Icons.Filled.Email, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Message", fontWeight = FontWeight.Bold, fontSize = 15.sp)
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
        // Filter chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            filters.forEach { f ->
                val count = if (f == "all") connections.size else connections.count { it.status == f }
                val isSelected = filter == f
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(if (isSelected) FICANavy else FICACard)
                        .border(
                            width = 1.dp,
                            color = if (isSelected) FICANavy else FICABorder,
                            shape = RoundedCornerShape(50),
                        )
                        .clickable { filter = f }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                ) {
                    Text(
                        text = f.replaceFirstChar { it.uppercase() },
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isSelected) Color.White else FICASecondary,
                    )
                    if (count > 0) {
                        Box(
                            modifier = Modifier
                                .background(
                                    if (isSelected) Color.White.copy(alpha = 0.2f) else FICANavy.copy(alpha = 0.08f),
                                    RoundedCornerShape(50),
                                )
                                .padding(horizontal = 6.dp, vertical = 1.dp),
                        ) {
                            Text(
                                text = "$count",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) Color.White else FICANavy,
                            )
                        }
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
                    item { Spacer(modifier = Modifier.height(140.dp)) }
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
            .shadow(2.dp, RoundedCornerShape(14.dp))
            .background(FICACard, RoundedCornerShape(14.dp))
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AvatarView(name = otherName, photoUrl = otherPhoto, size = 46.dp, borderColor = FICABorder, borderWidth = 1.dp)
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(otherName, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = FICAText)
                if (!otherOrg.isNullOrBlank()) {
                    Text(otherOrg, fontSize = 12.sp, color = FICASecondary, maxLines = 1)
                }
            }
            StatusBadgeView(status = connection.status)
        }

        if (isIncoming && onAction != null) {
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = { onAction("accepted") },
                    modifier = Modifier.weight(1f).height(40.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = FICASuccess, contentColor = Color.White),
                ) {
                    Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Accept", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
                Button(
                    onClick = { onAction("declined") },
                    modifier = Modifier.weight(1f).height(40.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = FICAInputBg, contentColor = FICASecondary),
                ) {
                    Icon(Icons.Filled.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Decline", fontWeight = FontWeight.Bold, fontSize = 13.sp)
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
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (convo.unreadCount > 0) FICANavy.copy(alpha = 0.03f) else FICACard)
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AvatarView(name = convo.otherName, photoUrl = convo.otherPhoto, size = 50.dp, borderColor = FICABorder, borderWidth = 1.dp)
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    convo.otherName,
                    fontSize = 15.sp,
                    fontWeight = if (convo.unreadCount > 0) FontWeight.Bold else FontWeight.SemiBold,
                    color = FICAText,
                    modifier = Modifier.weight(1f),
                )
                if (convo.lastDate != null) {
                    Text(convo.lastDate, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = FICAMuted)
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    convo.lastMessage,
                    fontSize = 13.sp,
                    color = if (convo.unreadCount > 0) FICAText else FICAMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                if (convo.unreadCount > 0) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .size(22.dp)
                            .background(FICANavySolid, CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = "${convo.unreadCount}",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                        )
                    }
                }
            }
        }
    }
}

// ── ConversationContent (Chat detail) ──────────────────────────────────────

@Composable
private fun ConversationContent(
    otherUserId: Int,
    otherUserName: String,
    onBack: () -> Unit,
) {
    var messages by remember { mutableStateOf<List<Message>>(emptyList()) }
    var newMessage by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSending by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val myId = AuthManager.userId

    // Initial load
    LaunchedEffect(Unit) {
        try {
            val resp = ApiClient.service.getConversation(a = myId, b = otherUserId)
            if (resp.isSuccessful) messages = resp.body()?.messages ?: emptyList()
        } catch (_: Exception) {}
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
        // Header bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(FICACard)
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = FICANavy,
                    modifier = Modifier.size(22.dp),
                )
            }
            AvatarView(name = otherUserName, size = 34.dp, borderColor = FICABorder, borderWidth = 1.dp)
            Spacer(modifier = Modifier.width(10.dp))
            Text(otherUserName, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = FICAText)
        }
        HorizontalDivider(color = FICABorder, thickness = 0.5.dp)

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

        // Input bar
        HorizontalDivider(color = FICABorder, thickness = 0.5.dp)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(FICACard)
                .padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = newMessage,
                onValueChange = { newMessage = it },
                placeholder = { Text("Type a message...", fontSize = 15.sp) },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(20.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color.Transparent,
                    unfocusedBorderColor = Color.Transparent,
                    focusedContainerColor = FICAInputBg,
                    unfocusedContainerColor = FICAInputBg,
                ),
                maxLines = 4,
            )
            Spacer(modifier = Modifier.width(10.dp))
            IconButton(
                onClick = {
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
                                        // Append only if WebSocket hasn't already delivered it
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
                enabled = newMessage.trim().isNotBlank() && !isSending,
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.Send,
                    contentDescription = "Send",
                    tint = if (newMessage.trim().isNotBlank()) FICANavy else FICABorder,
                    modifier = Modifier.size(28.dp),
                )
            }
        }
    }
}

@Composable
private fun ChatBubble(message: Message, isMe: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isMe) Arrangement.End else Arrangement.Start,
        verticalAlignment = Alignment.Bottom,
    ) {
        if (!isMe) {
            AvatarView(name = message.sender_name ?: "", photoUrl = message.sender_photo, size = 30.dp, borderColor = FICABorder, borderWidth = 1.dp)
            Spacer(modifier = Modifier.width(8.dp))
        }
        if (isMe) Spacer(modifier = Modifier.width(50.dp))

        Column(horizontalAlignment = if (isMe) Alignment.End else Alignment.Start) {
            if (!message.subject.isNullOrBlank()) {
                Text(
                    message.subject,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isMe) Color.White.copy(alpha = 0.6f) else FICAMuted,
                )
            }
            Text(
                text = message.body,
                fontSize = 14.sp,
                color = if (isMe) Color.White else FICAText,
                lineHeight = 18.sp,
                modifier = Modifier
                    .background(
                        if (isMe) FICANavySolid else FICACard,
                        RoundedCornerShape(18.dp),
                    )
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            )
            if (message.sent_at != null) {
                Text(message.sent_at, fontSize = 10.sp, fontWeight = FontWeight.Medium, color = FICAMuted)
            }
        }

        if (!isMe) Spacer(modifier = Modifier.width(50.dp))
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
                    item { Spacer(modifier = Modifier.height(140.dp)) }
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
            .shadow(2.dp, RoundedCornerShape(14.dp))
            .background(FICACard, RoundedCornerShape(14.dp))
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AvatarView(name = otherName, photoUrl = otherPhoto, size = 46.dp, borderColor = FICABorder, borderWidth = 1.dp)
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(otherName, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = FICAText)
                if (!otherOrg.isNullOrBlank()) {
                    Text(otherOrg, fontSize = 12.sp, color = FICASecondary)
                }
            }
            StatusBadgeView(status = meeting.status ?: "pending")
        }

        if (!meeting.title.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(meeting.title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = FICANavy)
        }

        Spacer(modifier = Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            if (!meeting.meeting_date.isNullOrBlank()) {
                InfoChip(icon = Icons.Filled.CalendarMonth, text = meeting.meeting_date)
            }
            if (!meeting.start_time.isNullOrBlank()) {
                val timeText = meeting.start_time + if (!meeting.end_time.isNullOrBlank()) " - ${meeting.end_time}" else ""
                InfoChip(icon = Icons.Filled.Schedule, text = timeText)
            }
            if (!meeting.location.isNullOrBlank()) {
                InfoChip(icon = Icons.Filled.LocationOn, text = meeting.location)
            }
        }

        if (isIncoming) {
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = { onAction("accepted") },
                    modifier = Modifier.weight(1f).height(40.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = FICASuccess, contentColor = Color.White),
                ) {
                    Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Accept", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
                Button(
                    onClick = { onAction("declined") },
                    modifier = Modifier.weight(1f).height(40.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = FICAInputBg, contentColor = FICASecondary),
                ) {
                    Icon(Icons.Filled.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Decline", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
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
