package com.fica.events.ui.components

import com.fica.events.R

/**
 * Maps a sponsor's `logo_url` to a bundled drawable resource id when we
 * ship the PNG inside the APK. Returns `null` for any URL we don't have
 * packaged — in that case the caller should fall back to Coil AsyncImage
 * on the URL.
 *
 * The sponsor roster is locked for FICA Congress 2026 — shipping the
 * logos inside the app means they render instantly on first paint, no
 * flicker, no network dependency.
 */
object SponsorImage {

    // logo_url filename → drawable res id.
    private val mapping: Map<String, Int> = mapOf(
        "vodafone.png"         to R.drawable.sponsor_vodafone,
        "asco-motors.png"      to R.drawable.sponsor_asco_motors,
        "extra.png"            to R.drawable.sponsor_extra,
        "merchant-finance.png" to R.drawable.sponsor_merchant_finance,
        "marsh.png"            to R.drawable.sponsor_marsh,
        "motibhai.png"         to R.drawable.sponsor_motibhai,
        "ca-anz.png"           to R.drawable.sponsor_ca_anz,
        "datec.png"            to R.drawable.sponsor_datec,
        "fiji-airways.png"     to R.drawable.sponsor_fiji_airways,
        "fiji-times.png"       to R.drawable.sponsor_fiji_times,
    )

    fun bundledResFor(logoUrl: String?): Int? {
        val raw = logoUrl?.takeIf { it.isNotBlank() } ?: return null
        // Strip any query string, pull the last path segment, lowercase.
        val filename = raw
            .substringBefore('?')
            .substringBefore('#')
            .substringAfterLast('/')
            .lowercase()
        return mapping[filename]
    }
}
