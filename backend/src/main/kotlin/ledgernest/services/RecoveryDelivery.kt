package ledgernest.services

import io.micronaut.context.env.Environment
import io.micronaut.json.JsonMapper
import io.micronaut.json.tree.JsonNode
import jakarta.inject.Singleton
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.util.Base64
import java.util.UUID

@Singleton
class RecoveryDelivery(private val env: Environment, private val json: JsonMapper) {
    private val client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build()
    private fun config(key: String)=env.getProperty(key,String::class.java).filter { it.isNotBlank() }.orElseThrow { IllegalStateException("Recovery delivery configuration missing") }
    fun enabled(channel: String)=env.getProperty("recovery.$channel.enabled",Boolean::class.java).orElse(false)
    private fun send(url:String, authorization:String, contentType:String, body:String, key:String?=null): JsonNode {
        val builder=HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(20))
            .header("Authorization",authorization).header("Content-Type",contentType)
            .POST(HttpRequest.BodyPublishers.ofString(body))
        if(key!=null) builder.header("Idempotency-Key",key)
        val result=client.send(builder.build(),HttpResponse.BodyHandlers.ofString())
        // Never log provider response bodies, which can include addresses or credentials.
        if(result.statusCode() !in 200..299) throw IllegalStateException("Recovery provider returned HTTP ${result.statusCode()}")
        return json.readValue(result.body(), JsonNode::class.java)
            ?: throw IllegalStateException("Recovery provider returned an empty JSON response")
    }
    fun email(target:String,id:UUID,token:String,purpose:String) {
        val base=config("recovery.frontend-url").trimEnd('/')
        val uri=URI.create(base)
        require(uri.scheme=="https" || (uri.scheme=="http" && uri.host in listOf("localhost","127.0.0.1")))
        require(uri.rawQuery==null && uri.rawFragment==null)
        val link="$base/#recovery=$id&secret=$token&purpose=$purpose"
        val action=if(purpose=="reset") "reset your password" else "verify your recovery email"
        send("https://api.resend.com/emails","Bearer ${config("recovery.resend-key")}","application/json",
            json.writeValueAsString(mapOf("from" to config("recovery.email-from"),"to" to listOf(target),"subject" to "LedgerNest account recovery",
                "text" to "Open this link to $action:\n$link\n\nThis link expires in 10 minutes and can be used once. If you did not request it, ignore this email.")),id.toString())
    }
    private fun twilio(resource:String,fields:Map<String,String>):JsonNode {
        val service=config("recovery.twilio-service-sid")
        require(Regex("VA[0-9a-fA-F]{32}").matches(service))
        val account=config("recovery.twilio-account-sid")
        require(Regex("AC[0-9a-fA-F]{32}").matches(account))
        val credential="$account:${config("recovery.twilio-auth-token")}"
        val body=fields.entries.joinToString("&") { URLEncoder.encode(it.key,"UTF-8")+"="+URLEncoder.encode(it.value,"UTF-8") }
        return send("https://verify.twilio.com/v2/Services/$service/$resource","Basic "+Base64.getEncoder().encodeToString(credential.toByteArray()),"application/x-www-form-urlencoded",body)
    }
    fun sms(target:String):String = TwilioVerifyResponses.pendingSid(
        twilio("Verifications",mapOf("To" to target,"Channel" to "sms"))
    )
    fun check(sid:String,code:String):Boolean {
        require(Regex("VE[0-9a-fA-F]{32}").matches(sid))
        require(Regex("[0-9]{4,10}").matches(code))
        // Use the provider SID stored for this database challenge, never a browser-supplied number.
        return TwilioVerifyResponses.approved(
            twilio("VerificationCheck",mapOf("VerificationSid" to sid,"Code" to code)),sid
        )
    }
}

/** Accept only a usable SMS challenge and an approval for that exact provider SID. */
internal object TwilioVerifyResponses {
    fun pendingSid(response: JsonNode): String {
        val sid=response.get("sid")?.stringValue
        check(sid!=null && Regex("VE[0-9a-fA-F]{32}").matches(sid) &&
            response.get("channel")?.stringValue=="sms" &&
            response.get("status")?.stringValue=="pending") {
            "SMS verification could not be started"
        }
        return requireNotNull(sid)
    }
    fun approved(response: JsonNode, sid: String): Boolean =
        response.get("sid")?.stringValue==sid &&
        response.get("channel")?.stringValue=="sms" &&
        response.get("status")?.stringValue=="approved"
}
