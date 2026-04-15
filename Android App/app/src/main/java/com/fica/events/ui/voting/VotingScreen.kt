package com.fica.events.ui.voting

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Memory
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.fica.events.data.api.ApiClient
import com.fica.events.data.models.Project
import com.fica.events.data.models.VoteRequest
import com.fica.events.data.models.toBool
import com.fica.events.ui.components.EmptyStateView
import com.fica.events.ui.components.LoadingView
import com.fica.events.ui.theme.FICABg
import com.fica.events.ui.theme.FICACard
import com.fica.events.ui.theme.FICADanger
import com.fica.events.ui.theme.FICADark
import com.fica.events.ui.theme.FICAGold
import com.fica.events.ui.theme.FICAGoldShimmer
import com.fica.events.ui.theme.FICAInputBg
import com.fica.events.ui.theme.FICAMuted
import com.fica.events.ui.theme.FICANavy
import com.fica.events.ui.theme.FICASecondary
import com.fica.events.ui.theme.FICASuccess
import com.fica.events.ui.theme.FICAText
import com.fica.events.ui.theme.ProjectCategory
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VotingScreen() {
    var projects by remember { mutableStateOf<List<Project>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var hasVoted by remember { mutableStateOf(false) }
    var myVoteProjectId by remember { mutableStateOf<Int?>(null) }
    var votingOpen by remember { mutableStateOf(false) }
    var showResults by remember { mutableStateOf(false) }
    var selectedProject by remember { mutableStateOf<Project?>(null) }
    var isVoting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun load() {
        errorMessage = null
        try {
            val response = ApiClient.service.getProjects()
            val body = response.body()
            if (body != null) {
                projects = body.projects
                hasVoted = body.has_voted
                myVoteProjectId = body.my_vote_project_id
                votingOpen = body.voting_open
            }
        } catch (e: Exception) {
            if (projects.isEmpty()) {
                errorMessage = e.localizedMessage ?: "Failed to load projects"
            }
        }
    }

    suspend fun vote(projectId: Int) {
        isVoting = true
        errorMessage = null
        try {
            ApiClient.service.vote(VoteRequest(project_id = projectId))
            load()
        } catch (e: Exception) {
            errorMessage = e.localizedMessage ?: "Failed to cast vote"
        }
        isVoting = false
    }

    LaunchedEffect(Unit) {
        isLoading = true
        load()
        isLoading = false
    }

    // Detail bottom sheet
    selectedProject?.let { project ->
        ModalBottomSheet(
            onDismissRequest = { selectedProject = null },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = FICABg,
        ) {
            ProjectDetailSheet(
                project = project,
                votingOpen = votingOpen,
                hasVoted = hasVoted,
                isMyVote = myVoteProjectId == project.id,
                isVoting = isVoting,
                onVote = {
                    scope.launch {
                        vote(project.id)
                        selectedProject = null
                    }
                },
                onDismiss = { selectedProject = null },
            )
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FICABg),
    ) {
        // Top bar — matches Agenda/Networking/Updates title style
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(top = 14.dp, bottom = 12.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "Project Voting",
                fontSize = 17.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
            )
        }

        if (isLoading) {
            LoadingView()
        } else if (projects.isEmpty()) {
            EmptyStateView(
                icon = Icons.Outlined.EmojiEvents,
                title = "No projects yet",
                subtitle = "Check back soon for project voting",
            )
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item { Spacer(modifier = Modifier.height(8.dp)) }

                // Status Banner
                item {
                    StatusBanner(
                        votingOpen = votingOpen,
                        projects = projects,
                        hasVoted = hasVoted,
                        myVoteProjectId = myVoteProjectId,
                        errorMessage = errorMessage,
                    )
                }

                // Tab Toggle
                item {
                    TabToggle(
                        showResults = showResults,
                        onToggle = { showResults = it },
                    )
                }

                if (showResults) {
                    // Results section
                    val sorted = projects.sortedByDescending { it.vote_count ?: 0 }
                    val maxVotes = maxOf(sorted.firstOrNull()?.vote_count ?: 0, 1)

                    itemsIndexed(sorted, key = { _, p -> p.id }) { index, project ->
                        ResultRow(
                            index = index,
                            project = project,
                            maxVotes = maxVotes,
                            isMyVote = myVoteProjectId == project.id,
                            onClick = { selectedProject = project },
                        )
                    }
                } else {
                    // Projects list
                    items(projects, key = { it.id }) { project ->
                        ProjectCard(
                            project = project,
                            isMyVote = myVoteProjectId == project.id,
                            onClick = { selectedProject = project },
                        )
                    }
                }

                item { Spacer(modifier = Modifier.height(100.dp)) }
            }
        }
    }
}

