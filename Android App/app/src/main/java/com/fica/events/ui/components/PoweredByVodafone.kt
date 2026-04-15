package com.fica.events.ui.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.Text
import com.fica.events.R
import com.fica.events.ui.theme.FICAMuted
import kotlinx.coroutines.delay
import kotlin.math.max

/**
 * "POWERED BY" label + Vodafone icon, optionally with the "vodafone" wordmark
 * sliding out from behind the circular icon. Mirrors the iOS PoweredByVodafone
 * component so both platforms share the same branding treatment.
 *
 * Usage:
 *   PoweredByVodafone()                                  // animates on first composition
 *   PoweredByVodafone(delayMs = 500)                     // with a start delay
 *   PoweredByVodafone(iconHeight = 22.dp)                // bigger
 *   PoweredByVodafone(animated = false)                  // static, no reveal (login page)
 *   PoweredByVodafone(showWordmark = false)              // label + icon only
 */
@Composable
fun PoweredByVodafone(
    modifier: Modifier = Modifier,
    iconHeight: Dp = 16.dp,
    delayMs: Long = 0L,
    animated: Boolean = true,
    showLabel: Boolean = true,
    showWordmark: Boolean = true,
    labelColor: androidx.compose.ui.graphics.Color = FICAMuted.copy(alpha = 0.6f),
) {
    // Animation state — if not animated, jump straight to the final state.
    var iconVisible by remember { mutableStateOf(!animated) }
    var wordmarkRevealed by remember { mutableStateOf(!animated) }

    LaunchedEffect(Unit) {
        if (!animated) return@LaunchedEffect
        if (delayMs > 0) delay(delayMs)
        // Phase 1 — icon + "POWERED BY" label pop in together.
        iconVisible = true
        // Phase 2 — wordmark slides out from behind the icon (only if shown).
        if (showWordmark) {
            delay(350)
            wordmarkRevealed = true
        }
    }

    // Icon width ~= its height (source is nearly square 225/223), and the
    // wordmark starts hidden behind it at x=0, sliding out by iconHeight * 1.17.
    // Keeps spacing visually consistent across any iconHeight.
    val wordmarkSlideOffset: Dp = iconHeight * 1.17f

    // Default label size scales with the icon — about half the height feels right.
    val labelSize = max(9f, iconHeight.value * 0.45f).sp

    val iconAlpha by animateFloatAsState(
        targetValue = if (iconVisible) 1f else 0f,
        animationSpec = spring(dampingRatio = 0.75f, stiffness = Spring.StiffnessMediumLow),
        label = "iconAlpha",
    )
    val iconScale by animateFloatAsState(
        targetValue = if (iconVisible) 1f else 0.7f,
        animationSpec = spring(dampingRatio = 0.75f, stiffness = Spring.StiffnessMediumLow),
        label = "iconScale",
    )
    val wordmarkAlpha by animateFloatAsState(
        targetValue = if (wordmarkRevealed) 1f else 0f,
        animationSpec = spring(dampingRatio = 0.85f, stiffness = Spring.StiffnessMediumLow),
        label = "wordmarkAlpha",
    )
    val wordmarkOffset by animateDpAsState(
        targetValue = if (wordmarkRevealed) wordmarkSlideOffset else 0.dp,
        animationSpec = spring(dampingRatio = 0.85f, stiffness = Spring.StiffnessMediumLow),
        label = "wordmarkOffset",
    )

    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(max(6f, iconHeight.value * 0.4f).dp),
    ) {
        if (showLabel) {
            Text(
                text = "POWERED BY",
                fontSize = labelSize,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = (labelSize.value * 0.16f).sp,
                color = labelColor,
                modifier = Modifier.alpha(iconAlpha),
            )
        }

        Box(contentAlignment = Alignment.CenterStart) {
            // Wordmark sits behind the icon. Starts at x=0 (hidden behind the
            // icon) and slides right to reveal itself.
            if (showWordmark) {
                Image(
                    painter = painterResource(id = R.drawable.vodafone_wordmark),
                    contentDescription = "Vodafone",
                    contentScale = ContentScale.FillHeight,
                    modifier = Modifier
                        .height(iconHeight)
                        .offset(x = wordmarkOffset)
                        .alpha(wordmarkAlpha),
                )
            }

            // Icon stays anchored at the leading edge, on top of the wordmark.
            Image(
                painter = painterResource(id = R.drawable.vodafone_icon),
                contentDescription = if (showWordmark) null else "Vodafone",
                contentScale = ContentScale.FillHeight,
                modifier = Modifier
                    .height(iconHeight)
                    .scale(iconScale)
                    .alpha(iconAlpha),
            )
        }
    }
}
