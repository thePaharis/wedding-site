ALTER TABLE households ADD COLUMN preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','ne'));
ALTER TABLE households ADD COLUMN name_ne text;
ALTER TABLE guests ADD COLUMN first_name_ne text;
ALTER TABLE guests ADD COLUMN last_name_ne text;
ALTER TABLE events ADD COLUMN name_ne text;
ALTER TABLE events ADD COLUMN venue_ne text;
ALTER TABLE events ADD COLUMN address_ne text;
ALTER TABLE events ADD COLUMN description_ne text;
ALTER TABLE events ADD COLUMN dress_code_ne text;
ALTER TABLE events ADD COLUMN instructions_ne text;
ALTER TABLE events ADD COLUMN time_note_ne text;
UPDATE events SET name_ne=CASE slug
 WHEN 'kasar' THEN 'कसार' WHEN 'mehendi' THEN 'मेहन्दी' WHEN 'vajan' THEN 'भजन'
 WHEN 'wedding' THEN 'विवाह' WHEN 'reception' THEN 'स्वागत समारोह' WHEN 'helping' THEN 'सहयोग कार्यक्रम' END
 WHERE slug IN ('kasar','mehendi','vajan','wedding','reception','helping');
UPDATE events SET time_note_ne='बिहान' WHERE time_note='Morning';
ALTER TABLE email_campaigns ADD COLUMN subject_ne text;
ALTER TABLE email_campaigns ADD COLUMN body_ne text;
ALTER TABLE email_recipients ADD COLUMN language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','ne'));
ALTER TABLE invitation_manual_shares ADD COLUMN language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','ne'));
DO $$ DECLARE constraint_name text; BEGIN
 FOR constraint_name IN SELECT conname FROM pg_constraint WHERE conrelid='invitation_manual_shares'::regclass AND contype='u'
 LOOP EXECUTE format('ALTER TABLE invitation_manual_shares DROP CONSTRAINT %I',constraint_name); END LOOP;
END $$;
ALTER TABLE invitation_manual_shares ADD CONSTRAINT manual_shares_language_unique UNIQUE(household_id,invitation_token_hash,channel,language);
