package ledgernest.models
import io.micronaut.serde.annotation.Serdeable
import java.util.UUID
@Serdeable
data class UserResponse(val id: UUID, val firstName: String, val surname: String, val username: String, val identifierType: String, val identifierVerified: Boolean = false)
