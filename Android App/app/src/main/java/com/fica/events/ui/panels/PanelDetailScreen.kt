package com.fica.events.ui.panels

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fica.events.data.api.ApiClient
import com.fica.events.data.api.ChatWebSocket
import com.fica.events.data.models.Panel
import com.fica.events.data.models.PanelQuestion
import com.fica.events.data.models.PostPanelQuestionRequest
import com.fica.events.data.models.SessionGroup
import com.fica.events.ui.components.AvatarView
import com.fica.events.ui.components.LoadingView
import com.fica.events.ui.theme.FICABg
import com.fica.events.ui.theme.FICABorder
import com.fica.events.ui.theme.FICACard
import com.fica.events.ui.theme.FICADanger
import com.fica.events.ui.theme.FICAGold
import com.fica.events.ui.theme.FICAInputBg
import com.fica.events.ui.theme.FICAMuted
import com.fica.events.ui.theme.FICANavy
import com.fica.events.ui.theme.FICASecondary
import com.fica.events.ui.theme.FICASuccess
import com.fica.events.ui.theme.FICAText
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * Q&A board for a single panel. Ports the iOS PanelDetailView redesign —
 * full-width hero (not a card) carries the panel identity, and the
 * question list below is a chat-bubble feed rather than another stack of
 * cards. Composer is pinned to the bottom and self-gates on the per-panel
 * + response-level `discussion_enabled` flag.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PanelDetailScreen(panelId: Int, onBack: () -> Unit) {
    var panel by remember { mutableStateOf<Panel?>(null) }
    var questions by remember { mutableStateOf<List<PanelQuestion>>(emptyList()) }
    var discussionEnabled by remember { mutableStateOf(true) }
    var isLoadingQuestions by remember { mutableStateOf(true) }
    var draft by remember { mutableStateOf("") }
    var isPosting by remember { mutableStateOf(false) }
    var postError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val keyboard = LocalSoftwareKeyboardController.current

    suspend fun loadPanelMeta() {
        try {
            val resp = ApiClient.service.getPanels()
            val body = resp.body() ?: return
            val found = body.panels.firstOrNull { it.id == panelId }
            panel = found
            // Per-panel flag AND response-level — either closes the composer.
            discussionEnabled = (found?.isDiscussionEnabled ?: true) && body.panel_discussion_enabled
        } catch (_: Exception) {}
    }

    suspend fun loadQuestions() {
        try {
            val resp = ApiClient.service.getPanelQuestions(panelId)
            questions = resp.body()?.questions ?: emptyList()
        } catch (_: Exception) {}
    }

    LaunchedEffect(panelId) {
        isLoadingQuestions = questions.isEmpty()
        scope.launch { loadPanelMeta() }
        loadQuestions()
        isLoadingQuestions = false
    }

    // Live updates — admin toggling this panel's discussion flows in.
    DisposableEffect(panelId) {
        val token = ChatWebSocket.addPanelDiscussionHandler { sessionId, enabled ->
            if (sessionId == panelId) {
                discussionEnabled = enabled
                if (enabled) postError = null
            }
        }
        onDispose { ChatWebSocket.removePanelDiscussionHandler(token) }
    }

    val accent = panel?.let(::panelAccentColor) ?: FICANavy
    val group = panel?.let(::panelSessionGroup)

    val canSubmit = discussionEnabled && !isPosting && draft.trim().isNotEmpty()
    fun submit() {
        val trimmed = draft.trim()
        if (!canSubmit || trimmed.isEmpty()) return
        keyboard?.hide()
        focusManager.clearFocus()
        isPosting = true
        postError = null
        scope.launch {
            try {
                val resp = ApiClient.service.postPanelQuestion(
                    panelId, PostPanelQuestionRequest(trimmed),
                )
                val inserted = resp.body()?.question
                if (resp.isSuccessful && inserted != null) {
                    questions = listOf(inserted) + questions
                    draft = ""
                } else {
                    postError = "Failed to post question (${resp.code()})"
                }
            } catch (e: Exception) {
                postError = e.message ?: "Failed to post question"
            } finally {
                isPosting = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FICABg)
            .imePadding(),
    ) {
        CenterAlignedTopAppBar(
            title = {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "DISCUSSION",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = FICAMuted,
                        letterSpacing = 0.6.sp,
                    )
                    Text(
                        text = panel?.title ?: "Panel",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = FICAText,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = FICAText,
                    )
                }
            },
            colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = FICABg),
        )

        Box(modifier = Modifier.weight(1f)) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 12.dp),
            ) {
                panel?.let { p ->
                    item(key = "hero") {
                        PanelHero(
                            panel = p,
                            accent = accent,
                            group = group,
                            discussionEnabled = discussionEnabled,
                        )
                    }
                }
                item(key = "q-header") {
                    QuestionsSectionHeader(count = questions.size)
                }
                when {
                    isLoadingQuestions && questions.isEmpty() -> item(key = "loading") {
                        Box(modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp)) {
                            LoadingView(message = "Loading questions...")
                        }
                    }
                    questions.isEmpty() -> item(key = "empty") {
                        EmptyQuestions(open = discussionEnabled)
                    }
                    else -> items(questions, key = { it.id }) { q ->
                        Box(modifier = Modifier.padding(horizontal = 20.dp, vertical = 7.dp)) {
                            QuestionBubble(question = q, accent = accent)
                        }
                    }
                }
            }
        }

        // Top hairline over the composer.
        HorizontalDivider(color = FICABorder.copy(alpha = 0.4f), thickness = 0.5.dp)
        Composer(
            draft = draft,
            onChange = { draft = it },
            enabled = discussionEnabled,
            isPosting = isPosting,
            canSubmit = canSubmit,
            accent = accent,
            onSubmit = ::submit,
            error = postError,
        )
    }
}

