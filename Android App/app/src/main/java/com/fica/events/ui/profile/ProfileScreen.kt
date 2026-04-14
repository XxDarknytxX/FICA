package com.fica.events.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fica.events.data.api.ApiClient
import com.fica.events.data.auth.AuthManager
import com.fica.events.data.models.toBool
import com.fica.events.ui.components.*
import com.fica.events.ui.theme.*

@Composable
fun ProfileScreen(onLogout: (() -> Unit)? = null) {
    val user = AuthManager.currentUser
    var connectionsCount by remember { mutableIntStateOf(0) }
    var meetingsCount by remember { mutableIntStateOf(0) }
    var pendingCount by remember { mutableIntStateOf(0) }
    var upcomingMeetings by remember { mutableIntStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }
    var isDarkMode by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        try {
            val cResp = ApiClient.service.getConnections(attendeeId = AuthManager.userId)
            if (cResp.isSuccessful) {
                val connections = cResp.body()?.connections ?: emptyList()
                connectionsCount = connections.count { it.status == "accepted" }
                pendingCount = connections.count { it.status == "pending" && it.requested_id == AuthManager.userId }
            }
        } catch (_: Exception) {}
        try {
            val mResp = ApiClient.service.getMeetings(attendeeId = AuthManager.userId)
            if (mResp.isSuccessful) {
                val meetings = mResp.body()?.meetings ?: emptyList()
                meetingsCount = meetings.size
                upcomingMeetings = meetings.count { it.status == "accepted" || it.status == "pending" }
            }
        } catch (_: Exception) {}
        isLoading = false
    }

    // Check-in text
    val d1 = user?.check_in_day1?.toBool() ?: false
    val d2 = user?.check_in_day2?.toBool() ?: false
    val checkInText = when {
        d1 && d2 -> "Both"
        d1 -> "Day 1"
        d2 -> "Day 2"
        else -> "—"
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FICABg)
            .verticalScroll(rememberScrollState()),
    ) {
        // ── Hero header ────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(FICAHeroGradient)
                .padding(top = 40.dp, bottom = 20.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                AvatarView(
                    name = user?.name ?: "User",
                    photoUrl = user?.photo_url,
                    size = 86.dp,
                    borderColor = FICAGold,
                    borderWidth = 3.dp,
                )
                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    text = user?.name ?: "Delegate",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
                if (!user?.job_title.isNullOrBlank()) {
                    Text(
                        text = user?.job_title ?: "",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White.copy(alpha = 0.7f),
                    )
                }
                if (!user?.organization.isNullOrBlank()) {
                    Text(
                        text = user?.organization ?: "",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = FICAGold,
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TicketBadgeView(ticketType = user?.ticket_type)
                    if (!user?.registration_code.isNullOrBlank()) {
                        Row(
                            modifier = Modifier
                                .background(Color.White.copy(alpha = 0.15f), RoundedCornerShape(50))
                                .padding(horizontal = 10.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Icon(
                                Icons.Filled.Star,
                                contentDescription = null,
                                tint = Color.White.copy(alpha = 0.8f),
                                modifier = Modifier.size(10.dp),
                            )
                            Text(
                                text = user?.registration_code ?: "",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = Color.White.copy(alpha = 0.8f),
                            )
                        }
                    }
                }
            }
        }

        // ── Content sections ───────────────────────────────────────────────
        Column(
            modifier = Modifier
                .padding(horizontal = 20.dp)
                .padding(top = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // ── Stats Row (matches iOS: 3 items with check-in) ────────────
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatPill(
                    icon = Icons.Filled.Groups,
                    value = "$connectionsCount",
                    label = "Connections",
                    color = FICANavy,
                    modifier = Modifier.weight(1f),
                )
                StatPill(
                    icon = Icons.Filled.CalendarMonth,
                    value = "$meetingsCount",
                    label = "Meetings",
                    color = FICAGold,
                    modifier = Modifier.weight(1f),
                )
                StatPill(
                    icon = Icons.Filled.Verified,
                    value = checkInText,
                    label = "Check-in",
                    color = FICASuccess,
                    modifier = Modifier.weight(1f),
                )
            }

            // ── Quick Info Card (matches iOS: email, phone, registration, dietary, social, bio) ──
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(6.dp, RoundedCornerShape(16.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
                    .background(FICACard, RoundedCornerShape(16.dp)),
            ) {
                CardRow(icon = Icons.Filled.Email, label = "Email", value = user?.email ?: "—", color = FICANavy)
                CardDivider()
                CardRow(icon = Icons.Filled.Phone, label = "Phone", value = user?.phone ?: "—", color = FICASuccess)
                CardDivider()
                CardRow(icon = Icons.Filled.Star, label = "Registration", value = user?.registration_code ?: "—", color = FICAGold, monospaced = true)

                if (!user?.dietary_requirements.isNullOrBlank()) {
                    CardDivider()
                    CardRow(icon = Icons.Filled.Star, label = "Dietary", value = user?.dietary_requirements ?: "", color = Color(0xFF22C55E))
                }

                // Social links
                val hasSocial = !user?.linkedin.isNullOrBlank() || !user?.twitter.isNullOrBlank() || !user?.website.isNullOrBlank()
                if (hasSocial) {
                    CardDivider()
                    if (!user?.linkedin.isNullOrBlank()) {
                        CardRow(icon = Icons.Outlined.Link, label = "LinkedIn", value = "Connected", color = Color(0xFF0077B5))
                    }
                    if (!user?.twitter.isNullOrBlank()) {
                        if (!user?.linkedin.isNullOrBlank()) CardDivider()
                        CardRow(icon = Icons.Outlined.Person, label = "Twitter / X", value = user?.twitter ?: "", color = Color(0xFF1DA1F2))
                    }
                    if (!user?.website.isNullOrBlank()) {
                        if (!user?.linkedin.isNullOrBlank() || !user?.twitter.isNullOrBlank()) CardDivider()
                        CardRow(icon = Icons.Outlined.Language, label = "Website", value = user?.website ?: "", color = FICASuccess)
                    }
                }

                // Bio
                if (!user?.bio.isNullOrBlank()) {
                    CardDivider()
                    Column(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Icon(
                                Icons.Filled.Star,
                                contentDescription = null,
                                tint = FICAGold,
                                modifier = Modifier.size(12.dp),
                            )
                            Text(
                                "Bio",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = FICAMuted,
                            )
                        }
                        Text(
                            text = user?.bio ?: "",
                            fontSize = 13.sp,
                            color = FICASecondary,
                            lineHeight = 18.sp,
                            modifier = Modifier.padding(start = 20.dp),
                        )
                    }
                }
            }

            // ── Activity Card (matches iOS) ───────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(6.dp, RoundedCornerShape(16.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
                    .background(FICACard, RoundedCornerShape(16.dp)),
            ) {
                // Header
                Row(
                    modifier = Modifier
                        .padding(horizontal = 16.dp)
                        .padding(top = 16.dp, bottom = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(Icons.Filled.Star, contentDescription = null, tint = FICAGold, modifier = Modifier.size(12.dp))
                    Text("Activity", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = FICAText)
                }

                if (pendingCount > 0) {
                    ActivityItem(
                        icon = Icons.Filled.Groups,
                        text = "$pendingCount pending connection request${if (pendingCount == 1) "" else "s"}",
                        color = FICAWarning,
                    )
                }
                if (upcomingMeetings > 0) {
                    if (pendingCount > 0) CardDivider()
                    ActivityItem(
                        icon = Icons.Filled.CalendarMonth,
                        text = "$upcomingMeetings upcoming meeting${if (upcomingMeetings == 1) "" else "s"}",
                        color = FICAGold,
                    )
                }
                if (pendingCount == 0 && upcomingMeetings == 0) {
                    ActivityItem(
                        icon = Icons.Filled.CheckCircle,
                        text = "You're all caught up",
                        color = FICASuccess,
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
            }

            // ── Preferences Card ───────────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(6.dp, RoundedCornerShape(16.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
                    .background(FICACard, RoundedCornerShape(16.dp)),
            ) {
                // Header
                Row(
                    modifier = Modifier
                        .padding(horizontal = 16.dp)
                        .padding(top = 16.dp, bottom = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(Icons.Filled.Settings, contentDescription = null, tint = FICAMuted, modifier = Modifier.size(12.dp))
                    Text("Preferences", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = FICAText)
                }

                Row(
                    modifier = Modifier
                        .padding(horizontal = 16.dp)
                        .padding(bottom = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .background(FICANavy.copy(alpha = 0.1f), RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            if (isDarkMode) Icons.Filled.DarkMode else Icons.Filled.LightMode,
                            contentDescription = null,
                            tint = if (isDarkMode) Color(0xFF6366F1) else Color(0xFFF97316),
                            modifier = Modifier.size(14.dp),
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Appearance", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = FICAText)
                        Text(
                            if (isDarkMode) "Dark Mode" else "Light Mode",
                            fontSize = 11.sp,
                            color = FICAMuted,
                        )
                    }
                    Switch(
                        checked = isDarkMode,
                        onCheckedChange = { isDarkMode = it },
                        colors = SwitchDefaults.colors(checkedTrackColor = FICANavy),
                    )
                }
            }

            // ── Sign Out Card ──────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(6.dp, RoundedCornerShape(16.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
                    .background(FICACard, RoundedCornerShape(16.dp))
                    .clickable { showLogoutDialog = true }
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .background(FICADanger.copy(alpha = 0.1f), RoundedCornerShape(8.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, tint = FICADanger, modifier = Modifier.size(13.dp))
                }
                Spacer(modifier = Modifier.width(12.dp))
                Text("Sign Out", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = FICADanger)
                Spacer(modifier = Modifier.weight(1f))
                Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = FICABorder, modifier = Modifier.size(10.dp))
            }

            // ── Footer ────────────────────────────────────────────────────
            Text(
                text = "FICA Congress 2026 \u00b7 v1.0",
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                color = FICAMuted,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp, bottom = 20.dp),
                textAlign = TextAlign.Center,
            )
        }
    }

    // Logout confirmation dialog
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Sign Out") },
            text = { Text("Are you sure you want to sign out?") },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    AuthManager.logout()
                    onLogout?.invoke()
                }) {
                    Text("Sign Out", color = FICADanger, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel", color = FICASecondary)
                }
            },
        )
    }
}

