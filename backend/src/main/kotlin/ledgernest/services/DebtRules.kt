package ledgernest.services

import ledgernest.models.DebtInput
import ledgernest.models.RepaymentInput

import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException
import java.time.LocalDate

internal object DebtRules {
    const val MAX_AMOUNT = 100_000_000_000L

    fun validate(input: DebtInput) {
        checkInput(input.person.isNotBlank() && input.person.length <= 100, "Person must contain 1–100 characters.")
        checkInput(input.purpose.length <= 160, "Purpose must not exceed 160 characters.")
        checkInput(input.notes.length <= 2000, "Notes must not exceed 2,000 characters.")
        checkInput(input.direction in setOf("receivable", "payable"), "Invalid direction.")
        checkInput(input.currency in setOf("ZAR", "USD"), "Currency must be ZAR or USD.")
        checkInput(input.principal in 1..MAX_AMOUNT, "Principal must be positive integer cents within the supported limit.")
        checkInput(input.due == null || input.due.year in 1..9999, "Invalid due date.")
    }

    fun validate(input: RepaymentInput, today: LocalDate) {
        checkInput(input.amount in 1..MAX_AMOUNT, "Repayment must be positive integer cents within the supported limit.")
        checkInput(input.date.year in 1..9999 && !input.date.isAfter(today), "Repayment date cannot be in the future.")
        checkInput(input.notes.length <= 2000, "Notes must not exceed 2,000 characters.")
    }

    private fun checkInput(valid: Boolean, message: String) {
        if (!valid) throw HttpStatusException(HttpStatus.BAD_REQUEST, message)
    }
}
