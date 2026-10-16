package ledgernest.controllers

import ledgernest.models.DebtInput
import ledgernest.models.DebtResponse
import ledgernest.models.RepaymentInput
import ledgernest.services.DebtService

import io.micronaut.context.annotation.Requires
import io.micronaut.http.HttpResponse
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.PathVariable
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.Put
import io.micronaut.http.annotation.QueryValue
import io.micronaut.scheduling.TaskExecutors
import io.micronaut.scheduling.annotation.ExecuteOn
import java.net.URI
import java.util.UUID
import io.micronaut.security.annotation.Secured
import io.micronaut.security.authentication.Authentication
import io.micronaut.security.rules.SecurityRule
import ledgernest.services.AuthenticatedOwner

@Secured(SecurityRule.IS_AUTHENTICATED)
@Controller("/api/v1/debts")
@Requires(env = ["ledgerlocal", "prod"])
@ExecuteOn(TaskExecutors.BLOCKING)
class DebtController(private val service: DebtService, private val owners: AuthenticatedOwner) {
    @Get
    fun list(authentication: Authentication, @QueryValue(defaultValue = "50") limit: Int, @QueryValue(defaultValue = "0") offset: Int): List<DebtResponse> {
        return service.list(owners.id(authentication), limit, offset)
    }

    @Get("/{id}")
    fun get(authentication: Authentication, @PathVariable id: UUID): DebtResponse = service.get(owners.id(authentication), id)

    @Post
    fun create(authentication: Authentication, @Body input: DebtInput): HttpResponse<DebtResponse> {
        val debt = service.create(owners.id(authentication), input)
        return HttpResponse.created(debt, URI.create("/api/v1/debts/${debt.id}"))
    }

    @Put("/{id}")
    fun update(authentication: Authentication, @PathVariable id: UUID, @Body input: DebtInput): DebtResponse = service.update(owners.id(authentication), id, input)

    @Post("/{id}/repayments")
    fun repay(authentication: Authentication, @PathVariable id: UUID, @Body input: RepaymentInput): DebtResponse = service.repay(owners.id(authentication), id, input)
}
