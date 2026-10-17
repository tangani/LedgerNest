package ledgernest.models

import io.micronaut.serde.annotation.Serdeable
import java.util.UUID

@Serdeable data class RecoveryEnrollInput(val target: String, val currentPassword: String)
@Serdeable data class RecoveryStartInput(val username: String, val channel: String)
@Serdeable data class RecoveryFinishInput(val id: UUID, val secret: String, val newPassword: String? = null)
@Serdeable data class RecoveryChallengeResponse(val id: UUID, val message: String = "If eligible, recovery instructions will be sent. Check your verified recovery contact.")
@Serdeable data class RecoveryStatus(val configured: Boolean, val channel: String? = null)
@Serdeable data class RecoveryMessage(val message: String)
