# English and Nepali invitations

This update adds an English/नेपाली toggle to guest-facing pages and a default invitation language per household. The admin dashboard remains in English.

## Install

Copy the update files into your existing project, keeping `.env.local` and photos. Then run:

```bash
npm install
npm run db:migrate
npm run dev
```

The new migration adds language preferences and translation fields without replacing invitation tokens or deleting RSVPs. Existing households default to English. The package includes the prior email/Messenger updates if those have not yet been installed.

## Set a household to Nepali

1. Open Admin → Guests.
2. Open the household's Contact details & preferred method.
3. Set Default invitation language to नेपाली (Nepali) and save.
4. Optionally enter the household name in Nepali. Each guest's invitation settings also have optional Nepali name fields.
5. Prepare the invitation message again. It is now written in Nepali and lists only the family's invited events.
6. Open the original private invitation link in a private browser window. It opens directly in Nepali, including dates, RSVP choices, dietary labels, buttons, confirmation and validation text. The guest does not need to operate the toggle.

The link itself does not change when you change the default language. Existing links remain valid. Changing language does not reset responses or generate new tokens. Manual sharing indicators are tracked separately per link, channel and language, so an earlier English share is not mistaken for a Nepali share.

## How the toggle behaves

- Public website: English by default. Visitors can choose नेपाली; their public-site choice is remembered using a language cookie.
- Private invitation: the household's default language wins over the general public-site cookie. A prior English website visit will not force a Nepali-default household to read English.
- Guests can explicitly choose English or नेपाली on their invitation. The resulting URL includes ?lang=en or ?lang=ne. Keep that URL to return to the explicit choice; reopening the original unqualified private link uses the household default.
- Navigating from the invitation to the homepage carries the selected language.
- Language changes do not affect household authorization or RSVP identifiers.

Dates remain Gregorian dates, displayed using Nepali month names and numerals in Nepali mode. They are not converted to Bikram Sambat. Event clock times are Nepal local time.

## Edit Nepali event details

Admin → Events has a Nepali event details fieldset for event name, time note, venue, address, description, dress code and guest instructions. The six current event names and the initial Kasar morning note are seeded in Nepali; review the wording and spellings before sending invitations.

Custom details are not machine-translated. Enter both English and Nepali versions when updating them. Venue names and addresses fall back to the original proper names if a Nepali version is absent. English-only descriptions/instructions/dress codes are not silently shown as Nepali: the guest sees a Nepali message asking them to contact you for details that still need translation.

Guest and household names also fall back to the original name if no Nepali spelling is supplied. Dietary notes entered in Nepali are saved exactly as entered.

## Email language

Each draft snapshots the household's language alongside its recipient address. Supply the Nepali subject and message in Admin → Messages when any selected recipients use Nepali. Both versions have previews, and each recipient's language is listed before approval.

Approval is blocked if Nepali recipients have no Nepali subject or body. The greeting, signature and invitation button use that recipient's language. Private links use the household default; public website links in update emails include an explicit language.

If a household's language changes after a draft was reviewed, the sender skips that recipient instead of sending the old language. Create a new draft and review it again. Existing English drafts remain English snapshots. No emails or texts are sent by this update.

## Check it

```bash
npm run test:language
npm run test:invitations
npm run test:sharing
npm run test:messages
npm run build
```

The tests use disposable PostgreSQL-compatible databases and simulated email providers. They cover default-language precedence, explicit switching, Gregorian date preservation, translated invitations and messages, Unicode RSVP notes, language-aware sharing records, required email translations and stale language snapshots. The live browser workflow and your local PostgreSQL connection should be verified after installation.
