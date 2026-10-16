package ledgernest.models
import io.micronaut.serde.annotation.Serdeable
@Serdeable
class ChangeUsernameInput(val username: String, val currentPassword: String)
