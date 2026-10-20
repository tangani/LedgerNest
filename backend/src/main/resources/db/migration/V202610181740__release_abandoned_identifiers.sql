-- Keep current identifiers unique and reserved. Historical values are reusable.
-- Lock both tables against writes while removing pre-existing orphan reservations.
LOCK TABLE ln_user, ln_identifier_registry IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE ln_identifier_change_history (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES ln_user(id),
    old_username VARCHAR(254) NOT NULL,
    new_username VARCHAR(254) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ln_identifier_change_history_user_time
    ON ln_identifier_change_history(user_id, changed_at);

-- Preserve legacy reservation timestamps before freeing the values.
-- Their historical owners were never stored, so do not invent ownership.
CREATE TABLE ln_identifier_legacy_reservation_history (
    username VARCHAR(254) PRIMARY KEY,
    reserved_at TIMESTAMPTZ NOT NULL,
    released_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO ln_identifier_legacy_reservation_history(username, reserved_at)
SELECT r.username, r.reserved_at
FROM ln_identifier_registry r
WHERE NOT EXISTS (SELECT 1 FROM ln_user u WHERE u.username = r.username);

DELETE FROM ln_identifier_registry r
WHERE NOT EXISTS (SELECT 1 FROM ln_user u WHERE u.username = r.username);
