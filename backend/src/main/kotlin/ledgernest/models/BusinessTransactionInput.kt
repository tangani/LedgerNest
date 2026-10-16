package ledgernest.models

import io.micronaut.serde.annotation.Serdeable
import java.util.UUID
import java.time.LocalDate

@Serdeable
data class BusinessTransactionInput(
    val id: UUID,
    val kind: String,
    val amount: Long,
    val date: LocalDate,
    val notes: String = ""
)
