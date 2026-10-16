package ledgernest.repositories

import io.micronaut.context.annotation.Requires
import io.micronaut.transaction.TransactionDefinition
import io.micronaut.transaction.TransactionOperations
import io.micronaut.transaction.support.DefaultTransactionDefinition
import jakarta.inject.Singleton
import ledgernest.models.DebtInput
import ledgernest.models.DebtResponse
import ledgernest.models.RepaymentInput
import ledgernest.models.RepaymentResponse
import java.sql.Connection
import java.sql.ResultSet
import java.sql.SQLException
import java.time.LocalDate
import java.util.UUID

/** SQL and transaction management only; no HTTP statuses or business rules. */
@Singleton
@Requires(env = ["ledgerlocal"])
class DebtRepository(private val transactions: TransactionOperations<Connection>) {
    fun <T : Any> read(action: (Session) -> T): T = transaction(readOnly = true, action = action)

    fun <T : Any> write(action: (Session) -> T): T = transaction(readOnly = false, action = action)

    private fun <T : Any> transaction(readOnly: Boolean, action: (Session) -> T
    ): T {
        val definition = DefaultTransactionDefinition().apply {
            setReadOnly(readOnly)
            setIsolationLevel(
                if (readOnly) {
                    TransactionDefinition.Isolation.REPEATABLE_READ
                } else {
                    TransactionDefinition.Isolation.READ_COMMITTED
                }
            )
        }

        return requireNotNull(
            transactions.execute(definition) { status ->
                action(Session(status.connection))
            }
        )
    }

    /** Valid only inside the read/write callback; never retain this session. */
    class Session internal constructor(private val connection: Connection) {
        fun list(owner: UUID, limit: Int, offset: Int): List<DebtResponse> =
            connection.prepareStatement("SELECT * FROM ln_debt WHERE owner_id=? ORDER BY created_at DESC, id LIMIT ? OFFSET ?").use { statement ->
                statement.setObject(1, owner)
                statement.setInt(2, limit)
                statement.setInt(3, offset)
                statement.executeQuery().use { rows -> buildList { while (rows.next()) add(mapDebt(rows)) } }
            }

        fun find(owner: UUID, id: UUID, lock: Boolean = false): DebtResponse? {
            val suffix = if (lock) " FOR UPDATE" else ""
            return connection.prepareStatement("SELECT * FROM ln_debt WHERE id=? AND owner_id=?$suffix").use { statement ->
                statement.setObject(1, id)
                statement.setObject(2, owner)
                statement.executeQuery().use { rows -> if (rows.next()) mapDebt(rows) else null }
            }
        }

        fun insert(owner: UUID, id: UUID, input: DebtInput) {
            connection.prepareStatement("INSERT INTO ln_debt(id,owner_id,person,purpose,direction,currency,principal,due,notes) VALUES (?,?,?,?,?,?,?,?,?)").use { statement ->
                statement.setObject(1, id)
                statement.setObject(2, owner)
                statement.setString(3, input.person)
                statement.setString(4, input.purpose)
                statement.setString(5, input.direction)
                statement.setString(6, input.currency)
                statement.setLong(7, input.principal)
                statement.setObject(8, input.due)
                statement.setString(9, input.notes)
                statement.executeUpdate()
            }
        }

        fun update(owner: UUID, id: UUID, input: DebtInput) {
            connection.prepareStatement("UPDATE ln_debt SET person=?,purpose=?,direction=?,currency=?,principal=?,due=?,notes=?,version=version+1,updated_at=now() WHERE id=? AND owner_id=?").use { statement ->
                statement.setString(1, input.person)
                statement.setString(2, input.purpose)
                statement.setString(3, input.direction)
                statement.setString(4, input.currency)
                statement.setLong(5, input.principal)
                statement.setObject(6, input.due)
                statement.setString(7, input.notes)
                statement.setObject(8, id)
                statement.setObject(9, owner)
                statement.executeUpdate()
            }
        }

        fun appendRepayment(owner: UUID, debtId: UUID, input: RepaymentInput) {
            connection.prepareStatement("INSERT INTO ln_repayment(id,debt_id,amount,payment_date,notes) VALUES (?,?,?,?,?)").use { statement ->
                statement.setObject(1, input.id)
                statement.setObject(2, debtId)
                statement.setLong(3, input.amount)
                statement.setObject(4, input.date)
                statement.setString(5, input.notes)
                try {
                    statement.executeUpdate()
                } catch (exception: SQLException) {
                    if (exception.sqlState == "23505") throw DuplicateRepaymentException(exception)
                    throw exception
                }
            }
            connection.prepareStatement("UPDATE ln_debt SET version=version+1,updated_at=now() WHERE id=? AND owner_id=?").use { statement ->
                statement.setObject(1, debtId)
                statement.setObject(2, owner)
                statement.executeUpdate()
            }
        }

        private fun mapDebt(row: ResultSet): DebtResponse {
            val id = row.getObject("id", UUID::class.java)
            val repayments = connection.prepareStatement("SELECT id,amount,payment_date,notes FROM ln_repayment WHERE debt_id=? ORDER BY payment_date DESC,created_at DESC,id").use { statement ->
                statement.setObject(1, id)
                statement.executeQuery().use { rows -> buildList {
                    while (rows.next()) add(RepaymentResponse(rows.getObject("id", UUID::class.java), rows.getLong("amount"), rows.getObject("payment_date", LocalDate::class.java), rows.getString("notes")))
                } }
            }
            val principal = row.getLong("principal")
            val repaid = repayments.sumOf { it.amount }
            return DebtResponse(id, row.getString("person"), row.getString("purpose"), row.getString("direction"), row.getString("currency"), principal, row.getObject("due", LocalDate::class.java), row.getString("notes"), row.getLong("version"), repaid, principal - repaid, repayments)
        }
    }
}
