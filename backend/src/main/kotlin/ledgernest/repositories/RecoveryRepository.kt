package ledgernest.repositories

import io.micronaut.context.annotation.Requires
import io.micronaut.transaction.TransactionOperations
import jakarta.inject.Singleton
import java.sql.Connection
import java.time.Instant
import java.util.UUID

data class RecoveryContact(val target: String, val channel: String)
data class RecoveryChallenge(val id: UUID, val userId: UUID, val purpose: String, val target: String, val channel: String, val tokenHash: String, val version: Long, val sid: String?, val expires: Instant)

@Singleton
@Requires(env = ["ledgerlocal", "prod"])
class RecoveryRepository(private val tx: TransactionOperations<Connection>) {
    @io.micronaut.scheduling.annotation.Scheduled(fixedDelay = "1h")
    fun cleanup() { tx.executeWrite { s ->
        s.connection.createStatement().use { q ->
            q.executeUpdate("DELETE FROM ln_recovery_challenge WHERE expires_at < now() - interval '1 day'")
            q.executeUpdate("DELETE FROM ln_recovery_limit WHERE window_start < now() - interval '2 days'")
        }
    } }
    fun contact(id: UUID): RecoveryContact? = tx.executeRead { s ->
        s.connection.prepareStatement("SELECT target,channel FROM ln_recovery_contact WHERE user_id=?").use { q ->
            q.setObject(1,id); q.executeQuery().use { r -> if(r.next()) RecoveryContact(r.getString(1),r.getString(2)) else null }
        }
    }
    // Atomic database-backed limits, shared across instances. No trusted proxy/IP assumption.
    fun allow(bucket: String, limit: Int, seconds: Int): Boolean = tx.executeWrite { s ->
        s.connection.prepareStatement("""INSERT INTO ln_recovery_limit VALUES (?,now(),1)
            ON CONFLICT(bucket) DO UPDATE SET
            attempts=CASE WHEN ln_recovery_limit.window_start < now() - (? * interval '1 second') THEN 1 ELSE ln_recovery_limit.attempts+1 END,
            window_start=CASE WHEN ln_recovery_limit.window_start < now() - (? * interval '1 second') THEN now() ELSE ln_recovery_limit.window_start END
            RETURNING attempts""").use { q ->
            q.setString(1,bucket); q.setInt(2,seconds); q.setInt(3,seconds)
            q.executeQuery().use { r -> r.next(); r.getInt(1)<=limit }
        }
    } == true
    fun create(c: RecoveryChallenge) {
        tx.executeWrite { s ->
            s.connection.prepareStatement("INSERT INTO ln_recovery_challenge(id,user_id,purpose,target,channel,token_hash,auth_version,expires_at) VALUES (?,?,?,?,?,?,?,?)").use { q ->
                q.setObject(1,c.id); q.setObject(2,c.userId); q.setString(3,c.purpose); q.setString(4,c.target)
                q.setString(5,c.channel); q.setString(6,c.tokenHash); q.setLong(7,c.version)
                q.setTimestamp(8,java.sql.Timestamp.from(c.expires)); q.executeUpdate()
            }
        }
    }
    fun setSid(id: UUID, sid: String) { tx.executeWrite { s ->
        s.connection.prepareStatement("UPDATE ln_recovery_challenge SET provider_sid=? WHERE id=?").use { q -> q.setString(1,sid);q.setObject(2,id);q.executeUpdate() }
    } }
    fun cancel(id: UUID) { tx.executeWrite { s ->
        s.connection.prepareStatement("UPDATE ln_recovery_challenge SET consumed=true WHERE id=?").use { q -> q.setObject(1,id);q.executeUpdate() }
    } }
    fun attempt(id: UUID): RecoveryChallenge? = tx.executeWrite { s ->
        s.connection.prepareStatement("""UPDATE ln_recovery_challenge SET attempts=attempts+1
            WHERE id=? AND NOT consumed AND expires_at>now() AND attempts<5 RETURNING *""").use { q ->
            q.setObject(1,id);q.executeQuery().use { r -> if(!r.next()) null else RecoveryChallenge(id,r.getObject("user_id",UUID::class.java),r.getString("purpose"),r.getString("target"),r.getString("channel"),r.getString("token_hash"),r.getLong("auth_version"),r.getString("provider_sid"),r.getTimestamp("expires_at").toInstant()) }
        }
    }
    // Lock user first: resets, enrollment and concurrent challenges serialize on the account.
    fun complete(c: RecoveryChallenge, hash: String?): Boolean = tx.executeWrite { s ->
        val connection=s.connection
        val version=connection.prepareStatement("SELECT auth_version FROM ln_user WHERE id=? FOR UPDATE").use { q ->
            q.setObject(1,c.userId);q.executeQuery().use { r -> if(r.next()) r.getLong(1) else null }
        }
        if(version!=c.version) return@executeWrite false
        if(c.purpose=="reset") {
            val contact=connection.prepareStatement("SELECT target,channel FROM ln_recovery_contact WHERE user_id=?").use { q ->
                q.setObject(1,c.userId);q.executeQuery().use { r -> if(r.next()) RecoveryContact(r.getString(1),r.getString(2)) else null }
            }
            if(contact!=RecoveryContact(c.target,c.channel) || hash==null) return@executeWrite false
        }
        val consumed=connection.prepareStatement("UPDATE ln_recovery_challenge SET consumed=true WHERE id=? AND NOT consumed AND expires_at>now()").use { q -> q.setObject(1,c.id);q.executeUpdate()==1 }
        if(!consumed) return@executeWrite false
        if(c.purpose=="enroll") {
            connection.prepareStatement("INSERT INTO ln_recovery_contact(user_id,target,channel) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET target=excluded.target,channel=excluded.channel,verified_at=now()").use { q ->
                q.setObject(1,c.userId);q.setString(2,c.target);q.setString(3,c.channel);q.executeUpdate()
            }
        } else {
            connection.prepareStatement("UPDATE ln_user SET password_hash=?,auth_version=auth_version+1,updated_at=now() WHERE id=?").use { q -> q.setString(1,hash);q.setObject(2,c.userId);q.executeUpdate() }
        }
        connection.prepareStatement("UPDATE ln_recovery_challenge SET consumed=true WHERE user_id=?").use { q -> q.setObject(1,c.userId);q.executeUpdate() }
        true
    } == true
}
