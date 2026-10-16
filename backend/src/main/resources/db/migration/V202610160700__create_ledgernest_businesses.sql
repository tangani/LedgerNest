CREATE TABLE ln_business (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
    description VARCHAR(2000) NOT NULL DEFAULT '',
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('ZAR', 'USD')),
    version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id, owner_id)
);
CREATE INDEX ln_business_owner_created_idx ON ln_business(owner_id, created_at DESC, id);

-- Each transaction belongs to the same owner as its parent business.
-- Totals are derived; there are no independently editable balance columns.
CREATE TABLE ln_business_transaction (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('contribution', 'capital_return')),
    amount BIGINT NOT NULL CHECK (amount BETWEEN 1 AND 100000000000),
    transaction_date DATE NOT NULL,
    notes VARCHAR(2000) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (business_id, owner_id) REFERENCES ln_business(id, owner_id)
);
CREATE INDEX ln_business_transaction_history_idx
    ON ln_business_transaction(business_id, owner_id, transaction_date DESC, created_at DESC, id);
