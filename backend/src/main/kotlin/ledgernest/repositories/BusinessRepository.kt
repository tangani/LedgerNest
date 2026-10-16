package ledgernest.repositories

import io.micronaut.context.annotation.Requires
import io.micronaut.transaction.TransactionDefinition
import io.micronaut.transaction.TransactionOperations
import io.micronaut.transaction.support.DefaultTransactionDefinition
import jakarta.inject.Singleton
import ledgernest.models.BusinessInput
import ledgernest.models.BusinessResponse
import ledgernest.models.BusinessTransactionInput
import ledgernest.models.BusinessTransactionResponse
import java.sql.Connection
import java.sql.ResultSet
import java.sql.SQLException
import java.time.LocalDate
import java.util.UUID

/** Owns SQL and transaction boundaries; business rules remain in the service. */
@Singleton
@Requires(env = ["ledgerlocal", "prod"])
class BusinessRepository(private val transactions: TransactionOperations<Connection>) {
    fun <T : Any> read(action: (Session) -> T): T = transaction(true, action)
    fun <T : Any> write(action: (Session) -> T): T = transaction(false, action)

    private fun <T : Any> transaction(readOnly: Boolean, action: (Session) -> T): T {
        val definition = DefaultTransactionDefinition().apply {
            setReadOnly(readOnly)
            setIsolationLevel(if (readOnly) TransactionDefinition.Isolation.REPEATABLE_READ else TransactionDefinition.Isolation.READ_COMMITTED)
        }
        return requireNotNull(transactions.execute(definition) { status -> action(Session(status.connection)) })
    }

    /** Valid only for the duration of the read/write callback. */
    class Session internal constructor(private val connection: Connection) {
        fun list(owner: UUID, limit: Int, offset: Int): List<BusinessResponse> =
            connection.prepareStatement("SELECT * FROM ln_business WHERE owner_id=? ORDER BY created_at DESC,id LIMIT ? OFFSET ?").use { statement ->
                statement.setObject(1, owner)
                statement.setInt(2, limit)
                statement.setInt(3, offset)
                statement.executeQuery().use { rows -> buildList { while (rows.next()) add(mapBusiness(rows)) } }
            }

        fun find(owner: UUID, id: UUID, lock: Boolean = false): BusinessResponse? {
            val suffix = if (lock) " FOR UPDATE" else ""
            return connection.prepareStatement("SELECT * FROM ln_business WHERE id=? AND owner_id=?$suffix").use { statement ->
                statement.setObject(1, id)
                statement.setObject(2, owner)
                statement.executeQuery().use { rows -> if (rows.next()) mapBusiness(rows) else null }
            }
        }

        fun insert(owner: UUID, id: UUID, input: BusinessInput) {
            connection.prepareStatement("INSERT INTO ln_business(id,owner_id,name,description,currency) VALUES (?,?,?,?,?)").use { statement ->
                statement.setObject(1, id)
                statement.setObject(2, owner)
                statement.setString(3, input.name)
                statement.setString(4, input.description)
                statement.setString(5, input.currency)
                check(statement.executeUpdate() == 1) { "Business insert failed" }
            }
        }

        fun update(owner: UUID, id: UUID, input: BusinessInput) {
            connection.prepareStatement("UPDATE ln_business SET name=?,description=?,currency=?,version=version+1,updated_at=now() WHERE id=? AND owner_id=?").use { statement ->
                statement.setString(1, input.name)
                statement.setString(2, input.description)
                statement.setString(3, input.currency)
                statement.setObject(4, id)
                statement.setObject(5, owner)
                check(statement.executeUpdate() == 1) { "Business update failed" }
            }
        }

        fun append(owner: UUID, businessId: UUID, input: BusinessTransactionInput) {
            connection.prepareStatement("INSERT INTO ln_business_transaction(id,business_id,owner_id,kind,amount,transaction_date,notes) VALUES (?,?,?,?,?,?,?)").use { statement ->
                statement.setObject(1, input.id)
                statement.setObject(2, businessId)
                statement.setObject(3, owner)
                statement.setString(4, input.kind)
                statement.setLong(5, input.amount)
                statement.setObject(6, input.date)
                statement.setString(7, input.notes)
                try {
                    check(statement.executeUpdate() == 1) { "Business transaction insert failed" }
                } catch (exception: SQLException) {
                    if (exception.sqlState == "23505") throw DuplicateBusinessTransactionException(exception)
                    throw exception
                }
            }
            connection.prepareStatement("UPDATE ln_business SET version=version+1,updated_at=now() WHERE id=? AND owner_id=?").use { statement ->
                statement.setObject(1, businessId)
                statement.setObject(2, owner)
                check(statement.executeUpdate() == 1) { "Business version update failed" }
            }
        }

        private fun mapBusiness(row: ResultSet): BusinessResponse {
            val id = row.getObject("id", UUID::class.java)
            val owner = row.getObject("owner_id", UUID::class.java)
            val transactions = connection.prepareStatement("SELECT id,kind,amount,transaction_date,notes FROM ln_business_transaction WHERE business_id=? AND owner_id=? ORDER BY transaction_date DESC,created_at DESC,id").use { statement ->
                statement.setObject(1, id)
                statement.setObject(2, owner)
                statement.executeQuery().use { rows -> buildList {
                    while (rows.next()) add(BusinessTransactionResponse(
                        rows.getObject("id", UUID::class.java), rows.getString("kind"), rows.getLong("amount"),
                        rows.getObject("transaction_date", LocalDate::class.java), rows.getString("notes")
                    ))
                } }
            }
            val contributed = transactions.filter { it.kind == "contribution" }.sumOf { it.amount }
            val returned = transactions.filter { it.kind == "capital_return" }.sumOf { it.amount }
            return BusinessResponse(id, row.getString("name"), row.getString("description"), row.getString("currency"),
                row.getLong("version"), contributed, returned, contributed - returned, transactions)
        }
    }
}
