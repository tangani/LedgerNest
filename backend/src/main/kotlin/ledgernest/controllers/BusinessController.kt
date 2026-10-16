package ledgernest.controllers

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
import ledgernest.models.BusinessInput
import ledgernest.models.BusinessResponse
import ledgernest.models.BusinessTransactionInput
import ledgernest.services.BusinessService
import java.net.URI
import java.util.UUID
import io.micronaut.security.annotation.Secured
import io.micronaut.security.authentication.Authentication
import io.micronaut.security.rules.SecurityRule
import ledgernest.services.AuthenticatedOwner

@Secured(SecurityRule.IS_AUTHENTICATED)
@Controller("/api/v1/businesses")
@Requires(env = ["ledgerlocal", "prod"])
@ExecuteOn(TaskExecutors.BLOCKING)
class BusinessController(private val service: BusinessService, private val owners: AuthenticatedOwner) {
    @Get
    fun list(authentication: Authentication, @QueryValue(defaultValue = "50") limit: Int, @QueryValue(defaultValue = "0") offset: Int): List<BusinessResponse> =
        service.list(owners.id(authentication), limit, offset)

    @Get("/{id}")
    fun get(authentication: Authentication, @PathVariable id: UUID): BusinessResponse = service.get(owners.id(authentication), id)

    @Post
    fun create(authentication: Authentication, @Body input: BusinessInput): HttpResponse<BusinessResponse> {
        val business = service.create(owners.id(authentication), input)
        return HttpResponse.created(business, URI.create("/api/v1/businesses/${business.id}"))
    }

    @Put("/{id}")
    fun update(authentication: Authentication, @PathVariable id: UUID, @Body input: BusinessInput): BusinessResponse = service.update(owners.id(authentication), id, input)

    @Post("/{id}/transactions")
    fun transact(authentication: Authentication, @PathVariable id: UUID, @Body input: BusinessTransactionInput): BusinessResponse = service.transact(owners.id(authentication), id, input)
}
