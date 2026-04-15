package com.fica.events.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.ui.res.painterResource
import com.fica.events.R
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.outlined.Inbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.fica.events.ui.theme.FICABg
import com.fica.events.ui.theme.FICABorder
import com.fica.events.ui.theme.FICACard
import com.fica.events.ui.theme.FICADanger
import com.fica.events.ui.theme.FICADark
import com.fica.events.ui.theme.FICAGold
import com.fica.events.ui.theme.FICAInputBg
import com.fica.events.ui.theme.FICAMuted
import com.fica.events.ui.theme.FICANavy
import com.fica.events.ui.theme.FICANavySolid
import com.fica.events.ui.theme.FICASecondary
import com.fica.events.ui.theme.FICASuccess
import com.fica.events.ui.theme.FICAText
import com.fica.events.ui.theme.FICAWarning
import com.fica.events.ui.theme.TicketBadge
import java.net.URLEncoder

// ── AvatarView ──────────────────────────────────────────────────────────────

@Composable
fun AvatarView(
    name: String,
    photoUrl: String? = null,
    size: Dp = 44.dp,
    borderColor: Color = FICAGold,
    borderWidth: Dp = 2.dp,
) {
    val imageUrl = if (!photoUrl.isNullOrBlank()) {
        photoUrl
    } else {
        val encoded = URLEncoder.encode(name, "UTF-8")
        "https://ui-avatars.com/api/?name=$encoded&background=0A1F3F&color=C9A84C&size=${(size.value * 2).toInt()}&bold=true"
    }

    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .border(borderWidth, borderColor, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        AsyncImage(
            model = imageUrl,
            contentDescription = name,
            modifier = Modifier.fillMaxSize().clip(CircleShape),
            contentScale = ContentScale.Crop,
        )
    }
}

// ── TicketBadgeView (matches iOS: opacity bg + colored text) ────────────────

@Composable
fun TicketBadgeView(ticketType: String?) {
    val color = TicketBadge.colorFor(ticketType)
    val label = TicketBadge.labelFor(ticketType)

    Text(
        text = label,
        color = color,
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .background(color.copy(alpha = 0.12f), RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}

// ── StatusBadgeView (matches iOS: dot + text with opacity bg) ───────────────

@Composable
fun StatusBadgeView(status: String?) {
    val (color, label) = when (status?.lowercase()) {
        "pending"   -> FICAWarning to "Pending"
        "accepted"  -> FICASuccess to "Accepted"
        "declined"  -> FICADanger to "Declined"
        "cancelled" -> FICAMuted to "Cancelled"
        else        -> FICASecondary to (status ?: "Unknown")
    }

    Row(
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Box(
            modifier = Modifier
                .size(6.dp)
                .background(color, CircleShape),
        )
        Text(
            text = label.replaceFirstChar { it.uppercase() },
            color = color,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

// ── FICACard (matches iOS: shadow-based, no elevation) ──────────────────────

@Composable
fun FICACard(
    modifier: Modifier = Modifier,
    padding: Dp = 18.dp,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .shadow(2.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.05f))
            .background(FICACard, RoundedCornerShape(16.dp))
            .padding(padding),
    ) {
        content()
    }
}

// ── InfoChip ────────────────────────────────────────────────────────────────

@Composable
fun InfoChip(
    icon: ImageVector,
    text: String,
    color: Color = FICASecondary,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(10.dp),
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = text,
            color = color,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
        )
    }
}

// ── LoadingView ─────────────────────────────────────────────────────────────

@Composable
fun LoadingView(message: String? = null) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        CircularProgressIndicator(color = FICAGold)
        if (!message.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                text = message,
                color = FICAMuted,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}

// ── EmptyStateView ──────────────────────────────────────────────────────────

@Composable
fun EmptyStateView(
    icon: ImageVector = Icons.Outlined.Inbox,
    title: String,
    subtitle: String? = null,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = FICABorder,
            modifier = Modifier.size(40.dp),
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = title,
            color = FICASecondary,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
        )
        if (!subtitle.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = subtitle,
                color = FICAMuted,
                fontSize = 13.sp,
                textAlign = TextAlign.Center,
            )
        }
    }
}

// ── SectionHeader (matches iOS: with optional action) ───────────────────────

@Composable
fun SectionHeader(
    title: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(top = 6.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title.uppercase(),
            color = FICAMuted,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.8.sp,
        )
        Spacer(modifier = Modifier.weight(1f))
        if (onAction != null && actionLabel != null) {
            Text(
                text = actionLabel,
                color = FICAGold,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.clickable { onAction() },
            )
        }
    }
}

// ── FICAButton (matches iOS: primary/gold/ghost/danger styles) ──────────────

enum class FICAButtonStyle { PRIMARY, GOLD, GHOST, DANGER }

