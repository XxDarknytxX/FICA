package com.fica.events.ui.auth

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fica.events.data.api.ApiClient
import com.fica.events.data.auth.AuthManager
import com.fica.events.data.models.LoginRequest
import com.fica.events.ui.components.FICALogoView
import com.fica.events.ui.theme.FICADanger
import com.fica.events.ui.theme.FICAGold
import com.fica.events.ui.theme.FICAInputBg
import com.fica.events.ui.theme.FICAMuted
import com.fica.events.ui.theme.FICANavy
import com.fica.events.ui.theme.FICANavySolid
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ── Splash Screen ───────────────────────────────────────────────────────────

@Composable
fun SplashScreen(onFinished: () -> Unit) {
    var visible by remember { mutableStateOf(false) }
    val lineWidth = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        visible = true
        lineWidth.animateTo(120f, animationSpec = tween(1200, easing = LinearEasing))
        delay(400)
        onFinished()
    }

    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(durationMillis = 600),
        label = "splashFade",
    )

    val logoScale by animateFloatAsState(
        targetValue = if (visible) 1f else 0.6f,
        animationSpec = tween(durationMillis = 700),
        label = "logoScale",
    )

    // Rotating ring
    val infiniteTransition = rememberInfiniteTransition(label = "ring")
    val ringRotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 8000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "ringRotation",
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White),
    ) {
        // Gold accent line at top
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(3.dp)
                .background(
                    Brush.horizontalGradient(
                        listOf(
                            FICAGold.copy(alpha = 0.6f),
                            FICANavy.copy(alpha = 0.4f),
                            Color.Transparent
                        )
                    )
                )
                .align(Alignment.TopCenter),
        )

        // Radial glow
        Box(
            modifier = Modifier
                .size(250.dp)
                .align(Alignment.Center)
                .background(
                    Brush.radialGradient(
                        listOf(FICAGold.copy(alpha = 0.06f * alpha), Color.Transparent),
                        radius = 400f,
                    )
                ),
        )

        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .alpha(alpha),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Logo with animated ring
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.size(150.dp),
            ) {
                // Outer rotating ring
                Canvas(
                    modifier = Modifier
                        .size(140.dp)
                        .graphicsLayer { rotationZ = ringRotation }
                ) {
                    drawArc(
                        brush = Brush.sweepGradient(
                            listOf(
                                FICAGold.copy(alpha = 0.5f),
                                FICANavy.copy(alpha = 0.2f),
                                FICAGold.copy(alpha = 0.1f),
                                FICANavy.copy(alpha = 0.3f),
                                FICAGold.copy(alpha = 0.5f),
                            )
                        ),
                        startAngle = 0f,
                        sweepAngle = 360f,
                        useCenter = false,
                        style = Stroke(width = 2.dp.toPx()),
                    )
                }

                // Inner ring
                Canvas(modifier = Modifier.size(120.dp)) {
                    drawCircle(
                        color = FICAGold.copy(alpha = 0.15f),
                        style = Stroke(width = 1.dp.toPx()),
                    )
                }

                // Logo
                FICALogoView(
                    height = 50.dp,
                    modifier = Modifier.scale(logoScale),
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Event name
            Text(
                text = "Congress 2026",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = FICANavy,
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Tagline
            Text(
                text = "Navigating Tomorrow",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = FICAMuted,
            )

            Spacer(modifier = Modifier.height(40.dp))

            // Loading bar
            Box(
                modifier = Modifier
                    .width(120.dp)
                    .height(3.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(FICAInputBg),
            ) {
                Box(
                    modifier = Modifier
                        .width(lineWidth.value.dp)
                        .height(3.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(
                            Brush.horizontalGradient(listOf(FICANavy, FICAGold))
                        ),
                )
            }
        }
    }
}

// ── Login Screen ────────────────────────────────────────────────────────────

@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var showPassword by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current

    val submitLogin: () -> Unit = submit@{
        if (email.isBlank() || password.isBlank()) {
            error = "Please enter both email and password"
            return@submit
        }
        keyboardController?.hide()
        focusManager.clearFocus()
        isLoading = true
        error = null
        scope.launch {
            try {
                val response = ApiClient.service.login(
                    LoginRequest(email.trim(), password)
                )
                if (response.isSuccessful) {
                    val body = response.body() ?: throw Exception("Empty response")
                    AuthManager.login(body.token, body.attendee)
                    ApiClient.updateToken(body.token)
                    onLoginSuccess()
                } else {
                    error = when (response.code()) {
                        401 -> "Invalid email or password"
                        404 -> "Account not found"
                        else -> "Login failed (${response.code()})"
                    }
                }
            } catch (e: Exception) {
                error = e.message ?: "An unexpected error occurred"
            } finally {
                isLoading = false
            }
        }
    }

    var formVisible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { formVisible = true }
    val formAlpha by animateFloatAsState(
        targetValue = if (formVisible) 1f else 0f,
        animationSpec = tween(600),
        label = "formFade",
    )
    val formOffset by animateFloatAsState(
        targetValue = if (formVisible) 0f else 30f,
        animationSpec = tween(600),
        label = "formSlide",
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF0A1F3F),
                        Color(0xFF0D2A52),
                        Color(0xFF071829),
                    )
                )
            ),
    ) {
        // Decorative geometric background — no blur, pure Canvas
        Canvas(modifier = Modifier.fillMaxSize()) {
            // Large arc top-right
            drawArc(
                color = Color.White.copy(alpha = 0.04f),
                startAngle = 100f,
                sweepAngle = 200f,
                useCenter = false,
                topLeft = Offset(size.width - 160.dp.toPx(), -180.dp.toPx()),
                size = androidx.compose.ui.geometry.Size(360.dp.toPx(), 360.dp.toPx()),
                style = Stroke(width = 60.dp.toPx()),
            )
            // Gold ring mid-left
            drawCircle(
                color = Color(0xFFC9A84C).copy(alpha = 0.14f),
                radius = 90.dp.toPx(),
                center = Offset(-30.dp.toPx(), size.height * 0.38f),
                style = Stroke(width = 1.dp.toPx()),
            )
            // Thin gold ring top-right
            drawCircle(
                color = Color(0xFFC9A84C).copy(alpha = 0.1f),
                radius = 50.dp.toPx(),
                center = Offset(size.width - 40.dp.toPx(), size.height * 0.15f),
                style = Stroke(width = 1.dp.toPx()),
            )
            // Subtle gold glow bottom-right
            drawCircle(
                color = Color(0xFFC9A84C).copy(alpha = 0.07f),
                radius = 200.dp.toPx(),
                center = Offset(size.width * 0.9f, size.height * 0.92f),
            )
            // Dot grid accent
            val dotSpacing = 28.dp.toPx()
            val cols = 5
            val rows = 4
            val startX = 24.dp.toPx()
            val startY = size.height * 0.62f
            for (r in 0 until rows) {
                for (c in 0 until cols) {
                    drawCircle(
                        color = Color.White.copy(alpha = 0.06f),
                        radius = 1.5.dp.toPx(),
                        center = Offset(startX + c * dotSpacing, startY + r * dotSpacing),
                    )
                }
            }
        }

        // Gold accent bar at very top
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(3.dp)
                .background(
                    Brush.horizontalGradient(
                        listOf(
                            FICAGold,
                            FICAGold.copy(alpha = 0.4f),
                            Color.Transparent,
                        )
                    )
                )
                .align(Alignment.TopCenter),
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(horizontal = 24.dp)
                .alpha(formAlpha)
                .offset(y = formOffset.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Spacer(modifier = Modifier.weight(1f))

            // Event branding on dark background
            Text(
                text = "FICA CONGRESS",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = FICAGold,
                letterSpacing = 2.5.sp,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "2026",
                fontSize = 38.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                letterSpacing = (-1).sp,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Navigating Tomorrow",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = Color.White.copy(alpha = 0.45f),
            )

            Spacer(modifier = Modifier.height(36.dp))

            // ── Login card ──────────────────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(
                        elevation = 12.dp,
                        shape = RoundedCornerShape(20.dp),
                        ambientColor = Color.Black.copy(alpha = 0.15f),
                        spotColor = Color.Black.copy(alpha = 0.10f),
                    )
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color.White)
                    .padding(24.dp),
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // Logo inside the white card
                    FICALogoView(height = 40.dp)

                    Spacer(modifier = Modifier.height(18.dp))

                    Text(
                        text = "Welcome back",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = FICANavySolid,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Sign in with your delegate credentials",
                        fontSize = 13.sp,
                        color = FICAMuted,
                        textAlign = TextAlign.Center,
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // Error banner
                    error?.let { errorMessage ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(FICADanger.copy(alpha = 0.07f), RoundedCornerShape(12.dp))
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = "Error",
                                tint = FICADanger,
                                modifier = Modifier.size(15.dp),
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = errorMessage,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                color = FICADanger,
                            )
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    // Email field
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it; error = null },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Email address", color = FICAMuted.copy(alpha = 0.55f), fontSize = 14.sp) },
                        leadingIcon = {
                            Icon(Icons.Default.Email, "Email", tint = FICAMuted, modifier = Modifier.size(18.dp))
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next,
                        ),
                        keyboardActions = KeyboardActions(
                            onNext = { focusManager.moveFocus(FocusDirection.Down) },
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = FICAGold,
                            unfocusedBorderColor = Color.Transparent,
                            focusedContainerColor = Color(0xFFF8F9FC),
                            unfocusedContainerColor = Color(0xFFF4F5F8),
                        ),
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Password field
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; error = null },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Password", color = FICAMuted.copy(alpha = 0.55f), fontSize = 14.sp) },
                        leadingIcon = {
                            Icon(Icons.Default.Lock, "Password", tint = FICAMuted, modifier = Modifier.size(18.dp))
                        },
                        trailingIcon = {
                            IconButton(onClick = { showPassword = !showPassword }) {
                                Icon(
                                    imageVector = if (showPassword) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                    contentDescription = if (showPassword) "Hide" else "Show",
                                    tint = FICAMuted,
                                    modifier = Modifier.size(18.dp),
                                )
                            }
                        },
                        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done,
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = { submitLogin() },
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = FICAGold,
                            unfocusedBorderColor = Color.Transparent,
                            focusedContainerColor = Color(0xFFF8F9FC),
                            unfocusedContainerColor = Color(0xFFF4F5F8),
                        ),
                    )

                    Spacer(modifier = Modifier.height(22.dp))

                    // Sign In button
                    Button(
                        onClick = { submitLogin() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        enabled = !isLoading,
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = FICANavySolid,
                            disabledContainerColor = FICANavySolid.copy(alpha = 0.35f),
                        ),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(22.dp),
                                color = Color.White,
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Text(
                                    text = "Sign In",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                )
                                Icon(
                                    Icons.AutoMirrored.Filled.ArrowForward,
                                    contentDescription = null,
                                    tint = FICAGold,
                                    modifier = Modifier.size(16.dp),
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Footer on dark background
            Row(
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Canvas(modifier = Modifier.size(4.dp)) {
                    drawCircle(color = FICAGold.copy(alpha = 0.7f))
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "Crowne Plaza Fiji",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.White.copy(alpha = 0.45f),
                )
                Spacer(modifier = Modifier.width(10.dp))
                Canvas(modifier = Modifier.size(4.dp)) {
                    drawCircle(color = FICAGold.copy(alpha = 0.7f))
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "8–9 May 2026",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.White.copy(alpha = 0.45f),
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Accountancy in the Age of Change",
                fontSize = 11.sp,
                color = Color.White.copy(alpha = 0.28f),
                textAlign = TextAlign.Center,
            )

            Spacer(modifier = Modifier.weight(0.5f))
        }
    }
}
