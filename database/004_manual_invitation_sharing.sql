ALTER TABLE households ADD COLUMN preferred_contact_method text NOT NULL DEFAULT 'unspecified'
 CHECK (preferred_contact_method IN ('unspecified','email','sms','messenger'));
CREATE TABLE invitation_manual_shares (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 household_id uuid NOT NULL REFERENCES households(id),
 invitation_token_hash text NOT NULL,
 channel text NOT NULL CHECK (channel IN ('messenger','sms','email')),
 shared_by text NOT NULL,
 shared_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (household_id,invitation_token_hash,channel)
);
CREATE INDEX invitation_manual_shares_household_idx ON invitation_manual_shares(household_id);
