CREATE TABLE ln_identifier_registry (
    username VARCHAR(254) PRIMARY KEY,
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE ln_user (
    id UUID PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL CHECK (length(trim(first_name)) > 0),
    surname VARCHAR(100) NOT NULL CHECK (length(trim(surname)) > 0),
    username VARCHAR(254) NOT NULL UNIQUE REFERENCES ln_identifier_registry(username),
    identifier_type VARCHAR(10) NOT NULL CHECK (identifier_type IN ('email', 'phone', 'handle')),
    password_hash VARCHAR(512) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Previous identifiers stay reserved after a change, but cannot be used to log in.
-- Legacy financial records keep their old owner IDs; signup never claims them.
