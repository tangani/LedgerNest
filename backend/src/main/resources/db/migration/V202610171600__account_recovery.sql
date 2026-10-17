ALTER TABLE ln_user ADD COLUMN auth_version BIGINT NOT NULL DEFAULT 0;
CREATE TABLE ln_recovery_contact (
 user_id UUID PRIMARY KEY REFERENCES ln_user(id),
 target VARCHAR(254) NOT NULL UNIQUE,
 channel VARCHAR(10) NOT NULL CHECK (channel IN ('email','sms')),
 verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE ln_recovery_challenge (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES ln_user(id),
 purpose VARCHAR(10) NOT NULL CHECK (purpose IN ('enroll','reset')),
 target VARCHAR(254) NOT NULL,
 channel VARCHAR(10) NOT NULL,
 token_hash VARCHAR(64) NOT NULL,
 auth_version BIGINT NOT NULL,
 provider_sid VARCHAR(64),
 expires_at TIMESTAMPTZ NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 consumed BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX ON ln_recovery_challenge(user_id);
CREATE TABLE ln_recovery_limit (
 bucket VARCHAR(100) PRIMARY KEY,
 window_start TIMESTAMPTZ NOT NULL,
 attempts INTEGER NOT NULL
);
-- Existing identifiers are deliberately NOT marked verified.
