package ledgernest.models

import io.micronaut.serde.annotation.Serdeable

@Serdeable
data class BusinessInput(
    val name: String,
    val currency: String,
    val description: String = "",
    val version: Long? = null
)