@Composable
fun FICAButton(
    title: String,
    icon: ImageVector? = null,
    style: FICAButtonStyle = FICAButtonStyle.PRIMARY,
    isLoading: Boolean = false,
    fullWidth: Boolean = true,
    onClick: () -> Unit,
) {
    val bg = when (style) {
        FICAButtonStyle.PRIMARY -> FICANavySolid
        FICAButtonStyle.GOLD -> FICAGold
        FICAButtonStyle.GHOST -> Color.Transparent
        FICAButtonStyle.DANGER -> FICADanger
    }
    val fg = when (style) {
        FICAButtonStyle.PRIMARY -> Color.White
        FICAButtonStyle.GOLD -> FICADark
        FICAButtonStyle.GHOST -> FICASecondary
        FICAButtonStyle.DANGER -> Color.White
    }

    Box(
        modifier = Modifier
            .then(if (fullWidth) Modifier.fillMaxWidth() else Modifier)
            .height(48.dp)
            .then(
                if (style == FICAButtonStyle.GHOST) {
                    Modifier
                        .border(1.dp, FICABorder, RoundedCornerShape(14.dp))
                        .background(bg, RoundedCornerShape(14.dp))
                } else {
                    Modifier.background(bg, RoundedCornerShape(14.dp))
                }
            )
            .clip(RoundedCornerShape(14.dp))
            .clickable(enabled = !isLoading) { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(7.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    color = fg,
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp,
                )
            } else if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = fg,
                    modifier = Modifier.size(14.dp),
                )
            }
            Text(
                text = title,
                color = fg,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

// ── FICASearchBar (matches iOS) ─────────────────────────────────────────────

@Composable
fun FICASearchBar(
    text: String,
    onTextChange: (String) -> Unit,
    placeholder: String = "Search...",
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(FICAInputBg, RoundedCornerShape(12.dp))
            .padding(horizontal = 14.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = Icons.Default.Search,
            contentDescription = null,
            tint = FICAMuted,
            modifier = Modifier.size(15.dp),
        )
        Spacer(modifier = Modifier.width(10.dp))
        TextField(
            value = text,
            onValueChange = onTextChange,
            modifier = Modifier.weight(1f),
            placeholder = {
                Text(
                    text = placeholder,
                    color = FICAMuted,
                    fontSize = 15.sp,
                )
            },
            singleLine = true,
            colors = TextFieldDefaults.colors(
                focusedContainerColor = Color.Transparent,
                unfocusedContainerColor = Color.Transparent,
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent,
                focusedTextColor = FICAText,
                unfocusedTextColor = FICAText,
            ),
        )
        if (text.isNotEmpty()) {
            IconButton(onClick = { onTextChange("") }) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Clear",
                    tint = FICAMuted,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

// ── PersonRow (matches iOS) ─────────────────────────────────────────────────

@Composable
fun PersonRow(
    name: String,
    subtitle: String? = null,
    photoUrl: String? = null,
    trailing: @Composable (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        AvatarView(
            name = name,
            photoUrl = photoUrl,
            size = 42.dp,
            borderColor = FICABorder,
            borderWidth = 1.dp,
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = name,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICAText,
            )
            if (!subtitle.isNullOrBlank()) {
                Text(
                    text = subtitle,
                    fontSize = 12.sp,
                    color = FICASecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        trailing?.invoke()
    }
}

// ── FICALogoView ────────────────────────────────────────────────────────────

@Composable
fun FICALogoView(height: Dp = 28.dp, modifier: Modifier = Modifier) {
    Image(
        painter = painterResource(id = R.drawable.fica_logo),
        contentDescription = "FICA Logo",
        modifier = modifier.height(height),
        contentScale = ContentScale.FillHeight,
    )
}

// ── FICAInput (polished outlined text field) ───────────────────────────────

@Composable
fun FICAInput(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String = "",
    icon: ImageVector? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    isPassword: Boolean = false,
    isError: Boolean = false,
    errorMessage: String? = null,
    singleLine: Boolean = true,
    modifier: Modifier = Modifier,
) {
    var passwordVisible by remember { mutableStateOf(false) }

    Column(modifier = modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text(text = label) },
            placeholder = if (placeholder.isNotBlank()) {
                { Text(text = placeholder, color = FICAMuted) }
            } else null,
            leadingIcon = if (icon != null) {
                {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = if (isError) FICADanger else FICAMuted,
                        modifier = Modifier.size(20.dp),
                    )
                }
            } else null,
            trailingIcon = if (isPassword) {
                {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = if (passwordVisible) "Hide password" else "Show password",
                            tint = FICAMuted,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }
            } else null,
            visualTransformation = if (isPassword && !passwordVisible) {
                PasswordVisualTransformation()
            } else {
                VisualTransformation.None
            },
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            isError = isError,
            singleLine = singleLine,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = FICANavy,
                unfocusedBorderColor = FICABorder,
                errorBorderColor = FICADanger,
                focusedLabelColor = FICANavy,
                unfocusedLabelColor = FICASecondary,
                errorLabelColor = FICADanger,
                cursorColor = FICANavy,
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
            ),
        )
        if (isError && !errorMessage.isNullOrBlank()) {
            Text(
                text = errorMessage,
                color = FICADanger,
                fontSize = 12.sp,
                modifier = Modifier.padding(start = 16.dp, top = 4.dp),
            )
        }
    }
}

// ── ShimmerBox (single shimmer element) ─────────────────────────────────────

@Composable
fun ShimmerBox(
    modifier: Modifier = Modifier,
    height: Dp = 16.dp,
    borderRadius: Dp = 8.dp,
) {
    val infiniteTransition = rememberInfiniteTransition(label = "shimmer")
    val shimmerX by infiniteTransition.animateFloat(
        initialValue = -300f,
        targetValue = 900f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmerX",
    )

    Box(
        modifier = modifier
            .height(height)
            .clip(RoundedCornerShape(borderRadius))
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        Color(0xFFE8ECF1),
                        Color(0xFFF4F6F9),
                        Color(0xFFE8ECF1),
                    ),
                    start = Offset(shimmerX, 0f),
                    end = Offset(shimmerX + 300f, 0f),
                )
            ),
    )
}

