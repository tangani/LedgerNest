package ledgernest.controllers

import io.micronaut.context.annotation.Requires
import io.micronaut.http.HttpRequest
import io.micronaut.http.HttpResponse
import io.micronaut.http.HttpStatus
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.Put
import ledgernest.models.ChangeUsernameInput
import io.micronaut.http.exceptions.HttpStatusException
import io.micronaut.scheduling.TaskExecutors
import io.micronaut.scheduling.annotation.ExecuteOn
import io.micronaut.security.annotation.Secured
import io.micronaut.security.authentication.Authentication
import io.micronaut.security.rules.SecurityRule
import ledgernest.models.RegisterInput
import ledgernest.models.UserResponse
import ledgernest.services.AuthService
import ledgernest.services.AuthRateLimiter
import ledgernest.services.AuthenticatedOwner

@Controller("/api/v1/auth")
@Requires(env = ["ledgerlocal", "prod"])
@ExecuteOn(TaskExecutors.BLOCKING)
class AuthController(private val service: AuthService, private val owners: AuthenticatedOwner, private val limits: AuthRateLimiter) {
    @Post("/register")
    @Secured(SecurityRule.IS_ANONYMOUS)
    fun register(@Body input: RegisterInput, request: HttpRequest<*>): HttpResponse<UserResponse> {
        val ip = request.remoteAddress.address.hostAddress
        if (!limits.allow("register:$ip", 5)) throw HttpStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Wait a minute and try again.")
        return HttpResponse.created(service.register(input))
    }
    @Get("/me")
    @Secured(SecurityRule.IS_AUTHENTICATED)
    fun me(authentication: Authentication): UserResponse = service.me(owners.id(authentication))
    @Put("/username")
    @Secured(SecurityRule.IS_AUTHENTICATED)
    fun changeUsername(authentication: Authentication, @Body input: ChangeUsernameInput): UserResponse {
        val id = owners.id(authentication)
        if (!limits.allow("change-username:$id", 5)) throw HttpStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Wait a minute and try again.")
        return service.changeUsername(id, input)
    }
}
