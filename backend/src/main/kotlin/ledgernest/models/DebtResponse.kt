package ledgernest.models

import io.micronaut.serde.annotation.Serdeable
import java.time.LocalDate
import java.util.UUID

@Serdeable
data class DebtResponse(
    val id: UUID,
    val person: String,
    val purpose: String,
    val direction: String,
    val currency: String,
    val principal: Long,
    val due: LocalDate?,
    val notes: String,
    val version: Long,
    val repaid: Long,
    val outstanding: Long,
    val repayments: List<RepaymentResponse>,
)
