package ledgernest.repositories

class DuplicateRepaymentException(cause: Throwable) : RuntimeException("Repayment ID already exists.", cause)
