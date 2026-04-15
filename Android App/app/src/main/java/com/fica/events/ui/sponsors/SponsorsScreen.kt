package com.fica.events.ui.sponsors

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.BusinessCenter
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.outlined.Business
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.imageLoader
import coil.request.CachePolicy
import coil.request.ImageRequest
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import com.fica.events.data.api.ApiClient
import com.fica.events.data.models.CongressYear
import com.fica.events.data.models.Sponsor
import com.fica.events.ui.components.EmptyStateView
import com.fica.events.ui.components.LoadingView
import com.fica.events.ui.components.SectionHeader
import com.fica.events.ui.components.TierBadge
import com.fica.events.ui.theme.FICABg
import com.fica.events.ui.theme.FICABorder
import com.fica.events.ui.theme.FICACard
import com.fica.events.ui.theme.FICAInputBg
import com.fica.events.ui.theme.FICAMuted
import com.fica.events.ui.theme.FICANavy
import com.fica.events.ui.theme.FICASecondary
import com.fica.events.ui.theme.FICAText
import com.fica.events.ui.theme.SponsorTierColors
import kotlinx.coroutines.launch

private data class TierOption(val key: String?, val label: String)

private val tierOptions = listOf(
    TierOption(null, "All"),
    TierOption("platinum", "Platinum"),
    TierOption("gold", "Gold"),
    TierOption("silver", "Silver"),
    TierOption("bronze", "Bronze"),
    TierOption("supporter", "Supporter"),
    TierOption("media", "Media"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SponsorsScreen(onBack: () -> Unit) {
    var sponsors by remember { mutableStateOf<List<Sponsor>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedTier by remember { mutableStateOf<String?>(null) }
    var selectedSponsor by remember { mutableStateOf<Sponsor?>(null) }
    var isRefreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    suspend fun load() {
        try {
            val resp = ApiClient.service.getSponsors(year = CongressYear.Y2026.year)
            val fetched = resp.body()?.sponsors ?: emptyList()

            // Warm Coil's cache for every logo before committing state, so
            // the sponsor list paints once with logos already decoded.
            val urls = fetched.mapNotNull { it.logo_url?.takeIf(String::isNotBlank) }.distinct()
            if (urls.isNotEmpty()) {
                val loader = context.imageLoader
                coroutineScope {
                    urls.map { url ->
                        async {
                            val req = ImageRequest.Builder(context)
                                .data(url)
                                .memoryCachePolicy(CachePolicy.ENABLED)
                                .diskCachePolicy(CachePolicy.ENABLED)
                                .build()
                            loader.execute(req)
                        }
                    }.awaitAll()
                }
            }

            sponsors = fetched
        } catch (_: Exception) { }
    }

    LaunchedEffect(Unit) {
        isLoading = sponsors.isEmpty()
        load()
        isLoading = false
    }

    val filtered = remember(sponsors, selectedTier) {
        sponsors.filter { selectedTier == null || it.tier?.lowercase() == selectedTier }
            .sortedBy { SponsorTierColors.order(it.tier) }
    }

    // Group by tier for display
    val grouped = filtered.groupBy { it.tier ?: "other" }
    val orderedTiers = grouped.keys.sortedBy { SponsorTierColors.order(it) }

    Column(modifier = Modifier.fillMaxSize().background(FICABg)) {
        CenterAlignedTopAppBar(
            title = {
                Text("Sponsors", fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = FICAText)
            },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = FICAText)
                }
            },
            colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = FICABg),
        )

        // Tier filter chips
        Row(
            modifier = Modifier
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            tierOptions.forEach { t ->
                val isSelected = selectedTier == t.key
                Text(
                    text = t.label,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isSelected) FICANavy else FICAMuted,
                    modifier = Modifier
                        .clickable { selectedTier = t.key }
                        .background(
                            if (isSelected) FICANavy.copy(alpha = 0.1f) else FICACard,
                            RoundedCornerShape(50),
                        )
                        .border(
                            1.dp,
                            if (isSelected) FICANavy.copy(alpha = 0.3f) else FICABorder,
                            RoundedCornerShape(50),
                        )
                        .padding(horizontal = 14.dp, vertical = 7.dp),
                )
            }
        }

        if (isLoading) {
            LoadingView(message = "Loading sponsors...")
        } else {
            PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh = { scope.launch { isRefreshing = true; load(); isRefreshing = false } },
                modifier = Modifier.fillMaxSize(),
            ) {
                if (filtered.isEmpty()) {
                    EmptyStateView(icon = Icons.Outlined.Business, title = "No sponsors found")
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        contentPadding = PaddingValues(bottom = 100.dp),
                    ) {
                        orderedTiers.forEach { tier ->
                            val items = grouped[tier] ?: return@forEach
                            item(key = "header_$tier") {
                                SectionHeader(title = SponsorTierColors.labelFor(tier))
                            }
                            items(items, key = { "${tier}_${it.id}" }) { sponsor ->
                                Box(modifier = Modifier.padding(horizontal = 20.dp)) {
                                    SponsorRow(sponsor = sponsor, onClick = { selectedSponsor = sponsor })
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (selectedSponsor != null) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { selectedSponsor = null },
            sheetState = sheetState,
            containerColor = FICABg,
        ) {
            SponsorDetailContent(sponsor = selectedSponsor!!)
        }
    }
}

@Composable
private fun SponsorRow(sponsor: Sponsor, onClick: () -> Unit) {
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
        // Logo placeholder
        Box(
            modifier = Modifier
                .size(64.dp, 48.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(FICAInputBg),
            contentAlignment = Alignment.Center,
        ) {
            if (!sponsor.logo_url.isNullOrBlank()) {
                AsyncImage(
                    model = sponsor.logo_url,
                    contentDescription = sponsor.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Fit,
                )
            } else {
                Text(
                    text = sponsor.name.take(2).uppercase(),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = FICANavy,
                )
            }
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(sponsor.name, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = FICAText, maxLines = 1)
            sponsor.description?.takeIf { it.isNotBlank() }?.let {
                Text(it, fontSize = 12.sp, color = FICASecondary, maxLines = 2)
            }
            TierBadge(tier = sponsor.tier)
        }
    }
}

@Composable
private fun SponsorDetailContent(sponsor: Sponsor) {
    val scroll = rememberScrollState()
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(scroll)
            .padding(bottom = 30.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Spacer(modifier = Modifier.height(4.dp))

        // Large logo
        Box(
            modifier = Modifier
                .size(160.dp, 100.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(FICAInputBg),
            contentAlignment = Alignment.Center,
        ) {
            if (!sponsor.logo_url.isNullOrBlank()) {
                AsyncImage(
                    model = sponsor.logo_url,
                    contentDescription = sponsor.name,
                    modifier = Modifier.fillMaxSize().padding(12.dp),
                    contentScale = ContentScale.Fit,
                )
            } else {
                Icon(
                    Icons.Default.BusinessCenter,
                    contentDescription = null,
                    tint = FICANavy,
                    modifier = Modifier.size(40.dp),
                )
            }
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.padding(horizontal = 20.dp),
        ) {
            Text(sponsor.name, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = FICAText)
            TierBadge(tier = sponsor.tier)
        }

        if (!sponsor.description.isNullOrBlank()) {
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
                Text(sponsor.description, fontSize = 14.sp, color = FICASecondary, lineHeight = 20.sp)
            }
        }

        if (!sponsor.website.isNullOrBlank()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
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
                        .background(FICANavy.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.Language, contentDescription = null, tint = FICANavy, modifier = Modifier.size(16.dp))
                }
                Text(sponsor.website, fontSize = 13.sp, color = FICAText, modifier = Modifier.weight(1f), maxLines = 1)
            }
        }
    }
}
