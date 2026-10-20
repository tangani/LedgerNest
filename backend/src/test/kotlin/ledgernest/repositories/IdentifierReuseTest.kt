package ledgernest.repositories

import io.micronaut.context.annotation.Property
import io.micronaut.test.extensions.junit5.annotation.MicronautTest
import io.micronaut.transaction.TransactionOperations
import jakarta.inject.Inject
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import java.sql.Connection
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

// Explicit opt-in: point DATASOURCES_DEFAULT_* at a disposable PostgreSQL DB.
@EnabledIfEnvironmentVariable(named = "LEDGERNEST_IDENTIFIER_TESTS", matches = "true")
@MicronautTest(environments = ["ledgerlocal"], transactional = false, startApplication = false)
@Property(name = "micronaut.security.token.jwt.signatures.secret.generator.secret",
    value = "identifier-regression-tests-only-secret-at-least-32-characters")
class IdentifierReuseTest {
    @Inject lateinit var users: UserRepository
    @Inject lateinit var transactions: TransactionOperations<Connection>
    private val ids = mutableListOf<UUID>()
    private val identifiers = mutableSetOf<String>()

    private fun fresh(): String = ("u" + UUID.randomUUID().toString().replace("-", "").take(24))
        .also { identifiers.add(it) }

    private fun account(username: String = fresh()): StoredUser {
        val user = StoredUser(UUID.randomUUID(), "Test", "User", username, "handle", "unused-test-hash")
        users.insert(user)
        ids.add(user.id)
        return user
    }

    @AfterEach
    fun cleanUp() {
        transactions.executeWrite { status ->
            for (id in ids) {
                status.connection.prepareStatement("DELETE FROM ln_identifier_change_history WHERE user_id=?").use {
                    it.setObject(1, id); it.executeUpdate()
                }
                status.connection.prepareStatement("DELETE FROM ln_user WHERE id=?").use {
                    it.setObject(1, id); it.executeUpdate()
                }
            }
            for (identifier in identifiers) {
                status.connection.prepareStatement("DELETE FROM ln_identifier_registry WHERE username=?").use {
                    it.setString(1, identifier); it.executeUpdate()
                }
            }
            true
        }
    }

    @Test
    fun `account can return to its released identifier and keeps its ID`() {
        val user = account()
        val next = fresh()
        assertTrue(users.changeUsername(user.id, user.username, next, "handle"))
        assertNull(users.findByUsername(user.username))
        assertTrue(users.changeUsername(user.id, next, user.username, "handle"))
        assertEquals(user.id, users.findByUsername(user.username)?.id)
        assertEquals(2L, transactions.executeRead { status ->
            status.connection.prepareStatement("SELECT count(*) FROM ln_identifier_change_history WHERE user_id=?").use {
                it.setObject(1, user.id)
                it.executeQuery().use { rows -> rows.next(); rows.getLong(1) }
            }
        })
    }

    @Test
    fun `another account can register with a released value without taking over the first account`() {
        val original = account()
        val next = fresh()
        assertTrue(users.changeUsername(original.id, original.username, next, "handle"))
        val replacement = account(original.username)
        assertNotEquals(original.id, replacement.id)
        assertEquals(original.id, users.findByUsername(next)?.id)
        assertEquals(replacement.id, users.findByUsername(original.username)?.id)
    }

    @Test
    fun `occupied identifier rejects both registration and change without altering accounts`() {
        val first = account()
        val second = account()
        assertThrows(DuplicateUsernameException::class.java) {
            account(first.username)
        }
        assertThrows(DuplicateUsernameException::class.java) {
            users.changeUsername(second.id, second.username, first.username, "handle")
        }
        assertEquals(first.id, users.findByUsername(first.username)?.id)
        assertEquals(second.id, users.findByUsername(second.username)?.id)
    }

    @Test
    fun `unchanged identifier succeeds and stale expected identifier fails`() {
        val user = account()
        assertTrue(users.changeUsername(user.id, user.username, user.username, "handle"))
        assertFalse(users.changeUsername(user.id, fresh(), fresh(), "handle"))
        assertEquals(user.username, users.findById(user.id)?.username)
    }

    @Test
    fun `only one concurrent claimant can acquire an available identifier`() {
        val first = account()
        val second = account()
        val target = fresh()
        val gate = CountDownLatch(1)
        val executor = Executors.newFixedThreadPool(2)
        try {
            val results = listOf(first, second).map { user ->
                executor.submit(Callable {
                    check(gate.await(10, TimeUnit.SECONDS))
                    try {
                        users.changeUsername(user.id, user.username, target, "handle")
                    } catch (_: DuplicateUsernameException) {
                        false
                    }
                })
            }
            gate.countDown()
            assertEquals(1, results.count { it.get(30, TimeUnit.SECONDS) })
            val winner = requireNotNull(users.findByUsername(target))
            assertTrue(winner.id == first.id || winner.id == second.id)
            val loser = if (winner.id == first.id) second else first
            assertEquals(loser.username, users.findById(loser.id)?.username)
        } finally {
            gate.countDown()
            executor.shutdownNow()
            check(executor.awaitTermination(30, TimeUnit.SECONDS))
        }
    }
}
