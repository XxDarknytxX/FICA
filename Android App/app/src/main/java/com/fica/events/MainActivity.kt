package com.fica.events

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.fica.events.ui.navigation.FICANavHost
import com.fica.events.ui.theme.FICATheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            FICATheme {
                FICANavHost()
            }
        }
    }
}
