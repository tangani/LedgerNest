package ledgernest.services

import io.micronaut.context.annotation.Requires
import io.micronaut.http.HttpRequest
import io.micronaut.scheduling.TaskExecutors
import io.micronaut.security.authentication.AuthenticationRequest
import io.micronaut.security.authentication.AuthenticationResponse
import io.micronaut.security.authentication.provider.HttpRequestExecutorAuthenticationProvider
import jakarta.inject.Singleton

@Singleton
@Requires(env = ["ledgerlocal", "prod"])
class LoginAuthenticationProvider(private val service: AuthService, private val limits: AuthRateLimiter) : HttpRequestExecutorAuthenticationProvider<Any> {
    override fun getExecutorName(): String = TaskExecutors.BLOCKING
    override fun authenticate(requestContext: HttpRequest<Any>?, authRequest: AuthenticationRequest<String, String>): AuthenticationResponse {
        val username = authRequest.identity
        val password = authRequest.secret
        if (username.length > 254 || password.length > 128) return AuthenticationResponse.failure()
        val ip = requestContext?.remoteAddress?.address?.hostAddress ?: "unknown"
        if (!limits.allow("login-ip:$ip", 30) || !limits.allow("login-identifier:${service.normalise(username)}", 10)) return AuthenticationResponse.failure()
        val id = service.authenticate(username, password) ?: return AuthenticationResponse.failure()
        // The JWT subject is the immutable user ID, never an email or client-supplied owner ID.
        return AuthenticationResponse.success(id.toString())
    }
}
