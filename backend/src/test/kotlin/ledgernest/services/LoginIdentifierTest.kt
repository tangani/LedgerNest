package ledgernest.services

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class LoginIdentifierTest {
    private val identifiers = LoginIdentifier()
    @Test fun `SA and Zimbabwe phone formatting is canonical`() {
        assertEquals(CanonicalIdentifier("+27821234567", "phone"), identifiers.parse("+27 82 123 4567"))
        assertEquals(CanonicalIdentifier("+263771234567", "phone"), identifiers.parse("+263 77 123 4567"))
        assertNull(identifiers.parse("0821234567"))
        assertNull(identifiers.parse("0771234567"))
    }
    @Test fun `identifiers follow explicit case and syntax policy`() {
        assertEquals(CanonicalIdentifier("molisa", "handle"), identifiers.parse(" Molisa "))
        assertEquals(CanonicalIdentifier("name+tag@example.com", "email"), identifiers.parse("Name+tag@Example.com"))
        assertNull(identifiers.parse("12345"))
        assertNull(identifiers.parse("bad handle"))
        assertNull(identifiers.parse("a@"))
    }
    @Test fun `salted password hashes validate without accepting wrong passwords`() {
        val service = PasswordService()
        val password = "a sufficiently long test password"
        val first = service.hash(password)
        assertNotEquals(first, service.hash(password))
        assertTrue(service.verify(password, first))
        assertFalse(service.verify("wrong", first))
        assertFalse(service.verify(password, "broken"))
    }
}
