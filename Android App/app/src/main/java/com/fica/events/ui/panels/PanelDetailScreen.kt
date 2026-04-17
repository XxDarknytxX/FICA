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
import androidx.compose.material.icons.filled.Mic
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
import java.util.TimeZone
import java.util.concurrent.TimeUnit

/**
 * Q&A board for a single panel.
 *
 * Redesigned for density + modern feel:
 *   - Compact 3-line hero: eyebrow row (SESSION · time · room · status),
 *     title, speaker/moderator merged into one line. No wall of stacked
 *     sections.
 *   - Description collapsed below the hero as a tight paragraph.
 *   - Chat bubbles for the question feed; no extra card around each.
 *   - Composer pinned with `navigationBarsPadding()` so the input and
 *     submit button stay above the system gesture area.
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
                Text(
                    text = "Panel Discussion",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAText,
                )
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
                contentPadding = PaddingValues(top = 4.dp, bottom = 16.dp),
            ) {
                panel?.let { p ->
                    item(key = "hero") {
                        CompactHero(
                            panel = p,
                            accent = accent,
                            group = group,
                            discussionEnabled = discussionEnabled,
                        )
                    }
                }
                item(key = "q-header") { QuestionsHeader(count = questions.size) }

                when {
                    isLoadingQuestions && questions.isEmpty() -> item(key = "loading") {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 32.dp),
                        ) { LoadingView(message = "Loading questions...") }
                    }
                    questions.isEmpty() -> item(key = "empty") {
                        EmptyQuestions(open = discussionEnabled)
                    }
                    else -> items(questions, key = { it.id }) { q ->
                        Box(modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp)) {
                            QuestionBubble(question = q, accent = accent)
                        }
                    }
                }
            }
        }

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

// ─── Hero — compact 3-row identity block ───────────────────────────────

@Composable
private fun CompactHero(
    panel: Panel,
    accent: Color,
    group: SessionGroup?,
    discussionEnabled: Boolean,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(top = 10.dp, bottom = 12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // Eyebrow: SESSION pill · time · room · status (right)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(accent.copy(alpha = 0.12f))
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            ) {
                Text(
                    text = (group?.label ?: "Panel").uppercase(),
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = accent,
                    letterSpacing = 0.6.sp,
                )
            }
            if (!panel.start_time.isNullOrBlank() && !panel.end_time.isNullOrBlank()) {
                MetaDot()
                MetaIconText(
                    icon = Icons.Filled.Schedule,
                    text = "${panel.start_time} – ${panel.end_time}",
                )
            }
            if (!panel.room.isNullOrBlank()) {
                MetaDot()
                MetaIconText(icon = Icons.Filled.LocationOn, text = panel.room)
            }
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
                    text = if (discussionEnabled) "Open" else "Closed",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (discussionEnabled) FICASuccess else FICADanger,
                )
            }
        }

        // Title
        Text(
            text = panel.title,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = FICAText,
            lineHeight = 24.sp,
        )

        // Speaker + moderator on one row — each is a little avatar/initial
        // pair, both collapse gracefully if missing.
        if (!panel.speaker_name.isNullOrBlank() || !panel.moderator.isNullOrBlank()) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                if (!panel.speaker_name.isNullOrBlank()) {
                    PersonInline(
                        label = "Speaker",
                        name = panel.speaker_name,
                        sub = panel.speaker_title ?: panel.speaker_org,
                        photo = panel.speaker_photo,
                    )
                }
                if (!panel.moderator.isNullOrBlank()) {
                    PersonInline(
                        label = "Moderator",
                        name = panel.moderator,
                        sub = null,
                        photo = null,
                    )
                }
            }
        }

        // Description — kept tight so it doesn't dominate the hero.
        if (!panel.description.isNullOrBlank()) {
            Text(
                text = panel.description,
                fontSize = 13.sp,
                color = FICASecondary,
                lineHeight = 19.sp,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
            )
        }

        // Panelist callout — only shows for attendees on the panel, tight band.
        if (panel.isPanelMember) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(FICAGold.copy(alpha = 0.1f))
                    .padding(horizontal = 10.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.Star,
                    contentDescription = null,
                    tint = FICAGold,
                    modifier = Modifier.size(11.dp),
                )
                Text(
                    text = "You're on this panel — audience questions below.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = FICAGold,
                )
            }
        }
    }

    HorizontalDivider(color = FICABorder.copy(alpha = 0.4f), thickness = 0.5.dp)
}

@Composable
private fun PersonInline(label: String, name: String, sub: String?, photo: String?) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (photo != null || label == "Speaker") {
            AvatarView(
                name = name,
                photoUrl = photo,
                size = 30.dp,
                borderColor = FICABorder,
                borderWidth = 1.dp,
            )
        } else {
            // Moderator usually arrives as a plain string — use a mic icon
            // chip so it doesn't collide visually with the speaker photo.
            Box(
                modifier = Modifier
                    .size(30.dp)
                    .clip(CircleShape)
                    .background(FICAInputBg),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Mic,
                    contentDescription = null,
                    tint = FICAMuted,
                    modifier = Modifier.size(14.dp),
                )
            }
        }
        // Two tightly-stacked lines — label inline with name (light
        // weight, small), and sub directly below with a 13sp line height
        // so there's no stray gap from font metrics.
        Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                Text(
                    text = label,
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAMuted,
                    letterSpacing = 0.4.sp,
                    lineHeight = 11.sp,
                )
                Box(
                    modifier = Modifier
                        .size(width = 2.dp, height = 2.dp)
                        .clip(CircleShape)
                        .background(FICABorder),
                )
                Text(
                    text = name,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAText,
                    lineHeight = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            if (!sub.isNullOrBlank()) {
                Text(
                    text = sub,
                    fontSize = 10.5.sp,
                    color = FICAMuted,
                    lineHeight = 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

// ─── Questions list ────────────────────────────────────────────────────

@Composable
private fun QuestionsHeader(count: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(top = 14.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(
            text = "Questions",
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = FICAText,
        )
        Text(
            text = "$count",
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = FICAMuted,
            modifier = Modifier
                .clip(RoundedCornerShape(50))
                .background(FICAInputBg)
                .padding(horizontal = 7.dp, vertical = 2.dp),
        )
    }
}

@Composable
private fun EmptyQuestions(open: Boolean) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 36.dp, horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(
            imageVector = Icons.Filled.ChatBubbleOutline,
            contentDescription = null,
            tint = FICABorder,
            modifier = Modifier.size(32.dp),
        )
        Text(
            text = "No questions yet",
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = FICASecondary,
        )
        Text(
            text = if (open) "Be the first to ask." else "The panel is closed for new questions.",
            fontSize = 11.5.sp,
            color = FICAMuted,
        )
    }
}

/** Chat-style bubble. Header line (name · org, timestamp right) + message card. */
@Composable
private fun QuestionBubble(question: PanelQuestion, accent: Color) {
    val isPanelist = question.isPanelMember
    val bubbleBg = if (isPanelist) accent.copy(alpha = 0.08f) else FICACard
    val bubbleBorder = if (isPanelist) accent.copy(alpha = 0.25f) else FICABorder.copy(alpha = 0.4f)

    // Build a single inline "Alice Smith · KPMG Fiji" header instead of
    // stacking name + org on two rows — that old layout left a gap that
    // looked loose on small screens.
    val headerLine = buildString {
        append(question.attendee_name ?: "Attendee")
        if (!question.attendee_org.isNullOrBlank()) {
            append(" · ")
            append(question.attendee_org)
        }
    }

    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top,
    ) {
        AvatarView(
            name = question.attendee_name ?: "?",
            photoUrl = question.attendee_photo,
            size = 32.dp,
            borderColor = FICABorder,
            borderWidth = 1.dp,
        )
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = headerLine,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAText,
                    lineHeight = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = true),
                )
                if (isPanelist) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(accent.copy(alpha = 0.15f))
                            .padding(horizontal = 5.dp, vertical = 1.dp),
                    ) {
                        Text(
                            text = "Panelist",
                            fontSize = 8.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = accent,
                            letterSpacing = 0.4.sp,
                            lineHeight = 10.sp,
                        )
                    }
                }
                question.created_at?.let { d ->
                    Text(
                        text = relativeTime(d),
                        fontSize = 10.sp,
                        color = FICAMuted,
                        lineHeight = 12.sp,
                    )
                }
            }

            // Message bubble — no padding(top) above; the 6dp column
            // spacing handles the gap so we don't stack margins.
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(bubbleBg)
                    .border(0.5.dp, bubbleBorder, RoundedCornerShape(12.dp))
                    .padding(horizontal = 12.dp, vertical = 9.dp),
            ) {
                Text(
                    text = question.question,
                    fontSize = 13.5.sp,
                    color = FICAText,
                    lineHeight = 19.sp,
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
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            OutlinedTextField(
                value = draft,
                onValueChange = onChange,
                enabled = enabled && !isPosting,
                placeholder = {
                    Text(
                        text = if (enabled) "Ask the panel..."
                               else "Discussion is currently closed",
                        fontSize = 14.sp,
                        color = FICAMuted.copy(alpha = 0.7f),
                    )
                },
                shape = RoundedCornerShape(18.dp),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Default),
                colors = OutlinedTextFieldDefaults.colors(
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
                        modifier = Modifier.size(16.dp),
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

@Composable
private fun MetaDot() {
    Text(text = "·", fontSize = 11.sp, color = FICABorder)
}

/** Same accent color as PanelsScreen so list + hero stay visually linked. */
private fun panelAccentColor(panel: Panel): Color =
    panelSessionGroup(panel)?.color ?: FICANavy

// ─── Relative time helper ────────────────────────────────────────────

private fun relativeTime(isoString: String?): String {
    if (isoString.isNullOrBlank()) return ""
    return try {
        // Server sends UTC timestamps ending in Z (e.g. "2026-04-17T22:30:00Z").
        // The 'Z' in the pattern is a quoted literal — not a timezone marker —
        // so we explicitly set the parser's timezone to UTC. Without this, on
        // a Fiji (UTC+12) phone, parsed instants were 12h off, which cascaded
        // into the relative-time text ("13h ago" for a question posted 1h ago).
        val utc = TimeZone.getTimeZone("UTC")
        val formats = listOf(
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = utc },
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply { timeZone = utc },
            SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).apply { timeZone = utc },
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
            // "d MMM" formatter intentionally uses the device's local zone so
            // the user sees the date the way they'd expect in their timezone.
            else -> SimpleDateFormat("d MMM", Locale.US).format(date)
        }
    } catch (_: Exception) { "" }
}
