package ledgernest.models
import io.micronaut.serde.annotation.Serdeable
@Serdeable
class RegisterInput(val firstName: String, val surname: String, val username: String, val password: String)
