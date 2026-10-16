package ledgernest.services

import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException
import ledgernest.models.BusinessInput
import ledgernest.models.BusinessTransactionInput
import java.time.LocalDate

internal object BusinessRules {
    const val MAX_AMOUNT = 100_000_000_000L

    fun validate(input: BusinessInput) {
        checkInput(input.name.isNotBlank() && input.name.length <= 100, "Name must contain 1–100 characters.")
        checkInput(input.description.length <= 2000, "Description must not exceed 2,000 characters.")
        checkInput(input.currency in setOf("ZAR", "USD"), "Currency must be ZAR or USD.")
        checkInput(input.version == null || input.version >= 0, "Version cannot be negative.")
    }

    fun validate(input: BusinessTransactionInput, today: LocalDate) {
        checkInput(input.kind in setOf("contribution", "capital_return"), "Kind must be contribution or capital_return.")
        checkInput(input.amount in 1..MAX_AMOUNT, "Amount must be positive integer cents within the supported limit.")
        checkInput(input.date.year in 1..9999 && !input.date.isAfter(today), "Transaction date must be valid and cannot be in the future.")
        checkInput(input.notes.length <= 2000, "Notes must not exceed 2,000 characters.")
    }

    private fun checkInput(valid: Boolean, message: String) {
        if (!valid) throw HttpStatusException(HttpStatus.BAD_REQUEST, message)
    }
}
