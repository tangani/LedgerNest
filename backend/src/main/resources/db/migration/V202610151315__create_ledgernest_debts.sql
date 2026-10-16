CREATE TABLE ln_debt (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    person VARCHAR(100) NOT NULL CHECK (length(trim(person)) > 0),
    purpose VARCHAR(160) NOT NULL DEFAULT '',
    direction VARCHAR(16) NOT NULL CHECK (direction IN ('receivable', 'payable')),
    currency CHAR(3) NOT NULL CHECK (currency IN ('ZAR', 'USD')),
    principal BIGINT NOT NULL CHECK (principal BETWEEN 1 AND 100000000000),
    due DATE,
    notes VARCHAR(2000) NOT NULL DEFAULT '',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ln_debt_owner_created ON ln_debt (owner_id, created_at DESC, id);
CREATE TABLE ln_repayment (
    id UUID PRIMARY KEY,
    debt_id UUID NOT NULL REFERENCES ln_debt(id),
    amount BIGINT NOT NULL CHECK (amount BETWEEN 1 AND 100000000000),
    payment_date DATE NOT NULL,
    notes VARCHAR(2000) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ln_repayment_debt ON ln_repayment (debt_id, payment_date DESC);
