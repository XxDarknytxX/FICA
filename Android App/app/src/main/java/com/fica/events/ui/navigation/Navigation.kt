package com.fica.events.ui.navigation

import android.os.Build
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
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
import com.fica.events.ui.announcements.AnnouncementsScreen
import com.fica.events.ui.auth.LoginScreen
import com.fica.events.ui.auth.SplashScreen
import com.fica.events.ui.home.HomeScreen
import com.fica.events.ui.networking.NetworkingScreen
import com.fica.events.ui.theme.FICABg
import com.fica.events.ui.theme.FICAMuted
import com.fica.events.ui.theme.FICANavy
import com.fica.events.ui.voting.VotingScreen

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
    data object Updates : Tab("tab_updates", "Updates", Icons.Default.Notifications)
}

private val tabs = listOf(Tab.Home, Tab.Agenda, Tab.Vote, Tab.Network, Tab.Updates)

// ── Top-level nav host (auth gating) ────────────────────────────────────────

@Composable
fun FICANavHost() {
    val rootNavController = rememberNavController()

    val startDestination = if (AuthManager.isAuthenticated) {
        Screen.Main.route
    } else {
        Screen.Splash.route
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
                HomeScreen(onLogout = {
                    rootNavController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                })
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
            composable(Tab.Updates.route) {
                showTabBar = true
                AnnouncementsScreen()
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
            FloatingPillTabBar(
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

// ── Floating Pill Tab Bar (iOS-style capsule) ───────────────────────────────

@Composable
private fun FloatingPillTabBar(
    selectedIndex: Int,
    onTabSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, bottom = 8.dp),
    ) {
        // The floating pill container
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .shadow(
                    elevation = 12.dp,
                    shape = RoundedCornerShape(28.dp),
                    ambientColor = Color.Black.copy(alpha = 0.08f),
                )
                .clip(RoundedCornerShape(28.dp))
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color.White.copy(alpha = 0.95f),
                            Color(0xFFFCFCFE).copy(alpha = 0.98f),
                        )
                    )
                )
                .padding(horizontal = 8.dp, vertical = 5.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            tabs.forEachIndexed { index, tab ->
                PillTabItem(
                    tab = tab,
                    isSelected = selectedIndex == index,
                    onClick = { onTabSelected(index) },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun PillTabItem(
    tab: Tab,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val bgColor by animateColorAsState(
        targetValue = if (isSelected) FICANavy.copy(alpha = 0.1f) else Color.Transparent,
        animationSpec = tween(200),
        label = "tabBg",
    )
    val contentColor by animateColorAsState(
        targetValue = if (isSelected) FICANavy else FICAMuted,
        animationSpec = tween(200),
        label = "tabColor",
    )

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(18.dp))
            .background(bgColor)
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
            ) { onClick() }
            .padding(vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Icon(
            imageVector = tab.icon,
            contentDescription = tab.label,
            tint = contentColor,
            modifier = Modifier.size(28.dp),
        )
        Text(
            text = tab.label,
            fontSize = 11.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            color = contentColor,
        )
    }
}