// ─── Hero ──────────────────────────────────────────────────────────────

@Composable
private fun PanelHero(
    panel: Panel,
    accent: Color,
    group: SessionGroup?,
    discussionEnabled: Boolean,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(FICABg)
            .padding(horizontal = 20.dp)
            .padding(top = 16.dp, bottom = 18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // Accent stripe + group label + status chip
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                modifier = Modifier
                    .width(20.dp)
                    .height(3.dp)
                    .background(accent),
            )
            Text(
                text = (group?.label ?: "Panel Discussion").uppercase(),
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = accent,
                letterSpacing = 0.6.sp,
            )
            Spacer(modifier = Modifier.weight(1f))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(if (discussionEnabled) FICASuccess else FICADanger),
                )
                Text(
                    text = if (discussionEnabled) "Open for questions" else "Closed",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (discussionEnabled) FICASuccess else FICADanger,
                )
            }
        }

        // Title
        Text(
            text = panel.title,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = FICAText,
            lineHeight = 27.sp,
        )

        // Meta row — time + room
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            if (!panel.start_time.isNullOrBlank() && !panel.end_time.isNullOrBlank()) {
                IconText(
                    icon = Icons.Filled.Schedule,
                    text = "${panel.start_time} – ${panel.end_time}",
                    color = FICASecondary,
                    size = 12,
                )
            }
            if (!panel.room.isNullOrBlank()) {
                IconText(
                    icon = Icons.Filled.LocationOn,
                    text = panel.room,
                    color = FICASecondary,
                    size = 12,
                )
            }
        }

        // Speaker + moderator row
        if (!panel.speaker_name.isNullOrBlank() || !panel.moderator.isNullOrBlank()) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                if (!panel.speaker_name.isNullOrBlank()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        AvatarView(
                            name = panel.speaker_name,
                            photoUrl = panel.speaker_photo,
                            size = 36.dp,
                            borderColor = FICABorder,
                            borderWidth = 1.dp,
                        )
                        Column {
                            Text(
                                text = panel.speaker_name,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = FICAText,
                            )
                            val role = panel.speaker_title ?: panel.speaker_org
                            if (!role.isNullOrBlank()) {
                                Text(
                                    text = role,
                                    fontSize = 11.sp,
                                    color = FICAMuted,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                    }
                }
                if (!panel.moderator.isNullOrBlank()) {
                    Box(
                        modifier = Modifier
                            .width(1.dp)
                            .height(28.dp)
                            .background(FICABorder),
                    )
                    Column {
                        Text(
                            text = "MODERATOR",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = FICAMuted,
                            letterSpacing = 0.6.sp,
                        )
                        Text(
                            text = panel.moderator,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = FICASecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }

        // Description
        if (!panel.description.isNullOrBlank()) {
            Text(
                text = panel.description,
                fontSize = 13.sp,
                color = FICASecondary,
                lineHeight = 19.sp,
            )
        }

        // Panel-member callout
        if (panel.isPanelMember) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(FICAGold.copy(alpha = 0.1f))
                    .padding(horizontal = 12.dp, vertical = 9.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.Star,
                    contentDescription = null,
                    tint = FICAGold,
                    modifier = Modifier.size(11.dp),
                )
                Text(
                    text = "You're on this panel — audience questions appear below.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = FICAGold,
                )
            }
        }
    }

    // Bottom hairline to separate hero from feed
    HorizontalDivider(color = FICABorder.copy(alpha = 0.4f), thickness = 0.5.dp)
}

// ─── Questions list ────────────────────────────────────────────────────

@Composable
private fun QuestionsSectionHeader(count: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(top = 14.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(
            imageVector = Icons.Filled.ChatBubbleOutline,
            contentDescription = null,
            tint = FICAMuted,
            modifier = Modifier.size(11.dp),
        )
        Text(
            text = "QUESTIONS · $count",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = FICAMuted,
            letterSpacing = 0.6.sp,
        )
    }
}

@Composable
private fun EmptyQuestions(open: Boolean) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 40.dp, horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            imageVector = Icons.Filled.ChatBubbleOutline,
            contentDescription = null,
            tint = FICABorder,
            modifier = Modifier.size(36.dp),
        )
        Text(
            text = "No questions yet",
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = FICASecondary,
        )
        Text(
            text = if (open) "Be the first to ask." else "This panel is closed for new questions.",
            fontSize = 12.sp,
            color = FICAMuted,
        )
    }
}

