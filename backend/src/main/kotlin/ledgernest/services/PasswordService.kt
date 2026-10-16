package ledgernest.services

import jakarta.inject.Singleton
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

@Singleton
class PasswordService {
    private val iterations = 600_000
    private val random = SecureRandom()
    private fun derive(password: String, salt: ByteArray, rounds: Int): ByteArray {
        val spec = PBEKeySpec(password.toCharArray(), salt, rounds, 256)
        return try { SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded }
        finally { spec.clearPassword() }
    }
    fun hash(password: String): String {
        val salt = ByteArray(16).also { random.nextBytes(it) }
        val encoder = Base64.getEncoder()
        return listOf("pbkdf2-sha256", iterations.toString(), encoder.encodeToString(salt), encoder.encodeToString(derive(password, salt, iterations))).joinToString(":")
    }
    fun verify(password: String, encoded: String): Boolean {
        return try {
            val parts = encoded.split(":")
            if (parts.size != 4 || parts[0] != "pbkdf2-sha256") return false
            val rounds = parts[1].toInt()
            if (rounds !in 600_000..2_000_000) return false
            val salt = Base64.getDecoder().decode(parts[2])
            val expected = Base64.getDecoder().decode(parts[3])
            if (salt.size != 16 || expected.size != 32) return false
            MessageDigest.isEqual(expected, derive(password, salt, rounds))
        } catch (_: IllegalArgumentException) { false }
    }
}
