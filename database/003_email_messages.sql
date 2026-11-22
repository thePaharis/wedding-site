ALTER TABLE households ADD COLUMN invitation_token_encrypted text;
CREATE TABLE email_campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 subject text NOT NULL,
 body text NOT NULL,
 kind text NOT NULL CHECK (kind IN ('invitation','update')),
 audience text NOT NULL CHECK (audience IN ('all','invited','attending','pending')),
 event_id uuid REFERENCES events(id),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','complete','cancelled')),
 created_by text NOT NULL,
 approved_by text,
 created_at timestamptz NOT NULL DEFAULT now(),
 approved_at timestamptz
);
CREATE TABLE email_recipients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 campaign_id uuid NOT NULL REFERENCES email_campaigns(id),
 household_id uuid NOT NULL REFERENCES households(id),
 household_name text NOT NULL,
 email text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','accepted','unknown','skipped')),
 provider_message_id text,
 status_note text,
 started_at timestamptz,
 finished_at timestamptz,
 UNIQUE(campaign_id,household_id),
 UNIQUE(campaign_id,email)
);
CREATE INDEX email_recipients_pending_idx ON email_recipients(campaign_id,status);