// ── Status Banner ──────────────────────────────────────────────────────────

@Composable
private fun StatusBanner(
    votingOpen: Boolean,
    projects: List<Project>,
    hasVoted: Boolean,
    myVoteProjectId: Int?,
    errorMessage: String?,
) {
    val totalVotes = projects.sumOf { it.vote_count ?: 0 }
    val votedProjectName = if (hasVoted && myVoteProjectId != null) {
        projects.firstOrNull { it.id == myVoteProjectId }?.name
    } else null

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = FICACard),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Status dot
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(
                            if (votingOpen) FICASuccess else FICADanger,
                            CircleShape,
                        ),
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (votingOpen) "Voting is Open" else "Voting is Closed",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (votingOpen) FICASuccess else FICADanger,
                )
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = "$totalVotes total votes",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = FICASecondary,
                )
            }

            if (votedProjectName != null) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = FICASuccess,
                        modifier = Modifier.size(14.dp),
                    )
                    Text(
                        text = buildAnnotatedString {
                            append("You voted for ")
                            withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                                append(votedProjectName)
                            }
                        },
                        fontSize = 12.sp,
                        color = FICASecondary,
                    )
                }
            }

            if (errorMessage != null) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Warning,
                        contentDescription = null,
                        tint = FICADanger,
                        modifier = Modifier.size(12.dp),
                    )
                    Text(
                        text = errorMessage,
                        fontSize = 12.sp,
                        color = FICADanger,
                    )
                }
            }
        }
    }
}

// ── Tab Toggle ─────────────────────────────────────────────────────────────

@Composable
private fun TabToggle(
    showResults: Boolean,
    onToggle: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(FICAInputBg, RoundedCornerShape(12.dp))
            .padding(3.dp),
    ) {
        TabButton(
            title = "Projects",
            icon = Icons.Filled.EmojiEvents,
            selected = !showResults,
            onClick = { onToggle(false) },
            modifier = Modifier.weight(1f),
        )
        TabButton(
            title = "Results",
            icon = Icons.Filled.BarChart,
            selected = showResults,
            onClick = { onToggle(true) },
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun TabButton(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .clickable { onClick() }
            .then(
                if (selected) {
                    Modifier
                        .background(FICACard, RoundedCornerShape(10.dp))
                } else {
                    Modifier
                }
            )
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (selected) FICAText else FICAMuted,
            modifier = Modifier.size(12.dp),
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = title,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) FICAText else FICAMuted,
        )
    }
}

// ── Project Card (image-less, iOS-style) ───────────────────────────────────

