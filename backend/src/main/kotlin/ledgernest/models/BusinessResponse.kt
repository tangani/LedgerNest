package ledgernest.models

import io.micronaut.serde.annotation.Serdeable
import java.util.UUID

@Serdeable
data class BusinessResponse(
    val id: UUID,
    val name: String,
    val description: String,
    val currency: String,
    val version: Long,
    val contributed: Long,
    val returned: Long,
    val invested: Long,
    val transactions: List<BusinessTransactionResponse>
)
