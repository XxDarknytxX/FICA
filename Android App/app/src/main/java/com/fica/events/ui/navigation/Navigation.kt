package com.fica.events.ui.navigation

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.fica.events.data.auth.AuthManager
import com.fica.events.ui.agenda.AgendaScreen
import com.fica.events.ui.panels.PanelsScreen
import com.fica.events.ui.panels.PanelDetailScreen
import com.fica.events.ui.auth.LoginScreen
import com.fica.events.ui.auth.SplashScreen
import com.fica.events.ui.home.HomeScreen
import com.fica.events.ui.networking.NetworkingScreen
import com.fica.events.ui.speakers.SpeakersScreen
import com.fica.events.ui.sponsors.SponsorsScreen
import com.fica.events.ui.theme.FICABg
import com.fica.events.ui.theme.FICAGold
import com.fica.events.ui.theme.FICAMuted
import com.fica.events.ui.theme.FICANavy
import com.fica.events.ui.theme.FICANavyLight
import com.fica.events.ui.theme.FICANavySolid
import com.fica.events.ui.theme.FICASecondary
import com.fica.events.ui.voting.VotingScreen
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

// ── Route definitions ───────────────────────────────────────────────────────

sealed class Screen(val route: String) {
    data object Splash : Screen("splash")
    data object Login : Screen("login")
    data object Main : Screen("main")
}

sealed class Tab(val route: String, val label: String, val icon: ImageVector) {
    data object Home : Tab("tab_home", "Home", Icons.Default.Home)
    data object Agenda : Tab("tab_agenda", "Agenda", Icons.Default.CalendarMonth)
    data object Vote : Tab("tab_vote", "Vote", Icons.Default.ThumbUp)
    data object Network : Tab("tab_network", "Network", Icons.Default.People)
    data object Panels : Tab("tab_panels", "Panels", Icons.Default.Forum)
}

object NestedRoutes {
    const val SPEAKERS = "speakers"
    const val SPONSORS = "sponsors"
    const val SPEAKER_DETAIL = "speaker/{id}"
    const val SPONSOR_DETAIL = "sponsor/{id}"
    const val SESSION_DETAIL = "session/{id}"
    const val CONVERSATION = "conversation/{otherId}/{otherName}"
    const val PANEL_DETAIL = "panel/{id}"
}

private val tabs = listOf(Tab.Home, Tab.Agenda, Tab.Vote, Tab.Network, Tab.Panels)

// ── Top-level nav host (auth gating) ────────────────────────────────────────

