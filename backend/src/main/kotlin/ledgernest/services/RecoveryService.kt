package ledgernest.services

import io.micronaut.context.annotation.Requires
import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException
import jakarta.inject.Singleton
import ledgernest.models.*
import ledgernest.repositories.*
import org.slf4j.LoggerFactory
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.util.Base64
import java.util.UUID

@Singleton
@Requires(env = ["ledgerlocal", "prod"])
class RecoveryService(private val repo: RecoveryRepository,private val users: UserRepository,private val passwords: PasswordService,private val identifiers: LoginIdentifier,private val delivery: RecoveryDelivery) {
    private val log=LoggerFactory.getLogger(RecoveryService::class.java)
    private val random=SecureRandom()
    private fun digest(s:String)=MessageDigest.getInstance("SHA-256").digest(s.toByteArray()).joinToString("") { "%02x".format(it) }
    private fun bad():Nothing=throw HttpStatusException(HttpStatus.BAD_REQUEST,"This code or link is invalid, expired, or already used. Request a new one.")
    private fun limit(key:String,max:Int,seconds:Int) { if(!repo.allow(key,max,seconds)) throw HttpStatusException(HttpStatus.TOO_MANY_REQUESTS,"Too many attempts. Try again later.") }
    fun status(id:UUID):RecoveryStatus { val c=repo.contact(id);return RecoveryStatus(c!=null,c?.channel) }
    fun enroll(id:UUID,input:RecoveryEnrollInput):RecoveryChallengeResponse {
        limit("enroll:$id",5,3600)
        val user=users.findById(id) ?: bad()
        if(input.currentPassword.length !in 1..128 || !passwords.verify(input.currentPassword,user.passwordHash)) throw HttpStatusException(HttpStatus.BAD_REQUEST,"Current password is incorrect.")
        val target=identifiers.parse(input.target) ?: throw HttpStatusException(HttpStatus.BAD_REQUEST,"Enter a valid email or international phone number.")
        val channel=when(target.type){"email"->"email";"phone"->"sms";else->throw HttpStatusException(HttpStatus.BAD_REQUEST,"Recovery requires an email or phone number.")}
        if(!delivery.enabled(channel)) throw HttpStatusException(HttpStatus.SERVICE_UNAVAILABLE,"This recovery channel is not enabled yet.")
        limit("delivery:global",100,3600);limit("target:${digest(target.value)}",3,3600)
        val idChallenge=issue(user,target.value,channel,"enroll")
        return RecoveryChallengeResponse(idChallenge,if(channel=="sms") "Enter the SMS code to verify your recovery phone." else "Check your email link to verify your recovery email.")
    }
    fun start(input:RecoveryStartInput):RecoveryChallengeResponse {
        // Always the same public response and random challenge shape for ineligible accounts.
        val fake=RecoveryChallengeResponse(UUID.randomUUID())
        if(input.username.length>254 || input.channel !in listOf("email","sms")) return fake
        val username=identifiers.parse(input.username)?.value ?: return fake
        limit("request:global",300,3600)
        if(!repo.allow("request:${digest(username)}",3,3600)) return fake
        val user=users.findByUsername(username) ?: return fake
        val contact=repo.contact(user.id) ?: return fake
        if(contact.channel!=input.channel || !delivery.enabled(contact.channel)) return fake
        if(!repo.allow("target:${digest(contact.target)}",3,3600) || !repo.allow("delivery:global",100,3600)) return fake
        return try { RecoveryChallengeResponse(issue(user,contact.target,contact.channel,"reset")) }
        catch (_: Exception) { log.warn("Password recovery delivery failed; check provider configuration and delivery dashboard");fake }
    }
    private fun issue(user:StoredUser,target:String,channel:String,purpose:String):UUID {
        val id=UUID.randomUUID()
        val token=Base64.getUrlEncoder().withoutPadding().encodeToString(ByteArray(32).also(random::nextBytes))
        repo.create(RecoveryChallenge(id,user.id,purpose,target,channel,digest(token),user.authVersion,null,Instant.now().plusSeconds(600)))
        try {
            if(channel=="email") delivery.email(target,id,token,purpose) else repo.setSid(id,delivery.sms(target))
        } catch (problem: Exception) {
            log.warn(
                "Recovery delivery failed: challenge={}, channel={}, errorType={}",
                id,
                channel,
                problem.javaClass.simpleName
            )

            repo.cancel(id)

            throw HttpStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Could not send verification. Try again later."
            )
        }
        return id
    }
    fun finish(input:RecoveryFinishInput):RecoveryMessage {
        limit("finish:global",300,60)
        if(input.secret.length !in 1..128) bad()
        if(input.newPassword!=null && input.newPassword.length !in 15..128) throw HttpStatusException(HttpStatus.BAD_REQUEST,"Use a password of 15–128 characters.")
        val c=repo.attempt(input.id) ?: bad()
        if(c.purpose=="reset" && input.newPassword==null) bad()
        val valid=if(c.channel=="email") MessageDigest.isEqual(digest(input.secret).toByteArray(),c.tokenHash.toByteArray())
            else if(c.sid!=null && Regex("[0-9]{4,10}").matches(input.secret)) try { delivery.check(c.sid,input.secret) } catch (_:Exception){false} else false
        if(!valid) bad()
        val hash=if(c.purpose=="reset") passwords.hash(requireNotNull(input.newPassword)) else null
        val complete=try { repo.complete(c,hash) } catch (_:java.sql.SQLException) { false }
        if(!complete) bad()
        return RecoveryMessage(if(c.purpose=="reset") "Password changed. Sign in with your new password." else "Recovery contact verified. You can now use Forgot password.")
    }
}
