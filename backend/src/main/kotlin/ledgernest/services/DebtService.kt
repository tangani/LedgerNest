package ledgernest.services

import io.micronaut.context.annotation.Requires
import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException
import jakarta.inject.Singleton
import ledgernest.models.DebtInput
import ledgernest.models.DebtResponse
import ledgernest.models.RepaymentInput
import ledgernest.repositories.DebtRepository
import ledgernest.repositories.DuplicateRepaymentException
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

/** Coordinates business rules within a single repository transaction. */
@Singleton
@Requires(env = ["ledgerlocal"])
class DebtService(private val repository: DebtRepository) {
    // Local development only. Replace with authenticated identity before deployment.
    private val owner = UUID.fromString("00000000-0000-0000-0000-000000000001")

    fun list(limit: Int, offset: Int): List<DebtResponse> {
        if (limit !in 1..100 || offset < 0) fail(HttpStatus.BAD_REQUEST, "Limit must be 1–100 and offset must be non-negative.")
        return repository.read { it.list(owner, limit, offset) }
    }

    fun get(id: UUID): DebtResponse = repository.read { required(it.find(owner, id)) }

    fun create(input: DebtInput): DebtResponse {
        DebtRules.validate(input)
        val clean = normalise(input)
        return repository.write { session ->
            val id = UUID.randomUUID()
            session.insert(owner, id, clean)
            required(session.find(owner, id))
        }
    }

    fun update(id: UUID, input: DebtInput): DebtResponse {
        DebtRules.validate(input)
        if (input.version == null) fail(HttpStatus.BAD_REQUEST, "Version is required when updating a debt.")
        val clean = normalise(input)
        return repository.write { session ->
            val debt = required(session.find(owner, id, lock = true))
            if (input.version != debt.version) fail(HttpStatus.CONFLICT, "Debt changed. Reload it before editing.")
            if (input.principal < debt.repaid) fail(HttpStatus.CONFLICT, "Principal cannot be below recorded repayments.")
            if (debt.repayments.isNotEmpty() && (input.currency != debt.currency || input.direction != debt.direction)) {
                fail(HttpStatus.CONFLICT, "Currency and direction cannot change after a repayment.")
            }
            session.update(owner, id, clean)
            required(session.find(owner, id))
        }
    }

    fun repay(id: UUID, input: RepaymentInput): DebtResponse {
        DebtRules.validate(input, LocalDate.now(ZoneId.of("Africa/Johannesburg")))
        val clean = input.copy(notes = input.notes.trim())
        try {
            return repository.write { session ->
                // Keep lock + validation + insert + version change in this transaction.
                val debt = required(session.find(owner, id, lock = true))
                val existing = debt.repayments.find { it.id == input.id }
                if (existing != null) {
                    if (existing.amount != clean.amount || existing.date != clean.date || existing.notes != clean.notes) {
                        fail(HttpStatus.CONFLICT, "Repayment ID was already used with different details.")
                    }
                    return@write debt
                }
                if (input.amount > debt.outstanding) fail(HttpStatus.CONFLICT, "Repayment exceeds the outstanding balance.")
                session.appendRepayment(owner, id, clean)
                required(session.find(owner, id))
            }
        } catch (_: DuplicateRepaymentException) {
            // Repository has rolled back before translating persistence failure to HTTP.
            fail(HttpStatus.CONFLICT, "Repayment ID is already in use.")
        }
    }

    private fun normalise(input: DebtInput) = input.copy(person = input.person.trim(), purpose = input.purpose.trim(), notes = input.notes.trim())
    private fun required(debt: DebtResponse?): DebtResponse = debt ?: fail(HttpStatus.NOT_FOUND, "Debt not found.")
    private fun fail(status: HttpStatus, message: String): Nothing = throw HttpStatusException(status, message)
}
