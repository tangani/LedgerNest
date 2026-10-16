package ledgernest.models

import io.micronaut.serde.annotation.Serdeable
import java.time.LocalDate

@Serdeable
data class DebtInput(
    val person: String,
    val direction: String,
    val currency: String,
    val principal: Long,
    val purpose: String = "",
    val due: LocalDate? = null,
    val notes: String = "",
    // Required for updates; use the version returned by the last GET.
    val version: Long? = null,
)