/** Full-page shimmer skeleton for a dashboard layout */
@Composable
fun DashboardSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FICABg)
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Hero card skeleton
        ShimmerBox(modifier = Modifier.fillMaxWidth(), height = 160.dp, borderRadius = 20.dp)

        // Stats row
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            ShimmerBox(modifier = Modifier.weight(1f), height = 80.dp, borderRadius = 14.dp)
            ShimmerBox(modifier = Modifier.weight(1f), height = 80.dp, borderRadius = 14.dp)
            ShimmerBox(modifier = Modifier.weight(1f), height = 80.dp, borderRadius = 14.dp)
        }

        // Section header
        ShimmerBox(modifier = Modifier.fillMaxWidth(0.3f).padding(top = 8.dp), height = 14.dp, borderRadius = 4.dp)

        // List items
        repeat(3) {
            ShimmerBox(modifier = Modifier.fillMaxWidth(), height = 88.dp, borderRadius = 16.dp)
        }
    }
}

/** List-page shimmer skeleton */
@Composable
fun ListSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(FICABg)
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Search bar
        ShimmerBox(modifier = Modifier.fillMaxWidth(), height = 44.dp, borderRadius = 12.dp)
        Spacer(modifier = Modifier.height(4.dp))
        // List items
        repeat(6) {
            ShimmerBox(modifier = Modifier.fillMaxWidth(), height = 76.dp, borderRadius = 14.dp)
        }
    }
}

// ── FICACard with click support ─────────────────────────────────────────────

@Composable
fun FICACardClickable(
    modifier: Modifier = Modifier,
    padding: Dp = 18.dp,
    onClick: () -> Unit,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .shadow(2.dp, RoundedCornerShape(14.dp), ambientColor = Color.Black.copy(alpha = 0.05f))
            .clip(RoundedCornerShape(16.dp))
            .background(FICACard, RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(padding),
    ) {
        content()
    }
}

// ── StatsCard (animated stats card with colored icon) ──────────────────────

@Composable
fun StatsCard(
    label: String,
    value: String,
    icon: ImageVector,
    color: Color = FICANavy,
    modifier: Modifier = Modifier,
) {
    val animatedScale by animateFloatAsState(
        targetValue = 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow,
        ),
        label = "statsScale",
    )

    FICACard(modifier = modifier, padding = 14.dp) {
        Column(
            modifier = Modifier.scale(animatedScale),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(color.copy(alpha = 0.1f), RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(20.dp),
                )
            }
            Text(
                text = value,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = FICAText,
            )
            Text(
                text = label,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = FICAMuted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

// ── FICADivider ─────────────────────────────────────────────────────────────

@Composable
fun FICADivider(modifier: Modifier = Modifier) {
    HorizontalDivider(
        modifier = modifier.fillMaxWidth(),
        thickness = 1.dp,
        color = FICABorder,
    )
}

// ── TierBadge (for sponsors) ────────────────────────────────────────────────

@Composable
fun TierBadge(
    tier: String?,
    label: String? = null,
) {
    val color = com.fica.events.ui.theme.SponsorTierColors.colorFor(tier)
    val bg = com.fica.events.ui.theme.SponsorTierColors.bgFor(tier)
    val displayLabel = label ?: com.fica.events.ui.theme.SponsorTierColors.labelFor(tier)

    Text(
        text = displayLabel.uppercase(),
        color = color,
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 0.6.sp,
        modifier = Modifier
            .background(bg, RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}
