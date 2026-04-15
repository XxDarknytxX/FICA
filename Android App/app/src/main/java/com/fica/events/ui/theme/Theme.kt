package com.fica.events.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// ── Primary palette ─────────────────────────────────────────────────────────
val FICANavy = Color(0xFF0F2D5E)
val FICANavyLight = Color(0xFF143B6E)
val FICANavySolid = Color(0xFF0A1F3F)
val FICAGold = Color(0xFFC9A84C)
val FICAGoldLight = Color(0xFFE2C87A)
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
    colors = listOf(Color(0xFF091F42), FICANavy, Color(0xFF1A4080)),
    start = Offset(0f, 0f),
    end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY)
)

val FICAVerticalHeroGradient = Brush.verticalGradient(
    colors = listOf(Color(0xFF091F42), FICANavy, Color(0xFF1A4080))
)

val FICAGoldShimmer = Brush.linearGradient(
    listOf(FICAGold, FICAGoldLight, FICAGold)
)

val FICAGoldGradient = Brush.linearGradient(
    colors = listOf(FICAGold, FICAGoldLight),
    start = Offset(0f, 0f),
    end = Offset(Float.POSITIVE_INFINITY, 0f)
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

// ── Networking / Connection status colors (fg + bg pair for badges) ─────────
object ConnectionStatusColors {
    val accepted = FICASuccess
    val acceptedBg = Color(0xFFD1FAE5)
    val pending = FICAWarning
    val pendingBg = Color(0xFFFEF3C7)
    val declined = FICADanger
    val declinedBg = Color(0xFFFEE2E2)
    val cancelled = FICAMuted
    val cancelledBg = Color(0xFFF1F3F5)

    fun forStatus(status: String?): Pair<Color, Color> = when (status?.lowercase()) {
        "accepted" -> accepted to acceptedBg
        "pending" -> pending to pendingBg
        "declined" -> declined to declinedBg
        "cancelled" -> cancelled to cancelledBg
        else -> FICASecondary to FICAInputBg
    }
}

// ── Sponsor tier colors ─────────────────────────────────────────────────────
object SponsorTierColors {
    fun colorFor(tier: String?): Color = when (tier?.lowercase()) {
        "platinum"  -> Color(0xFF64748B)
        "gold"      -> FICAGold
        "silver"    -> Color(0xFF94A3B8)
        "bronze"    -> Color(0xFFA16207)
        "supporter" -> FICANavy
        "media"     -> Color(0xFF7C3AED)
        else        -> FICASecondary
    }

    fun bgFor(tier: String?): Color = colorFor(tier).copy(alpha = 0.12f)

    fun labelFor(tier: String?): String = when (tier?.lowercase()) {
        "platinum"  -> "Platinum"
        "gold"      -> "Gold"
        "silver"    -> "Silver"
        "bronze"    -> "Bronze"
        "supporter" -> "Supporter"
        "media"     -> "Media Partner"
        else        -> tier?.replaceFirstChar { it.uppercase() } ?: "Sponsor"
    }

    fun order(tier: String?): Int = when (tier?.lowercase()) {
        "platinum"  -> 0
        "gold"      -> 1
        "silver"    -> 2
        "bronze"    -> 3
        "supporter" -> 4
        "media"     -> 5
        else        -> 99
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

// ── Typography (Material 3 scale, polished) ─────────────────────────────────
private val FICATypography = Typography(
    headlineLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 28.sp, lineHeight = 36.sp, color = FICAText),
    headlineMedium = TextStyle(fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 32.sp, color = FICAText),
    headlineSmall = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 20.sp, lineHeight = 28.sp, color = FICAText),
    titleLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 18.sp, lineHeight = 26.sp, color = FICAText),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 24.sp, color = FICAText),
    titleSmall = TextStyle(fontWeight = FontWeight.Medium, fontSize = 14.sp, lineHeight = 20.sp, color = FICAText),
    bodyLarge = TextStyle(fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 24.sp, color = FICAText),
    bodyMedium = TextStyle(fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp, color = FICASecondary),
    bodySmall = TextStyle(fontWeight = FontWeight.Normal, fontSize = 12.sp, lineHeight = 16.sp, color = FICAMuted),
    labelLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp),
    labelMedium = TextStyle(fontWeight = FontWeight.Medium, fontSize = 12.sp, lineHeight = 16.sp),
    labelSmall = TextStyle(fontWeight = FontWeight.Medium, fontSize = 10.sp, lineHeight = 14.sp),
)

// ── App-wide Compose theme ──────────────────────────────────────────────────
@Composable
fun FICATheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = FICANavy,
            onPrimary = Color.White,
            primaryContainer = Color(0xFFD9E2F1),
            onPrimaryContainer = FICANavySolid,
            secondary = FICAGold,
            onSecondary = Color.White,
            secondaryContainer = Color(0xFFFAF1D9),
            onSecondaryContainer = Color(0xFF5C4613),
            tertiary = Color(0xFF7C3AED),
            onTertiary = Color.White,
            error = FICADanger,
            onError = Color.White,
            errorContainer = Color(0xFFFEE2E2),
            onErrorContainer = Color(0xFF7F1D1D),
            background = FICABg,
            onBackground = FICAText,
            surface = FICACard,
            onSurface = FICAText,
            surfaceVariant = FICAInputBg,
            onSurfaceVariant = FICASecondary,
            outline = FICABorder,
            outlineVariant = Color(0xFFCBD5E1),
            inverseSurface = FICANavySolid,
            inverseOnSurface = Color.White,
            inversePrimary = Color(0xFF93B3D9),
            surfaceTint = FICANavy,
        ),
        typography = FICATypography,
        content = content,
    )
}
