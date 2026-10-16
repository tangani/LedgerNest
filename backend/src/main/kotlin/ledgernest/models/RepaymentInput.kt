package ledgernest.models

import io.micronaut.serde.annotation.Serdeable
import java.time.LocalDate
import java.util.UUID

@Serdeable
data class RepaymentInput(
    // Client-generated ID: reuse it when retrying the SAME payment request.
    val id: UUID,
    val amount: Long,
    val date: LocalDate,
    val notes: String = "",
)
