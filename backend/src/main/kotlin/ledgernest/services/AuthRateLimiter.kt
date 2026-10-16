package ledgernest.services

import jakarta.inject.Singleton

/** Single-process development throttle. Replace with shared edge/server limits before scaling. */
@Singleton
class AuthRateLimiter {
    private data class Bucket(var start: Long, var count: Int)
    private val buckets = mutableMapOf<String, Bucket>()
    @Synchronized
    fun allow(key: String, limit: Int): Boolean {
        val now = System.currentTimeMillis()
        buckets.entries.removeIf { now - it.value.start >= 60_000 }
        val bucket = buckets[key] ?: run {
            if (buckets.size >= 10_000) return false
            Bucket(now, 0).also { buckets[key] = it }
        }
        bucket.count++
        return bucket.count <= limit
    }
}
