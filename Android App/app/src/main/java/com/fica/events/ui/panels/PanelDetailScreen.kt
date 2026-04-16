package com.fica.events.ui.panels

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
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.RecordVoiceOver
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
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fica.events.data.api.ApiClient
import com.fica.events.data.models.Panel
import com.fica.events.data.models.PanelQuestion
import com.fica.events.data.models.PostPanelQuestionRequest
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
import com.fica.events.ui.theme.FICAText
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * Q&A board for a single panel. Panel metadata is fetched via the same
 * `/panels` list endpoint (looked up by id) to avoid a separate detail
 * endpoint. Questions stream in via their own endpoint + pull-to-refresh,
 * and the bottom composer posts via `POST /panels/:id/questions`.
 *
 * The composer is disabled when the backend reports
 * `panel_discussion_enabled == false`.
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
            panel = body.panels.firstOrNull { it.id == panelId }
            discussionEnabled = body.panel_discussion_enabled
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
        // Load both in parallel so the header + question list arrive together.
        scope.launch { loadPanelMeta() }
        loadQuestions()
        isLoadingQuestions = false
    }

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
                val resp = ApiClient.service.postPanelQuestion(panelId, PostPanelQuestionRequest(trimmed))
                val inserted = resp.body()?.question
                if (resp.isSuccessful && inserted != null) {
                    // Prepend so it shows up at the top (newest first).
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
                    text = panel?.title ?: "Panel",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
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
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                panel?.let { p ->
                    item(key = "header") { PanelHeaderCard(panel = p) }
                }
                item(key = "q-header") { QuestionsSectionHeader(count = questions.size) }

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
                        QuestionRow(question = q)
                    }
                }
            }
        }

        HorizontalDivider(color = FICABorder)
        Composer(
            draft = draft,
            onChange = { draft = it },
            enabled = discussionEnabled,
            isPosting = isPosting,
            canSubmit = canSubmit,
            onSubmit = ::submit,
            error = postError,
        )
    }
}

@Composable
private fun PanelHeaderCard(panel: Panel) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(1.5.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .clip(RoundedCornerShape(14.dp))
            .background(FICACard)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        // "PANEL" pill
        Row(
            modifier = Modifier
                .clip(RoundedCornerShape(50))
                .background(FICANavy.copy(alpha = 0.08f))
                .padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(Icons.Filled.Forum, null, tint = FICANavy, modifier = Modifier.size(11.dp))
            Text("Panel", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = FICANavy)
        }

        Text(
            text = panel.title,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = FICAText,
            lineHeight = 22.sp,
        )

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            if (!panel.start_time.isNullOrBlank() && !panel.end_time.isNullOrBlank()) {
                IconText(
                    icon = Icons.Filled.Schedule,
                    text = "${panel.start_time} – ${panel.end_time}",
                    color = FICASecondary,
                )
            }
            if (!panel.room.isNullOrBlank()) {
                IconText(icon = Icons.Filled.LocationOn, text = panel.room, color = FICASecondary)
            }
        }

        if (panel.speaker_name != null || !panel.moderator.isNullOrBlank()) {
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                panel.speaker_name?.let { name ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        AvatarView(
                            name = name,
                            photoUrl = panel.speaker_photo,
                            size = 32.dp,
                            borderColor = FICABorder,
                            borderWidth = 1.dp,
                        )
                        Column {
                            Text(name, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = FICAText)
                            val role = panel.speaker_title ?: panel.speaker_org
                            if (!role.isNullOrBlank()) {
                                Text(role, fontSize = 10.sp, color = FICAMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                }
                if (!panel.moderator.isNullOrBlank()) {
                    IconText(
                        icon = Icons.Filled.RecordVoiceOver,
                        text = "Moderator: ${panel.moderator}",
                        color = FICAMuted,
                    )
                }
            }
        }

        if (!panel.description.isNullOrBlank()) {
            Text(
                text = panel.description,
                fontSize = 13.sp,
                color = FICASecondary,
                lineHeight = 18.sp,
            )
        }

        if (panel.isPanelMember) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(FICAGold.copy(alpha = 0.1f))
                    .padding(10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(Icons.Filled.Star, null, tint = FICAGold, modifier = Modifier.size(12.dp))
                Text(
                    text = "You're on this panel — attendee questions appear below.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = FICAGold,
                )
            }
        }
    }
}

@Composable
private fun QuestionsSectionHeader(count: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            "QUESTIONS",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = FICAMuted,
            letterSpacing = 0.8.sp,
        )
        Text("$count", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = FICAMuted)
    }
}

@Composable
private fun EmptyQuestions(open: Boolean) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(FICACard)
            .padding(vertical = 32.dp, horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            imageVector = Icons.Filled.ChatBubbleOutline,
            contentDescription = null,
            tint = FICABorder,
            modifier = Modifier.size(36.dp),
        )
        Text("No questions yet", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = FICASecondary)
        Text(
            text = if (open) "Be the first to ask." else "The panel is closed for new questions.",
            fontSize = 12.sp,
            color = FICAMuted,
        )
    }
}

@Composable
private fun QuestionRow(question: PanelQuestion) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(1.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.03f))
            .clip(RoundedCornerShape(14.dp))
            .background(FICACard)
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
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
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = question.attendee_name ?: "Attendee",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAText,
                )
                if (question.isPanelMember) {
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(FICAGold.copy(alpha = 0.12f))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    ) {
                        Text(
                            "Panel Member",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = FICAGold,
                        )
                    }
                }
                Box(modifier = Modifier.weight(1f))
                question.created_at?.let { d ->
                    Text(relativeTime(d), fontSize = 10.sp, fontWeight = FontWeight.Medium, color = FICAMuted)
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
            Text(text = question.question, fontSize = 13.sp, color = FICASecondary, lineHeight = 18.sp)
        }
    }
}

@Composable
private fun Composer(
    draft: String,
    onChange: (String) -> Unit,
    enabled: Boolean,
    isPosting: Boolean,
    canSubmit: Boolean,
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
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            OutlinedTextField(
                value = draft,
                onValueChange = onChange,
                enabled = enabled && !isPosting,
                placeholder = {
                    Text(
                        if (enabled) "Ask a question..." else "Panel discussion is currently closed",
                        fontSize = 14.sp,
                        color = FICAMuted.copy(alpha = 0.7f),
                    )
                },
                shape = RoundedCornerShape(14.dp),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Default),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = FICAGold,
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
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(if (canSubmit) FICANavy else FICANavy.copy(alpha = 0.3f)),
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
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun IconText(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String,
    color: Color,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = color, modifier = Modifier.size(12.dp))
        Text(text = text, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = color)
    }
}

// ── Relative time helper (mirrors AnnouncementsScreen's) ─────────────────────

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
