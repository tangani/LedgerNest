package ledgernest.models

import io.micronaut.serde.annotation.Serdeable
import java.time.LocalDate
import java.util.UUID

@Serdeable
data class RepaymentResponse(val id: UUID, val amount: Long, val date: LocalDate, val notes: String)