@Composable
private fun ProjectCard(
    project: Project,
    isMyVote: Boolean,
    onClick: () -> Unit,
) {
    val catColor = ProjectCategory.colorFor(project.category)
    val catIcon = categoryIcon(project.category)
    val voteCount = project.vote_count ?: 0

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(1.5.dp, RoundedCornerShape(16.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .clip(RoundedCornerShape(16.dp))
            .background(FICACard)
            .then(
                if (isMyVote) Modifier.border(1.5.dp, FICASuccess.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                else Modifier
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        // Row 1: category chip + vote count pill
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier
                    .background(catColor.copy(alpha = 0.12f), RoundedCornerShape(50))
                    .padding(horizontal = 9.dp, vertical = 4.dp),
            ) {
                Icon(
                    imageVector = catIcon,
                    contentDescription = null,
                    tint = catColor,
                    modifier = Modifier.size(12.dp),
                )
                Text(
                    text = (project.category ?: "other").uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = catColor,
                    letterSpacing = 0.5.sp,
                    lineHeight = 12.sp,
                )
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier
                    .background(FICAInputBg, RoundedCornerShape(50))
                    .padding(horizontal = 10.dp, vertical = 4.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.ThumbUp,
                    contentDescription = null,
                    tint = FICANavy,
                    modifier = Modifier.size(11.dp),
                )
                Text(
                    text = "$voteCount",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = FICAText,
                    lineHeight = 14.sp,
                )
            }
        }

        // Row 2: title
        Text(
            text = project.name,
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold,
            color = FICAText,
            lineHeight = 21.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )

        // Row 3: team (small muted with groups icon)
        if (!project.team.isNullOrBlank()) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.Groups,
                    contentDescription = null,
                    tint = FICAMuted,
                    modifier = Modifier.size(12.dp),
                )
                Text(
                    text = project.team,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = FICAMuted,
                    lineHeight = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }

        // Row 4: description preview (2 lines)
        if (!project.description.isNullOrBlank()) {
            Text(
                text = project.description,
                fontSize = 13.sp,
                color = FICASecondary,
                lineHeight = 18.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }

        // Row 5: status footer — "Your Vote" badge or Tap-to-view hint
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (isMyVote) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                    modifier = Modifier
                        .background(FICASuccess.copy(alpha = 0.10f), RoundedCornerShape(50))
                        .padding(horizontal = 9.dp, vertical = 4.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = FICASuccess,
                        modifier = Modifier.size(12.dp),
                    )
                    Text(
                        text = "Your Vote",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = FICASuccess,
                        lineHeight = 13.sp,
                    )
                }
            } else {
                Text(
                    text = "View details",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = FICAGold,
                    lineHeight = 14.sp,
                )
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

/** Returns a themed icon for a project category. */
private fun categoryIcon(category: String?): ImageVector = when (category?.lowercase()) {
    "innovation" -> Icons.Filled.Lightbulb
    "sustainability" -> Icons.Filled.Eco
    "technology" -> Icons.Filled.Memory
    "community" -> Icons.Filled.Groups
    else -> Icons.Filled.EmojiEvents
}

// ── Result Row ─────────────────────────────────────────────────────────────

@Composable
private fun ResultRow(
    index: Int,
    project: Project,
    maxVotes: Int,
    isMyVote: Boolean,
    onClick: () -> Unit,
) {
    val voteCount = project.vote_count ?: 0
    val pct = if (maxVotes > 0) voteCount.toFloat() / maxVotes.toFloat() else 0f

    val rankColor = when {
        index == 0 && voteCount > 0 -> FICAGold
        index == 1 -> Color.Gray.copy(alpha = 0.3f)
        index == 2 -> Color(0xFFCD7F32).copy(alpha = 0.3f)
        else -> FICAInputBg
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .then(
                if (isMyVote) {
                    Modifier.border(1.5.dp, FICASuccess.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                } else {
                    Modifier
                }
            ),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = FICACard),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Rank badge
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(rankColor, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center,
            ) {
                if (index == 0 && voteCount > 0) {
                    Icon(
                        imageVector = Icons.Filled.EmojiEvents,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(14.dp),
                    )
                } else {
                    Text(
                        text = "#${index + 1}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (index < 3) FICAText else FICASecondary,
                    )
                }
            }

            // Name + progress bar
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = project.name,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = FICAText,
                        maxLines = 1,
                    )
                    if (!project.team.isNullOrBlank()) {
                        Text(
                            text = project.team,
                            fontSize = 11.sp,
                            color = FICAMuted,
                            maxLines = 1,
                        )
                    }
                }

                // Progress bar
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .background(FICAInputBg, RoundedCornerShape(3.dp)),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(pct)
                            .height(6.dp)
                            .background(
                                if (index == 0) FICAGold else FICANavy,
                                RoundedCornerShape(3.dp),
                            ),
                    )
                }
            }

            // Vote count
            Text(
                text = "$voteCount",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = FICAText,
            )
        }
    }
}

// ── Project Detail Sheet ───────────────────────────────────────────────────