@Composable
fun FICANavHost() {
    val rootNavController = rememberNavController()

    val startDestination = if (AuthManager.isAuthenticated) {
        Screen.Main.route
    } else {
        Screen.Splash.route
    }

    // React to background logouts (e.g. WebSocket 401 because the token
    // was invalidated by a server-side secret rotation). Without this, a
    // stale-token state would just loop forever on the WS and the app
    // would look frozen to the user.
    androidx.compose.runtime.DisposableEffect(Unit) {
        val remove = AuthManager.addLogoutListener {
            rootNavController.navigate(Screen.Login.route) {
                popUpTo(0) { inclusive = true }
            }
        }
        onDispose { remove() }
    }

    NavHost(
        navController = rootNavController,
        startDestination = startDestination,
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(
                onFinished = {
                    rootNavController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    rootNavController.navigate(Screen.Main.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Main.route) {
            MainScreen(rootNavController = rootNavController)
        }
    }
}

// ── Main screen with bottom navigation ──────────────────────────────────────

@Composable
fun MainScreen(rootNavController: androidx.navigation.NavHostController = rememberNavController()) {
    val tabNavController = rememberNavController()
    var selectedIndex by remember { mutableIntStateOf(0) }

    // Track whether we're in a full-screen overlay (e.g. conversation) to hide the tab bar
    var showTabBar by remember { mutableStateOf(true) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(FICABg),
    ) {
        // Content layer
        NavHost(
            navController = tabNavController,
            startDestination = Tab.Home.route,
            modifier = Modifier.fillMaxSize(),
        ) {
            composable(Tab.Home.route) {
                showTabBar = true
                HomeScreen(
                    onLogout = {
                        rootNavController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onSeeAllSpeakers = { tabNavController.navigate(NestedRoutes.SPEAKERS) },
                    onSeeAllSponsors = { tabNavController.navigate(NestedRoutes.SPONSORS) },
                )
            }
            composable(Tab.Agenda.route) {
                showTabBar = true
                AgendaScreen()
            }
            composable(Tab.Vote.route) {
                showTabBar = true
                VotingScreen()
            }
            composable(Tab.Network.route) {
                showTabBar = true
                NetworkingScreen(
                    onOpenConversation = { id, name ->
                        tabNavController.navigate("conversation/$id/$name")
                    },
                    initialTab = tabNavController.currentBackStackEntry
                        ?.savedStateHandle?.get<Int>("networkingTab") ?: 0,
                    onTabChanged = { tab ->
                        tabNavController.currentBackStackEntry
                            ?.savedStateHandle?.set("networkingTab", tab)
                    },
                )
            }
            composable(Tab.Panels.route) {
                showTabBar = true
                PanelsScreen(
                    onOpenPanel = { id -> tabNavController.navigate("panel/$id") },
                )
            }
            composable("panel/{id}") { backStackEntry ->
                showTabBar = false
                val panelId = backStackEntry.arguments?.getString("id")?.toIntOrNull() ?: return@composable
                PanelDetailScreen(
                    panelId = panelId,
                    onBack = { tabNavController.popBackStack() },
                )
            }
            composable(NestedRoutes.SPEAKERS) {
                showTabBar = true
                SpeakersScreen(onBack = { tabNavController.popBackStack() })
            }
            composable(NestedRoutes.SPONSORS) {
                showTabBar = true
                SponsorsScreen(onBack = { tabNavController.popBackStack() })
            }
            composable("conversation/{otherId}/{otherName}") { backStackEntry ->
                showTabBar = false
                val otherId = backStackEntry.arguments?.getString("otherId")?.toIntOrNull() ?: return@composable
                val otherName = backStackEntry.arguments?.getString("otherName") ?: ""
                com.fica.events.ui.networking.ConversationScreen(
                    otherUserId = otherId,
                    otherUserName = otherName,
                    onBack = { tabNavController.popBackStack() },
                )
            }
        }

        // Floating pill tab bar at the bottom — hidden when in conversation
        if (showTabBar) {
            FloatingGlassTabBar(
                selectedIndex = selectedIndex,
                onTabSelected = { index ->
                    selectedIndex = index
                    tabNavController.navigate(tabs[index].route) {
                        popUpTo(tabNavController.graph.findStartDestination().id) {
                            saveState = true
                        }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .windowInsetsPadding(WindowInsets.navigationBars),
            )
        }
    }
}

// ── Animated Glass Pill Tab Bar ─────────────────────────────────────────────
// Inspired by the Parking Android app's liquid glass design — adapted for FICA
// navy/gold theme with a subtle rotating light source on the glass stroke.

@Composable
fun FloatingGlassTabBar(
    selectedIndex: Int,
    onTabSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val tabCount = tabs.size

    // Indicator slide animation (bouncy)
    val indicatorOffset by animateFloatAsState(
        targetValue = selectedIndex.toFloat(),
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioLowBouncy,
            stiffness = Spring.StiffnessMediumLow,
        ),
        label = "indicator",
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = 14.dp, end = 14.dp, bottom = 8.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(72.dp)
                .shadow(
                    elevation = 14.dp,
                    shape = RoundedCornerShape(50),
                    ambientColor = FICANavy.copy(alpha = 0.12f),
                    spotColor = Color.Black.copy(alpha = 0.12f),
                )
                .clip(RoundedCornerShape(50))
                // Slightly translucent white — mimics iOS frosted look on FICABg
                .background(Color.White.copy(alpha = 0.92f))
                .drawBehind {
                    val w = size.width
                    val h = size.height

                    // iOS-style selected pill: light gray CAPSULE (full rounded ellipse),
                    // not a rectangle. Hugs icon + label tightly.
                    val hPad = 6.dp.toPx()
                    val vPad = 6.dp.toPx()
                    val contentW = w - hPad * 2
                    val slotW = contentW / tabCount
                    val pillInset = 4.dp.toPx()
                    val pillW = slotW - pillInset * 2
                    val pillH = h - vPad * 2
                    val pillLeft = hPad + slotW * indicatorOffset + pillInset
                    val pillTop = vPad
                    // Capsule shape: corner radius = half of height → full ellipse ends
                    val pillRadius = CornerRadius(pillH / 2f)

                    // Light gray fill — matches iOS system selection chip
                    drawRoundRect(
                        color = Color(0xFFE8EAED),
                        topLeft = Offset(pillLeft, pillTop),
                        size = Size(pillW, pillH),
                        cornerRadius = pillRadius,
                    )
                }
                .border(
                    0.5.dp,
                    Color(0xFFE5E7EB),
                    RoundedCornerShape(50),
                ),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 6.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                tabs.forEachIndexed { index, tab ->
                    GlassTabItem(
                        tab = tab,
                        isSelected = selectedIndex == index,
                        indicatorProximity = 1f - (abs(indicatorOffset - index.toFloat())).coerceAtMost(1f),
                        onClick = { onTabSelected(index) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun GlassTabItem(
    tab: Tab,
    isSelected: Boolean,
    indicatorProximity: Float,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // iOS style: black icons & labels on the light gray pill, matching the
    // reference screenshots exactly.
    val iconColor by animateColorAsState(
        targetValue = if (isSelected) Color.Black else Color.Black.copy(alpha = 0.78f),
        animationSpec = tween(220),
        label = "tabIcon",
    )
    val labelColor by animateColorAsState(
        targetValue = if (isSelected) Color.Black else Color.Black.copy(alpha = 0.62f),
        animationSpec = tween(220),
        label = "tabLabel",
    )

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
            ) { onClick() }
            .padding(vertical = 2.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = tab.icon,
            contentDescription = tab.label,
            tint = iconColor,
            modifier = Modifier.size(30.dp),
        )
        Text(
            text = tab.label,
            fontSize = 11.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
            color = labelColor,
            lineHeight = 11.sp,
            modifier = Modifier.offset(y = (-2).dp),
        )
    }
}
