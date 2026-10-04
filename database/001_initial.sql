-- Foundation for PostgreSQL. Apply only to a new database.
BEGIN;
CREATE TABLE households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  primary_email text,
  primary_phone text,
  invitation_token_hash text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  first_name text NOT NULL,
  last_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  sms_opted_in_at timestamptz,
  sms_opted_out_at timestamptz
);
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  time_zone text, -- Set the actual venue's IANA timezone before publishing times.
  time_note text,
  venue text,
  address text,
  description text,
  dress_code text,
  instructions text,
  rsvp_deadline timestamptz,
  archived_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE guest_event_invitations (
  guest_id uuid REFERENCES guests(id),
  event_id uuid REFERENCES events(id),
  PRIMARY KEY (guest_id, event_id)
);
CREATE TABLE rsvps (
  guest_id uuid NOT NULL,
  event_id uuid NOT NULL,
  attending boolean NOT NULL,
  dietary_requirements text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guest_id, event_id),
  FOREIGN KEY (guest_id, event_id) REFERENCES guest_event_invitations(guest_id, event_id)
);
CREATE TABLE event_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id),
  changed_by text NOT NULL,
  previous_details jsonb NOT NULL,
  new_details jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX guests_household_idx ON guests(household_id);
CREATE INDEX invitations_event_idx ON guest_event_invitations(event_id);
INSERT INTO events (slug, name, event_date, time_note) VALUES
('kasar', 'Kasar', '2027-02-01', 'Morning'),
('mehendi', 'Mehendi', '2027-02-01', NULL),
('vajan', 'Vajan', '2027-02-02', NULL),
('wedding', 'Wedding', '2027-02-03', NULL),
('reception', 'Reception', '2027-02-05', NULL),
('helping', 'Helping the Less Fortunate', '2027-02-06', NULL);
COMMIT;
