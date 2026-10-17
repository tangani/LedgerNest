package ledgernest.controllers

import io.micronaut.context.annotation.Requires
import io.micronaut.http.annotation.*
import io.micronaut.scheduling.TaskExecutors
import io.micronaut.scheduling.annotation.ExecuteOn
import io.micronaut.security.annotation.Secured
import io.micronaut.security.authentication.Authentication
import io.micronaut.security.rules.SecurityRule
import ledgernest.models.*
import ledgernest.services.AuthenticatedOwner
import ledgernest.services.RecoveryService

@Controller("/api/v1/auth/recovery")
@Requires(env = ["ledgerlocal", "prod"])
@ExecuteOn(TaskExecutors.BLOCKING)
class RecoveryController(private val service:RecoveryService,private val owners:AuthenticatedOwner) {
    @Get("/status") @Secured(SecurityRule.IS_AUTHENTICATED)
    fun status(authentication:Authentication)=service.status(owners.id(authentication))
    @Post("/enroll") @Secured(SecurityRule.IS_AUTHENTICATED)
    fun enroll(authentication:Authentication,@Body input:RecoveryEnrollInput)=service.enroll(owners.id(authentication),input)
    @Post("/start") @Secured(SecurityRule.IS_ANONYMOUS)
    fun start(@Body input:RecoveryStartInput)=service.start(input)
    @Post("/finish") @Secured(SecurityRule.IS_ANONYMOUS)
    fun finish(@Body input:RecoveryFinishInput)=service.finish(input)
}
