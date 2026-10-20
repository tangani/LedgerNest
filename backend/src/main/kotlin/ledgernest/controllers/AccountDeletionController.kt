package ledgernest.controllers

import io.micronaut.context.annotation.Requires
import io.micronaut.http.*
import io.micronaut.http.annotation.*
import io.micronaut.http.exceptions.HttpStatusException
import io.micronaut.scheduling.TaskExecutors
import io.micronaut.scheduling.annotation.ExecuteOn
import io.micronaut.security.annotation.Secured
import io.micronaut.security.authentication.Authentication
import io.micronaut.security.rules.SecurityRule
import io.micronaut.serde.annotation.Serdeable
import io.micronaut.transaction.TransactionOperations
import ledgernest.services.*
import java.sql.Connection

@Serdeable
data class DeleteAccountInput(val currentPassword: String, val confirmation: String)
@Serdeable
data class DeleteAccountResult(val message: String)

@Controller
@Requires(env = ["ledgerlocal", "prod"])
@ExecuteOn(TaskExecutors.BLOCKING)
class AccountDeletionController(
    private val transactions: TransactionOperations<Connection>,
    private val owners: AuthenticatedOwner,
    private val passwords: PasswordService,
    private val limits: AuthRateLimiter
) {
    @Get("/delete-account", produces = [MediaType.TEXT_HTML])
    @Secured(SecurityRule.IS_ANONYMOUS)
    fun page(): HttpResponse<String> {
        val html = requireNotNull(javaClass.getResourceAsStream("/account-deletion.html")).bufferedReader().use { it.readText() }
        return HttpResponse.ok(html).header("Cache-Control", "no-store")
            .header("X-Content-Type-Options", "nosniff")
            .header("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
    }

    @Post("/api/v1/auth/delete-account")
    @Secured(SecurityRule.IS_AUTHENTICATED)
    fun delete(authentication: Authentication, @Body input: DeleteAccountInput): DeleteAccountResult {
        val id = owners.id(authentication)
        if (!limits.allow("delete-account:$id", 5)) throw HttpStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Try again later.")
        if (input.confirmation != "DELETE") throw HttpStatusException(HttpStatus.BAD_REQUEST, "Type DELETE to confirm permanent deletion.")
        transactions.executeWrite { status ->
            val c = status.connection
            // Short, infrequent maintenance transaction. Lock every application table in a
            // stable order: existing financial writes do not all lock their parent user.
            c.createStatement().use { it.execute("SET LOCAL lock_timeout = '5s'") }
            val tables = c.createStatement().use { s ->
                s.executeQuery("SELECT tablename FROM pg_tables WHERE schemaname=current_schema() AND left(tablename,3)='ln_' ORDER BY tablename").use { r ->
                    buildList { while (r.next()) add(r.getString(1)) }
                }
            }
            fun quoted(s: String) = "\"" + s.replace("\"", "\"\"") + "\""
            c.createStatement().use { s -> tables.forEach { s.execute("LOCK TABLE " + quoted(it) + " IN SHARE ROW EXCLUSIVE MODE") } }
            val row = c.prepareStatement("SELECT username,password_hash,auth_version FROM ln_user WHERE id=? FOR UPDATE").use { s ->
                s.setObject(1,id)
                s.executeQuery().use { r ->
                    if (!r.next()) throw HttpStatusException(HttpStatus.UNAUTHORIZED, "Sign in again.")
                    Triple(r.getString(1),r.getString(2),r.getLong(3))
                }
            }
            if ((authentication.attributes["auth_version"] as? Number)?.toLong() != row.third)
                throw HttpStatusException(HttpStatus.UNAUTHORIZED, "Sign in again.")
            if (input.currentPassword.length !in 1..128 || !passwords.verify(input.currentPassword,row.second))
                throw HttpStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect.")
            fun remove(sql: String) { c.prepareStatement(sql).use { s -> s.setObject(1,id);s.executeUpdate() } }
            remove("DELETE FROM ln_repayment WHERE debt_id IN (SELECT id FROM ln_debt WHERE owner_id=?)")
            remove("DELETE FROM ln_business_transaction WHERE owner_id=?")
            remove("DELETE FROM ln_business WHERE owner_id=?")
            remove("DELETE FROM ln_debt WHERE owner_id=?")
            remove("DELETE FROM ln_recovery_challenge WHERE user_id=?")
            remove("DELETE FROM ln_recovery_contact WHERE user_id=?")
            // Optional audit table from the identifier-reuse patch. Remove personal
            // identifier history too; FK errors deliberately roll back the whole deletion.
            val history = c.createStatement().use { s ->
                s.executeQuery("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema() AND left(table_name,3)='ln_' AND table_name LIKE '%identifier%history%' AND column_name IN ('user_id','owner_id') AND udt_name='uuid'").use { r ->
                    buildList { while(r.next()) add(r.getString(1) to r.getString(2)) }
                }
            }
            history.forEach { (table,column) -> remove("DELETE FROM " + quoted(table) + " WHERE " + quoted(column) + "=?") }
            remove("DELETE FROM ln_user WHERE id=?")
            c.prepareStatement("DELETE FROM ln_identifier_registry WHERE username=? AND NOT EXISTS (SELECT 1 FROM ln_user WHERE username=?)").use { s ->
                s.setString(1,row.first);s.setString(2,row.first);s.executeUpdate()
            }
            true
        }
        return DeleteAccountResult("Your account and its live application records have been permanently deleted.")
    }
}
