package com.fica.events.ui.speakers

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fica.events.data.api.ApiClient
import com.fica.events.data.models.CongressYear
import com.fica.events.data.models.Speaker
import com.fica.events.ui.components.AvatarView
import com.fica.events.ui.components.EmptyStateView
import com.fica.events.ui.components.FICASearchBar
import com.fica.events.ui.components.LoadingView
import com.fica.events.ui.components.SectionHeader
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SpeakersScreen(onBack: () -> Unit) {
    var speakers by remember { mutableStateOf<List<Speaker>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var search by remember { mutableStateOf("") }
    var selectedCongress by remember { mutableStateOf(CongressYear.Y2026) }
    var selectedSpeaker by remember { mutableStateOf<Speaker?>(null) }
    var isRefreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun load() {
        try {
            val resp = ApiClient.service.getSpeakers(year = selectedCongress.year)
            speakers = resp.body()?.speakers ?: emptyList()
        } catch (_: Exception) { }
    }

    LaunchedEffect(selectedCongress) {
        isLoading = speakers.isEmpty()
        load()
        isLoading = false
    }

    val filtered = remember(speakers, search) {
        if (search.isBlank()) speakers
        else speakers.filter {
            val q = search.lowercase()
            it.name.lowercase().contains(q) ||
                (it.organization ?: "").lowercase().contains(q) ||
                (it.title ?: "").lowercase().contains(q)
        }
    }
    val keynotes = filtered.filter { (it.is_keynote ?: 0) != 0 }
    val others = filtered.filter { (it.is_keynote ?: 0) == 0 }

    Column(modifier = Modifier.fillMaxSize().background(FICABg)) {
        CenterAlignedTopAppBar(
            title = {
                Text(
                    text = "Speakers",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAText,
                )
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = FICAText)
                }
            },
            colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = FICABg),
        )

        SingleChoiceSegmentedButtonRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(top = 6.dp, bottom = 4.dp),
        ) {
            CongressYear.entries.forEachIndexed { index, year ->
                SegmentedButton(
                    selected = selectedCongress == year,
                    onClick = { selectedCongress = year },
                    shape = SegmentedButtonDefaults.itemShape(index = index, count = CongressYear.entries.size),
                ) {
                    Text(year.label, fontSize = 13.sp)
                }
            }
        }

        Box(modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)) {
            FICASearchBar(text = search, onTextChange = { search = it }, placeholder = "Search speakers...")
        }

        if (isLoading) {
            LoadingView(message = "Loading speakers...")
        } else {
            PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh = { scope.launch { isRefreshing = true; load(); isRefreshing = false } },
                modifier = Modifier.fillMaxSize(),
            ) {
                if (filtered.isEmpty()) {
                    EmptyStateView(icon = Icons.Default.MicOff, title = "No speakers found")
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 100.dp),
                    ) {
                        if (keynotes.isNotEmpty()) {
                            item {
                                SectionHeader(title = "Keynote Speakers")
                            }
                            items(keynotes, key = { "k_${it.id}" }) { sp ->
                                Box(modifier = Modifier.padding(horizontal = 20.dp)) {
                                    SpeakerRow(speaker = sp, isKeynote = true, onClick = { selectedSpeaker = sp })
                                }
                            }
                        }
                        if (others.isNotEmpty()) {
                            item {
                                Spacer(modifier = Modifier.height(4.dp))
                                SectionHeader(title = "Speakers & Panelists")
                            }
                            items(others, key = { "o_${it.id}" }) { sp ->
                                Box(modifier = Modifier.padding(horizontal = 20.dp)) {
                                    SpeakerRow(speaker = sp, isKeynote = false, onClick = { selectedSpeaker = sp })
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (selectedSpeaker != null) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { selectedSpeaker = null },
            sheetState = sheetState,
            containerColor = FICABg,
        ) {
            SpeakerDetailContent(speaker = selectedSpeaker!!)
        }
    }
}

@Composable
private fun SpeakerRow(speaker: Speaker, isKeynote: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(1.5.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.04f))
            .clip(RoundedCornerShape(14.dp))
            .background(FICACard)
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        AvatarView(
            name = speaker.name,
            photoUrl = speaker.photo_url,
            size = if (isKeynote) 56.dp else 46.dp,
            borderColor = if (isKeynote) FICAGold else FICABorder,
            borderWidth = if (isKeynote) 2.dp else 1.dp,
        )
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = speaker.name,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = FICAText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
                if (isKeynote) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = null,
                        tint = FICAGold,
                        modifier = Modifier.size(12.dp),
                    )
                }
            }
            speaker.title?.takeIf { it.isNotBlank() }?.let {
                Text(it, fontSize = 12.sp, color = FICASecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            speaker.organization?.takeIf { it.isNotBlank() }?.let {
                Text(it, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = FICANavy, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
private fun SpeakerDetailContent(speaker: Speaker) {
    val scroll = rememberScrollState()
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(scroll)
            .padding(bottom = 30.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Spacer(modifier = Modifier.height(4.dp))
        AvatarView(
            name = speaker.name,
            photoUrl = speaker.photo_url,
            size = 100.dp,
            borderColor = FICAGold,
            borderWidth = 2.5.dp,
        )
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier.padding(horizontal = 20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(speaker.name, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = FICAText)
                if ((speaker.is_keynote ?: 0) != 0) {
                    Icon(Icons.Default.Star, contentDescription = null, tint = FICAGold, modifier = Modifier.size(14.dp))
                }
            }
            speaker.title?.takeIf { it.isNotBlank() }?.let {
                Text(it, fontSize = 14.sp, color = FICASecondary, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            }
            speaker.organization?.takeIf { it.isNotBlank() }?.let {
                Text(it, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = FICANavy, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            }
        }

        if (!speaker.bio.isNullOrBlank()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(FICAInputBg)
                    .padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = "ABOUT",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = FICAMuted,
                    letterSpacing = 0.8.sp,
                )
                Text(speaker.bio, fontSize = 14.sp, color = FICASecondary, lineHeight = 20.sp)
            }
        }

        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            speaker.email?.takeIf { it.isNotBlank() }?.let {
                ContactRow(icon = Icons.Default.Email, text = it, color = FICANavy)
            }
            speaker.linkedin?.takeIf { it.isNotBlank() }?.let {
                ContactRow(icon = Icons.Default.Link, text = "LinkedIn Profile", color = Color(0xFF0A66C2))
            }
        }
    }
}

@Composable
private fun ContactRow(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String, color: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(FICACard)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(34.dp)
                .clip(RoundedCornerShape(9.dp))
                .background(color.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(16.dp))
        }
        Text(text, fontSize = 13.sp, color = FICAText, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}
