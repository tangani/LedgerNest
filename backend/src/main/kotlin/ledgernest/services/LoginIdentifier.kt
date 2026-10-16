package ledgernest.services

import com.google.i18n.phonenumbers.PhoneNumberUtil
import com.google.i18n.phonenumbers.NumberParseException
import jakarta.inject.Singleton
import java.util.Locale

data class CanonicalIdentifier(val value: String, val type: String)

@Singleton
class LoginIdentifier {
    private val phones = PhoneNumberUtil.getInstance()
    fun parse(raw: String): CanonicalIdentifier? {
        val value = raw.trim()
        if (value.length !in 3..254) return null
        if (value.startsWith("+")) {
            if (!Regex("""^\+[0-9 ()-]+$""").matches(value)) return null
            return try {
                val phone = phones.parse(value, "ZZ")
                if (phone.hasExtension() || !phones.isValidNumber(phone)) null
                else CanonicalIdentifier(phones.format(phone, PhoneNumberUtil.PhoneNumberFormat.E164), "phone")
            } catch (_: NumberParseException) { null }
        }
        if (value.contains('@')) {
            // Intentional case-insensitive login policy; no provider-specific dot/plus rewriting.
            if (!Regex("""^[^@\s]+@[^@\s]+\.[^@\s]+$""").matches(value)) return null
            return CanonicalIdentifier(value.lowercase(Locale.ROOT), "email")
        }
        // Names can be international Unicode; login handles use a small unambiguous alphabet.
        if (!Regex("^[A-Za-z][A-Za-z0-9_.-]{2,29}$").matches(value)) return null
        return CanonicalIdentifier(value.lowercase(Locale.ROOT), "handle")
    }
}
