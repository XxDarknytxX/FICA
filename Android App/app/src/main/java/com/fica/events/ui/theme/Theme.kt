package com.fica.events.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

// ── Primary palette ─────────────────────────────────────────────────────────
val FICANavy = Color(0xFF0F2D5E)
val FICANavyLight = Color(0xFF143B6E)
val FICANavySolid = Color(0xFF0A1F3F)
val FICAGold = Color(0xFFC9A84C)
val FICADark = Color(0xFF050F23)
val FICASuccess = Color(0xFF10B981)
val FICAWarning = Color(0xFFF59E0B)
val FICADanger = Color(0xFFEF4444)

// ── Surface / text colors ───────────────────────────────────────────────────
val FICABg = Color(0xFFF7F8FA)
val FICACard = Color.White
val FICAInputBg = Color(0xFFF1F3F5)
val FICABorder = Color(0xFFE2E8F0)
val FICAText = Color(0xFF1A202C)
val FICASecondary = Color(0xFF718096)
val FICAMuted = Color(0xFFA0AEC0)

// ── Gradients ───────────────────────────────────────────────────────────────
val FICAHeroGradient = Brush.linearGradient(
    listOf(Color(0xFF091F42), FICANavy, Color(0xFF1A4080))
)
val FICAGoldShimmer = Brush.linearGradient(
    listOf(FICAGold, Color(0xFFE2C87A), FICAGold)
)

// ── Session type colors ─────────────────────────────────────────────────────
object SessionTypeColors {
    fun colorFor(type: String?): Color = when (type?.lowercase()) {
        "keynote"      -> Color(0xFF92620C)
        "panel"        -> Color(0xFF234E52)
        "workshop"     -> Color(0xFF2C5282)
        "break"        -> Color(0xFF718096)
        "lunch"        -> Color(0xFF276749)
        "ceremony"     -> FICANavy
        "registration" -> Color(0xFFC53030)
        "awards"       -> Color(0xFF92620C)
        "networking"   -> Color(0xFF6B21A8)
        else           -> Color(0xFF718096)
    }

    fun iconNameFor(type: String?): String = when (type?.lowercase()) {
        "keynote"      -> "Star"
        "panel"        -> "Groups"
        "workshop"     -> "Build"
        "break"        -> "Coffee"
        "lunch"        -> "Restaurant"
        "ceremony"     -> "EmojiEvents"
        "registration" -> "HowToReg"
        "awards"       -> "MilitaryTech"
        "networking"   -> "Handshake"
        else           -> "Event"
    }
}

// ── Project category colors ─────────────────────────────────────────────────
object ProjectCategory {
    fun colorFor(category: String?): Color = when (category?.lowercase()) {
        "innovation"     -> Color(0xFF7C3AED)
        "sustainability" -> Color(0xFF059669)
        "technology"     -> Color(0xFF2563EB)
        "community"      -> Color(0xFFEA580C)
        else             -> FICANavy
    }
}

// ── Ticket badge colors / labels ────────────────────────────────────────────
object TicketBadge {
    fun colorFor(type: String?): Color = when (type?.lowercase()) {
        "vip"     -> FICAGold
        "full"    -> FICANavy
        "day1"    -> Color(0xFF2563EB)
        "day2"    -> Color(0xFF7C3AED)
        "virtual" -> FICASuccess
        else      -> FICASecondary
    }

    fun labelFor(type: String?): String = when (type?.lowercase()) {
        "vip"     -> "VIP"
        "full"    -> "Full Access"
        "day1"    -> "Day 1"
        "day2"    -> "Day 2"
        "virtual" -> "Virtual"
        else      -> "Standard"
    }
}

// ── App-wide Compose theme ──────────────────────────────────────────────────
@Composable
fun FICATheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = FICANavy,
            secondary = FICAGold,
            background = FICABg,
            surface = FICACard,
            onPrimary = Color.White,
            onBackground = FICAText,
            onSurface = FICAText,
        ),
        content = content,
    )
}
