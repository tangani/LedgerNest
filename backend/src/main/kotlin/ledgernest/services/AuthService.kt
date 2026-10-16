package ledgernest.services

import io.micronaut.context.annotation.Requires
import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException
import jakarta.inject.Singleton
import ledgernest.models.RegisterInput
import ledgernest.models.ChangeUsernameInput
import ledgernest.models.UserResponse
import ledgernest.repositories.DuplicateUsernameException
import ledgernest.repositories.StoredUser
import ledgernest.repositories.UserRepository
import java.util.UUID

@Singleton
@Requires(env = ["ledgerlocal", "prod"])
class AuthService(private val users: UserRepository, private val passwords: PasswordService, private val identifiers: LoginIdentifier) {
    private val dummyHash by lazy { passwords.hash(UUID.randomUUID().toString()) }
    fun normalise(username: String): String? = identifiers.parse(username)?.value
    private fun response(user: StoredUser) = UserResponse(user.id, user.firstName, user.surname, user.username, user.identifierType)
    private fun required(id: UUID) = users.findById(id) ?: throw HttpStatusException(HttpStatus.UNAUTHORIZED, "Sign in again.")
    private fun identifier(raw: String) = identifiers.parse(raw) ?: throw HttpStatusException(HttpStatus.BAD_REQUEST, "Use an email, an international phone number with +country code, or a 3–30 character username starting with a letter.")

    fun register(input: RegisterInput): UserResponse {
        val login = identifier(input.username)
        val firstName = input.firstName.trim()
        val surname = input.surname.trim()
        if (firstName.length !in 1..100 || surname.length !in 1..100 || (firstName + surname).any { it.isISOControl() }) {
            throw HttpStatusException(HttpStatus.BAD_REQUEST, "Name and surname must contain 1–100 characters each.")
        }
        if (input.password.length !in 15..128) throw HttpStatusException(HttpStatus.BAD_REQUEST, "Use a password of 15–128 characters.")
        val user = StoredUser(UUID.randomUUID(), firstName, surname, login.value, login.type, passwords.hash(input.password))
        try { users.insert(user) } catch (_: DuplicateUsernameException) {
            throw HttpStatusException(HttpStatus.CONFLICT, "This sign-in identifier is unavailable. Try signing in or choose another.")
        }
        return response(user)
    }
    fun authenticate(username: String, password: String): UUID? {
        if (username.length > 254 || password.length !in 1..128) return null
        val login = identifiers.parse(username)
        val user = login?.let { users.findByUsername(it.value) }
        val valid = passwords.verify(password, user?.passwordHash ?: dummyHash)
        return if (valid) user?.id else null
    }
    fun me(id: UUID): UserResponse = response(required(id))
    fun changeUsername(id: UUID, input: ChangeUsernameInput): UserResponse {
        val login = identifier(input.username)
        val user = required(id)
        if (input.currentPassword.length !in 1..128 || !passwords.verify(input.currentPassword, user.passwordHash)) {
            throw HttpStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect.")
        }
        try {
            if (!users.changeUsername(id, user.username, login.value, login.type)) throw HttpStatusException(HttpStatus.CONFLICT, "Account changed. Reload before trying again.")
        } catch (_: DuplicateUsernameException) {
            throw HttpStatusException(HttpStatus.CONFLICT, "This sign-in identifier is unavailable.")
        }
        return me(id)
    }
}
