package com.fica.events.data.api

import com.fica.events.data.models.*
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

interface ApiService {

    // Auth
    @POST("delegate/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    // Profile
    @GET("delegate/me")
    suspend fun getProfile(): Response<ProfileResponse>

    // Directory
    @GET("delegate/directory")
    suspend fun getDirectory(): Response<DirectoryResponse>

    @GET("delegate/directory/{id}")
    suspend fun getAttendee(@Path("id") id: Int): Response<Attendee>

    // Sessions
    @GET("delegate/sessions")
    suspend fun getSessions(@Query("year") year: Int? = null): Response<SessionsResponse>

    // Speakers
    @GET("delegate/speakers")
    suspend fun getSpeakers(@Query("year") year: Int? = null): Response<SpeakersResponse>

    // Sponsors
    @GET("delegate/sponsors")
    suspend fun getSponsors(@Query("year") year: Int? = null): Response<SponsorsResponse>

    // Announcements
    @GET("delegate/announcements")
    suspend fun getAnnouncements(): Response<AnnouncementsResponse>

    // Networking Events
    @GET("delegate/networking")
    suspend fun getNetworkingEvents(@Query("year") year: Int? = null): Response<NetworkingEventsResponse>

    // Settings
    @GET("delegate/settings")
    suspend fun getSettings(): Response<EventSettingsResponse>

    // Messages
    @GET("delegate/messages")
    suspend fun getMessages(@Query("attendeeId") attendeeId: Int): Response<MessagesResponse>

    @GET("delegate/messages/conversation")
    suspend fun getConversation(
        @Query("a") a: Int,
        @Query("b") b: Int
    ): Response<MessagesResponse>

    @POST("delegate/messages")
    suspend fun sendMessage(@Body request: SendMessageRequest): Response<SendMessageResponse>

    @POST("delegate/messages/read")
    suspend fun markAsRead(@Body request: MarkAsReadRequest): Response<Unit>

    @DELETE("delegate/messages/{id}")
    suspend fun deleteMessage(@Path("id") id: Int): Response<Unit>

    // Connections
    @GET("delegate/connections")
    suspend fun getConnections(@Query("attendeeId") attendeeId: Int): Response<ConnectionsResponse>

    @POST("delegate/connections")
    suspend fun createConnection(@Body request: CreateConnectionRequest): Response<ConnectionResponse>

    @PUT("delegate/connections/{id}")
    suspend fun updateConnection(
        @Path("id") id: Int,
        @Body request: StatusUpdateRequest
    ): Response<ConnectionResponse>

    // Meetings
    @GET("delegate/meetings")
    suspend fun getMeetings(@Query("attendeeId") attendeeId: Int): Response<MeetingsResponse>

    @POST("delegate/meetings")
    suspend fun createMeeting(@Body request: CreateMeetingRequest): Response<MeetingResponse>

    @PUT("delegate/meetings/{id}")
    suspend fun updateMeeting(
        @Path("id") id: Int,
        @Body request: StatusUpdateRequest
    ): Response<MeetingResponse>

    // Projects / Voting
    @GET("delegate/projects")
    suspend fun getProjects(): Response<ProjectsResponse>

    @POST("delegate/vote")
    suspend fun vote(@Body request: VoteRequest): Response<VoteResponse>

    @DELETE("delegate/vote")
    suspend fun removeVote(): Response<VoteResponse>

    // Panel Discussion
    @GET("delegate/panels")
    suspend fun getPanels(@Query("year") year: Int? = null): Response<PanelsResponse>

    @GET("delegate/panels/{id}/questions")
    suspend fun getPanelQuestions(@Path("id") id: Int): Response<PanelQuestionsResponse>

    @POST("delegate/panels/{id}/questions")
    suspend fun postPanelQuestion(
        @Path("id") id: Int,
        @Body request: PostPanelQuestionRequest,
    ): Response<PanelQuestionResponse>
}

object ApiClient {

    // Production backend — https://eventsfiji.cloud
    // For local dev against the emulator, swap to "http://10.0.2.2:5000/api/"
    // (and re-add android:usesCleartextTraffic="true" in AndroidManifest.xml).
    private const val BASE_URL = "https://eventsfiji.cloud/api/"

    var authToken: String? = null

    private val authInterceptor = Interceptor { chain ->
        val originalRequest = chain.request()
        val requestBuilder = originalRequest.newBuilder()

        authToken?.let { token ->
            requestBuilder.addHeader("Authorization", "Bearer $token")
        }

        chain.proceed(requestBuilder.build())
    }

    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .build()
    }

    private val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    val service: ApiService by lazy {
        retrofit.create(ApiService::class.java)
    }

    fun updateToken(token: String?) {
        authToken = token
    }
}