// ── Stat Pill (matches iOS) ───────────────────────────────────────────────

@Composable
private fun StatPill(
    icon: ImageVector,
    value: String,
    label: String,
    color: Color,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .shadow(6.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .background(FICACard, RoundedCornerShape(14.dp))
            .padding(vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .background(color.copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(15.dp))
        }
        Text(value, fontSize = 17.sp, fontWeight = FontWeight.Black, color = FICAText)
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.Medium, color = FICAMuted)
    }
}

// ── Activity Item (matches iOS) ───────────────────────────────────────────

@Composable
private fun ActivityItem(
    icon: ImageVector,
    text: String,
    color: Color,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .background(color.copy(alpha = 0.1f), RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(13.dp))
        }
        Spacer(modifier = Modifier.width(12.dp))
        Text(text, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = FICAText, modifier = Modifier.weight(1f))
        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = FICABorder, modifier = Modifier.size(10.dp))
    }
}

// ── Card Row + Divider helpers ─────────────────────────────────────────────

@Composable
private fun CardRow(
    icon: ImageVector,
    label: String,
    value: String,
    color: Color,
    monospaced: Boolean = false,
) {
    Row(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .background(color.copy(alpha = 0.1f), RoundedCornerShape(7.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(12.dp))
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(
                label.uppercase(),
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = FICAMuted,
                letterSpacing = 0.3.sp,
            )
            Text(
                value,
                fontSize = 13.sp,
                fontWeight = if (monospaced) FontWeight.SemiBold else FontWeight.Medium,
                fontFamily = if (monospaced) FontFamily.Monospace else FontFamily.Default,
                color = FICAText,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun CardDivider() {
    HorizontalDivider(
        color = FICABorder,
        thickness = 0.5.dp,
        modifier = Modifier.padding(start = 56.dp),
    )
}
