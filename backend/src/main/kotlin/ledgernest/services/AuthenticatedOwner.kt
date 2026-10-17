package ledgernest.services

import io.micronaut.context.annotation.Requires
import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException
import io.micronaut.security.authentication.Authentication
import jakarta.inject.Singleton
import java.util.UUID

@Singleton
@Requires(env = ["ledgerlocal", "prod"])
class AuthenticatedOwner(private val auth: AuthService, private val users: ledgernest.repositories.UserRepository) {
    fun id(authentication: Authentication): UUID {
        val id = try { UUID.fromString(authentication.name) }
        catch (_: IllegalArgumentException) { throw HttpStatusException(HttpStatus.UNAUTHORIZED, "Sign in again.") }
        val user = users.findById(id) ?: throw HttpStatusException(HttpStatus.UNAUTHORIZED, "Sign in again.")
        // Older tokens without a version are invalidated when this update is deployed.
        val version = (authentication.attributes["auth_version"] as? Number)?.toLong()
        if (version != user.authVersion) throw HttpStatusException(HttpStatus.UNAUTHORIZED, "Sign in again.")
        return id
    }
}
