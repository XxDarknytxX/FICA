package com.fica.events

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.fica.events.ui.navigation.FICANavHost
import com.fica.events.ui.theme.FICATheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Must be called before super.onCreate(). Installs a no-op system
        // splash (white bg + transparent icon, see Theme.FICAEvents.Splash)
        // and hands control back to us so our Composable SplashScreen renders
        // immediately — no launcher-icon flash in between.
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            FICATheme {
                FICANavHost()
            }
        }
    }
}
