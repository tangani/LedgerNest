package ledgernest.services

import io.micronaut.json.JsonMapper
import io.micronaut.json.tree.JsonNode
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class TwilioVerifyResponsesTest {
    private val mapper = JsonMapper.createDefault()
    private val sid = "VE" + "a".repeat(32)
    private fun response(body: String): JsonNode = mapper.readValue(body, JsonNode::class.java)

    @Test fun `pending SMS response yields a usable verification SID`() {
        assertEquals(sid, TwilioVerifyResponses.pendingSid(response(
            """{"sid":"$sid","channel":"sms","status":"pending"}"""
        )))
    }

    @Test fun `send failure or wrong channel cannot create a usable challenge`() {
        for (body in listOf(
            """{"sid":"$sid","channel":"sms","status":"failed"}""",
            """{"sid":"$sid","channel":"email","status":"pending"}""",
            """{"sid":"bad","channel":"sms","status":"pending"}""",
            """{"channel":"sms","status":"pending"}"""
        )) {
            assertThrows(IllegalStateException::class.java) {
                TwilioVerifyResponses.pendingSid(response(body))
            }
        }
    }

    @Test fun `only approval for the expected SMS verification is accepted`() {
        assertTrue(TwilioVerifyResponses.approved(response(
            """{"sid":"$sid","channel":"sms","status":"approved","valid":true}"""
        ), sid))
        for (status in listOf("pending", "canceled", "expired", "failed", "max_attempts_reached")) {
            assertFalse(TwilioVerifyResponses.approved(response(
                """{"sid":"$sid","channel":"sms","status":"$status","valid":true}"""
            ), sid))
        }
        assertFalse(TwilioVerifyResponses.approved(response(
            """{"sid":"VE${"b".repeat(32)}","channel":"sms","status":"approved"}"""
        ), sid))
        assertFalse(TwilioVerifyResponses.approved(response(
            """{"sid":"$sid","channel":"email","status":"approved"}"""
        ), sid))
        assertFalse(TwilioVerifyResponses.approved(response("{}"), sid))
    }
}
