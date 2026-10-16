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

@Controller("/api/v1/debts")
@Requires(env = ["ledgerlocal"])
@ExecuteOn(TaskExecutors.BLOCKING)
class DebtController(private val service: DebtService) {
    @Get
    fun list(@QueryValue(defaultValue = "50") limit: Int, @QueryValue(defaultValue = "0") offset: Int): List<DebtResponse> {
        return service.list(limit, offset)
    }

    @Get("/{id}")
    fun get(@PathVariable id: UUID): DebtResponse = service.get(id)

    @Post
    fun create(@Body input: DebtInput): HttpResponse<DebtResponse> {
        val debt = service.create(input)
        return HttpResponse.created(debt, URI.create("/api/v1/debts/${debt.id}"))
    }

    @Put("/{id}")
    fun update(@PathVariable id: UUID, @Body input: DebtInput): DebtResponse = service.update(id, input)

    @Post("/{id}/repayments")
    fun repay(@PathVariable id: UUID, @Body input: RepaymentInput): DebtResponse = service.repay(id, input)
}
