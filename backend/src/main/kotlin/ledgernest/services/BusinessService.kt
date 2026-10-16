package ledgernest.services

import io.micronaut.context.annotation.Requires
import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException
import jakarta.inject.Singleton
import ledgernest.models.BusinessInput
import ledgernest.models.BusinessResponse
import ledgernest.models.BusinessTransactionInput
import ledgernest.repositories.BusinessRepository
import ledgernest.repositories.DuplicateBusinessTransactionException
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

@Singleton
@Requires(env = ["ledgerlocal", "prod"])
class BusinessService(private val repository: BusinessRepository) {
    fun list(owner: UUID, limit: Int, offset: Int): List<BusinessResponse> {
        if (limit !in 1..100 || offset < 0) fail(HttpStatus.BAD_REQUEST, "Limit must be 1–100 and offset must be non-negative.")
        return repository.read { it.list(owner, limit, offset) }
    }

    fun get(owner: UUID, id: UUID): BusinessResponse = repository.read { required(it.find(owner, id)) }

    fun create(owner: UUID, input: BusinessInput): BusinessResponse {
        BusinessRules.validate(input)
        if (input.version != null) fail(HttpStatus.BAD_REQUEST, "Omit version when creating a business.")
        val clean = normalise(input)
        return repository.write { session ->
            val id = UUID.randomUUID()
            session.insert(owner, id, clean)
            required(session.find(owner, id))
        }
    }

    fun update(owner: UUID, id: UUID, input: BusinessInput): BusinessResponse {
        BusinessRules.validate(input)
        if (input.version == null) fail(HttpStatus.BAD_REQUEST, "Version is required when updating a business.")
        val clean = normalise(input)
        return repository.write { session ->
            val business = required(session.find(owner, id, lock = true))
            if (input.version != business.version) fail(HttpStatus.CONFLICT, "Business changed. Reload it before editing.")
            if (business.transactions.isNotEmpty() && input.currency != business.currency) {
                fail(HttpStatus.CONFLICT, "Currency cannot change after a transaction has been recorded.")
            }
            session.update(owner, id, clean)
            required(session.find(owner, id))
        }
    }

    fun transact(owner: UUID, id: UUID, input: BusinessTransactionInput): BusinessResponse {
        BusinessRules.validate(input, LocalDate.now(ZoneId.of("Africa/Johannesburg")))
        val clean = input.copy(notes = input.notes.trim())
        try {
            return repository.write { session ->
                // Serialize writes to this business, including metadata updates.
                val business = required(session.find(owner, id, lock = true))
                val existing = business.transactions.find { it.id == clean.id }
                if (existing != null) {
                    if (existing.kind != clean.kind || existing.amount != clean.amount ||
                        existing.date != clean.date || existing.notes != clean.notes) {
                        fail(HttpStatus.CONFLICT, "Transaction ID was already used with different details.")
                    }
                    return@write business
                }
                if (clean.kind == "capital_return" && clean.amount > business.invested) {
                    fail(HttpStatus.CONFLICT, "Capital return exceeds remaining invested capital.")
                }
                // Keep cumulative totals within the same supported money range as the frontend.
                if (clean.kind == "contribution" && clean.amount > BusinessRules.MAX_AMOUNT - business.contributed) {
                    fail(HttpStatus.CONFLICT, "Total contributions exceed the supported limit.")
                }
                session.append(owner, id, clean)
                required(session.find(owner, id))
            }
        } catch (_: DuplicateBusinessTransactionException) {
            // Translate after the failed transaction has been rolled back.
            fail(HttpStatus.CONFLICT, "Transaction ID is already in use.")
        }
    }

    private fun normalise(input: BusinessInput) = input.copy(name = input.name.trim(), description = input.description.trim())
    private fun required(business: BusinessResponse?): BusinessResponse = business ?: fail(HttpStatus.NOT_FOUND, "Business not found.")
    private fun fail(status: HttpStatus, message: String): Nothing = throw HttpStatusException(status, message)
}