/**
 * Chat-style bubble. Avatar + name + timestamp form the header; the
 * message sits in a tinted, rounded card below. Panel-member questions
 * get the accent color tint so panelists can scan who's who.
 */
@Composable
private fun QuestionBubble(question: PanelQuestion, accent: Color) {
    val isPanelist = question.isPanelMember
    val bubbleBg = if (isPanelist) accent.copy(alpha = 0.08f) else FICACard
    val bubbleBorder = if (isPanelist) accent.copy(alpha = 0.25f) else FICABorder.copy(alpha = 0.4f)

    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top,
    ) {
        AvatarView(
            name = question.attendee_name ?: "?",
            photoUrl = question.attendee_photo,
            size = 36.dp,
            borderColor = FICABorder,
            borderWidth = 1.dp,
        )
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            // Name + Panelist pill + timestamp
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = question.attendee_name ?: "Attendee",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAText,
                )
                if (isPanelist) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(accent.copy(alpha = 0.15f))
                            .padding(horizontal = 5.dp, vertical = 2.dp),
                    ) {
                        Text(
                            text = "Panelist",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = accent,
                            letterSpacing = 0.4.sp,
                        )
                    }
                }
                Spacer(modifier = Modifier.weight(1f))
                question.created_at?.let { d ->
                    Text(
                        text = relativeTime(d),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        color = FICAMuted,
                    )
                }
            }

            if (!question.attendee_org.isNullOrBlank()) {
                Text(
                    text = question.attendee_org,
                    fontSize = 10.sp,
                    color = FICAMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            // Message bubble
            Box(
                modifier = Modifier
                    .padding(top = 2.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(bubbleBg)
                    .border(0.5.dp, bubbleBorder, RoundedCornerShape(14.dp))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
            ) {
                Text(
                    text = question.question,
                    fontSize = 14.sp,
                    color = FICAText,
                    lineHeight = 20.sp,
                )
            }
        }
    }
}

// ─── Composer ─────────────────────────────────────────────────────────

@Composable
private fun Composer(
    draft: String,
    onChange: (String) -> Unit,
    enabled: Boolean,
    isPosting: Boolean,
    canSubmit: Boolean,
    accent: Color,
    onSubmit: () -> Unit,
    error: String?,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(FICABg)
            .navigationBarsPadding(),
    ) {
        if (error != null) {
            Text(
                text = error,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = FICADanger,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(FICADanger.copy(alpha = 0.06f))
                    .padding(horizontal = 20.dp, vertical = 6.dp),
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            OutlinedTextField(
                value = draft,
                onValueChange = onChange,
                enabled = enabled && !isPosting,
                placeholder = {
                    Text(
                        text = if (enabled) "Ask the panel..." else "This panel is closed for new questions",
                        fontSize = 14.sp,
                        color = FICAMuted.copy(alpha = 0.7f),
                    )
                },
                shape = RoundedCornerShape(18.dp),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Default),
                colors = OutlinedTextFieldDefaults.colors(
                    // Focus picks up the panel's session-group accent, matching iOS.
                    focusedBorderColor = accent,
                    unfocusedBorderColor = Color.Transparent,
                    focusedContainerColor = FICAInputBg,
                    unfocusedContainerColor = FICAInputBg,
                    disabledContainerColor = FICAInputBg,
                    disabledBorderColor = Color.Transparent,
                ),
                maxLines = 5,
                modifier = Modifier.weight(1f),
            )
            IconButton(
                onClick = onSubmit,
                enabled = canSubmit,
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(if (canSubmit) accent else FICABorder),
            ) {
                if (isPosting) {
                    CircularProgressIndicator(
                        color = Color.White,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(18.dp),
                    )
                } else {
                    Icon(
                        imageVector = Icons.Filled.ArrowUpward,
                        contentDescription = "Post",
                        tint = Color.White,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────

@Composable
private fun IconText(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String,
    color: Color,
    size: Int = 12,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(size.dp),
        )
        Text(text = text, fontSize = size.sp, fontWeight = FontWeight.Medium, color = color)
    }
}

/** Same accent-color mapping as PanelsScreen so the hero matches the list card. */
private fun panelAccentColor(panel: Panel): Color =
    panelSessionGroup(panel)?.color ?: FICANavy

// ─── Relative time helper ────────────────────────────────────────────

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
            try { fmt.isLenient = false; date = fmt.parse(isoString); if (date != null) break } catch (_: Exception) {}
        }
        if (date == null) return ""
        val diffMs = System.currentTimeMillis() - date.time
        val mins = TimeUnit.MILLISECONDS.toMinutes(diffMs)
        val hours = TimeUnit.MILLISECONDS.toHours(diffMs)
        val days = TimeUnit.MILLISECONDS.toDays(diffMs)
        when {
            mins < 1 -> "just now"
            mins < 60 -> "${mins}m ago"
            hours < 24 -> "${hours}h ago"
            days < 7 -> "${days}d ago"
            else -> SimpleDateFormat("d MMM", Locale.US).format(date)
        }
    } catch (_: Exception) { "" }
}
