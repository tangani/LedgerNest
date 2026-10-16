package ledgernest.services

import io.micronaut.context.annotation.Requires
import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException
import io.micronaut.security.authentication.Authentication
import jakarta.inject.Singleton
import java.util.UUID

@Singleton
@Requires(env = ["ledgerlocal", "prod"])
class AuthenticatedOwner(private val auth: AuthService) {
    fun id(authentication: Authentication): UUID {
        val id = try { UUID.fromString(authentication.name) }
        catch (_: IllegalArgumentException) { throw HttpStatusException(HttpStatus.UNAUTHORIZED, "Sign in again.") }
        auth.me(id) // Reject signed subjects for accounts that no longer exist.
        return id
    }
}
