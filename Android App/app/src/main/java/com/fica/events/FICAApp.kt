package com.fica.events

import android.app.Application
import com.fica.events.data.auth.AuthManager

class FICAApp : Application() {
    override fun onCreate() {
        super.onCreate()
        AuthManager.init(this)
    }
}
