package ledgernest.repositories

import io.micronaut.context.annotation.Requires
import io.micronaut.transaction.TransactionOperations
import jakarta.inject.Singleton
import java.sql.Connection
import java.sql.ResultSet
import java.sql.SQLException
import java.util.UUID

class StoredUser(val id: UUID, val firstName: String, val surname: String, val username: String, val identifierType: String, val passwordHash: String)
class DuplicateUsernameException(cause: Throwable) : RuntimeException(cause)

@Singleton
@Requires(env = ["ledgerlocal", "prod"])
class UserRepository(private val transactions: TransactionOperations<Connection>) {
    private fun map(row: ResultSet) = StoredUser(row.getObject("id", UUID::class.java), row.getString("first_name"), row.getString("surname"), row.getString("username"), row.getString("identifier_type"), row.getString("password_hash"))
    fun findByUsername(username: String): StoredUser? = transactions.executeRead { status ->
        status.connection.prepareStatement("SELECT * FROM ln_user WHERE username=?").use { statement ->
            statement.setString(1, username)
            statement.executeQuery().use { rows -> if (rows.next()) map(rows) else null }
        }
    }
    fun findById(id: UUID): StoredUser? = transactions.executeRead { status ->
        status.connection.prepareStatement("SELECT * FROM ln_user WHERE id=?").use { statement ->
            statement.setObject(1, id)
            statement.executeQuery().use { rows -> if (rows.next()) map(rows) else null }
        }
    }
    private fun reserve(connection: Connection, username: String) {
        connection.prepareStatement("INSERT INTO ln_identifier_registry(username) VALUES (?)").use { statement ->
            statement.setString(1, username)
            try { statement.executeUpdate() } catch (error: SQLException) {
                if (error.sqlState == "23505") throw DuplicateUsernameException(error)
                throw error
            }
        }
    }
    fun insert(user: StoredUser) {
        transactions.executeWrite { status ->
            reserve(status.connection, user.username)
            status.connection.prepareStatement("INSERT INTO ln_user(id,first_name,surname,username,identifier_type,password_hash) VALUES (?,?,?,?,?,?)").use { statement ->
                statement.setObject(1, user.id)
                statement.setString(2, user.firstName)
                statement.setString(3, user.surname)
                statement.setString(4, user.username)
                statement.setString(5, user.identifierType)
                statement.setString(6, user.passwordHash)
                check(statement.executeUpdate() == 1)
            }
            true
        }
    }
    fun changeUsername(id: UUID, expectedUsername: String, username: String, type: String): Boolean = requireNotNull(transactions.executeWrite { status ->
        val current = status.connection.prepareStatement("SELECT username FROM ln_user WHERE id=? FOR UPDATE").use { statement ->
            statement.setObject(1, id)
            statement.executeQuery().use { rows -> if (rows.next()) rows.getString("username") else null }
        }
        if (current != expectedUsername) return@executeWrite false
        if (current == username) return@executeWrite true
        reserve(status.connection, username)
        status.connection.prepareStatement("UPDATE ln_user SET username=?,identifier_type=?,updated_at=now() WHERE id=?").use { statement ->
            statement.setString(1, username)
            statement.setString(2, type)
            statement.setObject(3, id)
            check(statement.executeUpdate() == 1)
        }
        true
    })
}
