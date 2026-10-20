-- New writes must have a live account. NOT VALID preserves legacy orphan rows
-- while still enforcing the foreign keys on new inserts and updates.
ALTER TABLE ln_debt ADD CONSTRAINT ln_debt_account_owner_fk FOREIGN KEY (owner_id) REFERENCES ln_user(id) NOT VALID;
ALTER TABLE ln_business ADD CONSTRAINT ln_business_account_owner_fk FOREIGN KEY (owner_id) REFERENCES ln_user(id) NOT VALID;
ALTER TABLE ln_business_transaction ADD CONSTRAINT ln_business_transaction_account_owner_fk FOREIGN KEY (owner_id) REFERENCES ln_user(id) NOT VALID;