@Composable
private fun ProjectDetailSheet(
    project: Project,
    votingOpen: Boolean,
    hasVoted: Boolean,
    isMyVote: Boolean,
    isVoting: Boolean,
    onVote: () -> Unit,
    onDismiss: () -> Unit,
) {
    var showConfirm by remember { mutableStateOf(false) }
    val catColor = ProjectCategory.colorFor(project.category)

    // Confirmation dialog
    if (showConfirm) {
        AlertDialog(
            onDismissRequest = { showConfirm = false },
            title = { Text("Vote for Project") },
            text = {
                Text(
                    buildString {
                        append("Cast your vote for \"${project.name}\"?")
                        if (hasVoted) append(" This will change your current vote.")
                    }
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showConfirm = false
                        onVote()
                    },
                ) {
                    Text("Confirm Vote", color = FICANavy)
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirm = false }) {
                    Text("Cancel", color = FICASecondary)
                }
            },
        )
    }

    val catIcon = categoryIcon(project.category)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState()),
    ) {
        // Hero — themed color band with big category icon (no image)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(140.dp)
                .background(
                    Brush.verticalGradient(
                        listOf(catColor.copy(alpha = 0.18f), catColor.copy(alpha = 0.06f))
                    )
                ),
            contentAlignment = Alignment.Center,
        ) {
            // Soft circular bg for the icon
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .background(catColor.copy(alpha = 0.14f), CircleShape)
                    .border(1.5.dp, catColor.copy(alpha = 0.30f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = catIcon,
                    contentDescription = null,
                    tint = catColor,
                    modifier = Modifier.size(40.dp),
                )
            }

            // Category pill in top-right corner
            Row(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(16.dp)
                    .background(Color.White, RoundedCornerShape(50))
                    .padding(horizontal = 10.dp, vertical = 5.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = (project.category ?: "other").uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = catColor,
                    letterSpacing = 0.5.sp,
                    lineHeight = 12.sp,
                )
            }
        }

        // Content
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Title & Team
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = project.name,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = FICAText,
                    lineHeight = 26.sp,
                )
                if (!project.team.isNullOrBlank()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Groups,
                            contentDescription = null,
                            tint = FICASecondary,
                            modifier = Modifier.size(14.dp),
                        )
                        Text(
                            text = project.team,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = FICASecondary,
                            lineHeight = 17.sp,
                        )
                    }
                }
            }

            // Stats row
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = FICACard),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.BarChart,
                            contentDescription = null,
                            tint = catColor,
                            modifier = Modifier.size(14.dp),
                        )
                        Text(
                            text = "${project.vote_count ?: 0}",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = FICAText,
                        )
                        Text(
                            text = "Votes",
                            fontSize = 11.sp,
                            color = FICAMuted,
                        )
                    }

                    HorizontalDivider(
                        modifier = Modifier
                            .height(30.dp)
                            .width(1.dp),
                        color = FICAInputBg,
                    )

                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.EmojiEvents,
                            contentDescription = null,
                            tint = catColor,
                            modifier = Modifier.size(14.dp),
                        )
                        Text(
                            text = project.category?.replaceFirstChar { it.uppercase() } ?: "-",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = FICAText,
                        )
                        Text(
                            text = "Category",
                            fontSize = 11.sp,
                            color = FICAMuted,
                        )
                    }
                }
            }

            // Description
            if (!project.description.isNullOrBlank()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(1.5.dp, RoundedCornerShape(16.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
                        .clip(RoundedCornerShape(16.dp))
                        .background(FICACard)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = "ABOUT",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = FICAMuted,
                        letterSpacing = 0.6.sp,
                        lineHeight = 13.sp,
                    )
                    Text(
                        text = project.description,
                        fontSize = 14.sp,
                        color = FICASecondary,
                        lineHeight = 20.sp,
                    )
                }
            }

            // Vote action section
            if (votingOpen) {
                if (isMyVote) {
                    // Success banner
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                FICASuccess.copy(alpha = 0.08f),
                                RoundedCornerShape(14.dp),
                            )
                            .border(
                                1.dp,
                                FICASuccess.copy(alpha = 0.2f),
                                RoundedCornerShape(14.dp),
                            )
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Verified,
                            contentDescription = null,
                            tint = FICASuccess,
                            modifier = Modifier.size(18.dp),
                        )
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(
                                text = "You voted for this project",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = FICASuccess,
                            )
                            Text(
                                text = "Your vote has been recorded",
                                fontSize = 12.sp,
                                color = FICASuccess.copy(alpha = 0.8f),
                            )
                        }
                    }
                } else {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        // Vote button
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .then(
                                    if (hasVoted) {
                                        Modifier.background(FICAInputBg, RoundedCornerShape(14.dp))
                                    } else {
                                        Modifier.background(FICAGoldShimmer, RoundedCornerShape(14.dp))
                                    }
                                )
                                .clickable(enabled = !isVoting) { showConfirm = true }
                                .padding(vertical = 14.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (isVoting) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(16.dp),
                                    color = FICANavy,
                                    strokeWidth = 2.dp,
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                            }
                            Icon(
                                imageVector = if (hasVoted) Icons.Filled.Refresh else Icons.Filled.ThumbUp,
                                contentDescription = null,
                                tint = if (hasVoted) FICAText else FICADark,
                                modifier = Modifier.size(16.dp),
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (hasVoted) "Change Vote to this Project" else "Vote for this Project",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (hasVoted) FICAText else FICADark,
                            )
                        }

                        if (hasVoted) {
                            Text(
                                text = "This will replace your current vote",
                                fontSize = 11.sp,
                                color = FICAMuted,
                            )
                        }
                    }
                }
            } else {
                // Voting closed
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(FICAInputBg, RoundedCornerShape(12.dp))
                        .padding(vertical = 14.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Lock,
                        contentDescription = null,
                        tint = FICASecondary,
                        modifier = Modifier.size(13.dp),
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Voting is currently closed",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = FICASecondary,
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}
