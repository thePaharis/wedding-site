# AWS Lightsail deployment

This package prepares the current Next.js 16 site to run on a Lightsail Linux server with PostgreSQL and a Caddy HTTPS proxy. No AWS resources have been created. The website is not deployed yet.

## Hosting decision

AWS's current Amplify documentation lists support through Next.js 15. This application uses 16.3.6, so the deployment uses the standard Next.js standalone Node container instead of relying on an undocumented Amplify version combination.

You chose the lower-cost server route. AWS currently lists 2 GB Linux/IPv4 instances at $12/month and 4 GB at $24/month, before backups, overages, taxes and other services. A 4 GB instance gives more headroom if building images on the server; a 2 GB instance is a leaner option when using images built elsewhere. Both are single-server deployments: you maintain the OS, Docker, database and backups. No load balancer, NAT gateway or RDS is needed for this layout.

References checked during preparation:
- https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- https://aws.amazon.com/lightsail/pricing/
- https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html

## First actions in AWS

1. Create a Lightsail Linux/Unix instance, using the OS-only Ubuntu 24 blueprint. Choose a Region deliberately; US East (N. Virginia) aligns with the earlier SES examples.
2. Choose the 4 GB IPv4 plan if building on the server, or the 2 GB plan if using prebuilt images. Check the displayed price before creating it.
3. Attach a Lightsail static IPv4 address to that instance. Keep it attached.
4. In the Lightsail firewall, allow public HTTP (80) and HTTPS (443). Restrict SSH (22) to your IP or use the Lightsail browser SSH option. Do not open 3000 or 5432.
5. Enable automatic instance snapshots with their additional cost understood. Database dumps and a tested restore are needed as well; a Docker volume alone is not an off-server backup.

Docker Engine with the Compose plugin must be installed on the Ubuntu server. Follow Docker's current official Ubuntu instructions: https://docs.docker.com/engine/install/ubuntu/ . Do not put AWS root credentials on the server. Keep Docker and OS security updates maintained.

## Preserve existing data and invitation keys

On your computer, run this in pgAdmin's Query Tool to find the local PostgreSQL major version:

```sql
SELECT current_setting('server_version_num')::int / 10000 AS major_version;
```

Use the same major for the server's PostgreSQL image. The setup script requires this value rather than guessing it. PostgreSQL 18 and later use a different Docker volume mount; the script chooses the matching layout.

Ensure your existing INVITATION_ENCRYPTION_KEY is present in your private local `.env.local`. Preserve the same key used to create encrypted invitation links. Do not generate a replacement just for deployment.

Generate the private deployment files locally (replace 18 with the result of the query above):

```bash
npm run deploy:configure -- --domain nischalandbhumika.com --postgres-version 18
```

This creates four files, refusing to overwrite any existing ones:
- `.env.postgres.local`: database owner and application role setup credentials;
- `.env.production.local`: website runtime configuration and the limited application database login;
- `.env.migrations.local`: migration/maintenance database login;
- `.env.compose.local`: PostgreSQL image version and matching data-volume directory.

Generated passwords are random and are not printed. Files are ignored by Git and excluded from Docker builds. On Unix they are created with owner-only permissions; on Windows keep them in your private user directory and transfer them securely. The invitation encryption key is copied unchanged. Email sending stays disabled.

The website uses a dedicated wedding_app role with table data permissions. Migration scripts use wedding_owner. The database is reachable only over the private Docker backend network; its port is not published.

## Prepare a database backup

In local pgAdmin, create a Custom-format backup of wedding_site. Exclude object ownership and privileges when configuring the backup, and preserve the entire schema/data, including households, admin accounts, invitation hashes, encrypted tokens, RSVPs and schema_migrations.

Keep a copy of the original backup. Transfer it securely to `backups/local-wedding.dump` inside the server project directory. Stop making local guest/RSVP changes while taking the final backup and moving it, so the data does not diverge.

## Transfer source and build on the server

Put the latest project source, including public/photos, on the server through your repository or a source archive. This deployment update archive is not a complete repository and does not include your photos. Transfer the four private deployment files separately over SSH/SFTP. Do not commit them.

From the project directory on the server, every Compose command uses the explicit private version file:

```bash
docker compose --env-file .env.compose.local -f compose.production.yml config --quiet
docker compose --env-file .env.compose.local -f compose.production.yml build web tools
```

Docker builds cannot see `.env*` files. The web image contains only standalone runtime output, static files and photos, and runs as the unprivileged node user. The separate tools image contains the migration/maintenance scripts.

## Restore onto the fresh server database

Start only the database first:

```bash
docker compose --env-file .env.compose.local -f compose.production.yml up -d db
```

Wait until it is healthy. This initializes the database and application role, but does not create the wedding tables. Restore only into this fresh, empty server database:

```bash
docker compose --env-file .env.compose.local -f compose.production.yml exec -T db pg_restore --single-transaction --exit-on-error --no-owner --no-acl -U wedding_owner -d wedding_site < backups/local-wedding.dump
```

This command does not delete or overwrite existing tables. If the destination already contains wedding data, stop and plan the restore rather than adding destructive restore options. A failed restore rolls back the transaction. Keep the original local database and backup intact.

Apply any missing migrations, then grant access to restored tables:

```bash
docker compose --env-file .env.compose.local -f compose.production.yml run --rm tools node scripts/migrate.mjs
docker compose --env-file .env.compose.local -f compose.production.yml exec -T db psql -v ON_ERROR_STOP=1 -U wedding_owner -d wedding_site < deploy/grant-app-access.sql
docker compose --env-file .env.compose.local -f compose.production.yml run --rm tools node scripts/deploy-check.mjs --database
```

The restored admin login should still work. Do not recreate accounts or invitation tokens unless you intentionally want to replace them.

## Domain and HTTPS

At your current DNS provider, point the A records for both nischalandbhumika.com and www.nischalandbhumika.com to the attached static IPv4 address. Remove conflicting records for those exact hostnames only after reviewing the existing DNS. You do not have to move domain registration to Route 53. Verify both names resolve correctly before starting Caddy, including checking that any existing AAAA records do not send IPv6 visitors to an old server.

Start the website and HTTPS proxy:

```bash
docker compose --env-file .env.compose.local -f compose.production.yml up -d web proxy
```

Caddy obtains certificates and redirects www to the main HTTPS domain. Keep ports 80/443 reachable for certificate validation and renewals. Caddy keeps its certificate state in persistent Docker volumes.

Check:
- https://nischalandbhumika.com/api/health returns status ok;
- https://nischalandbhumika.com/api/ready returns status ready;
- admin sign-in works over HTTPS;
- a restored private invitation opens from a different phone/network;
- a Nepali-default household opens directly in Nepali;
- an RSVP save appears in the admin dashboard;
- creating a Messenger message uses the live domain.

Do not send guest links until those checks pass. Readiness checks use real migration history; they return generic status only and never reveal database credentials.

## Backups and maintenance

On the server, take a database dump:

```bash
npm run deploy:backup
```

This streams pg_dump from the database container into an owner-readable backup file. It includes invitation/RSVP data and admin password hashes, so keep it private. Interrupted files keep a .partial suffix. Copy completed dumps securely off the server and test restoring one into an isolated database. Keep snapshots and make fresh dumps regularly while guest responses are changing.

A database volume persists through container replacement. Do not remove Docker volumes during updates; that removes the stored database. Back up before updates or schema changes. The PostgreSQL major version must not be changed without a deliberate upgrade plan.

## Email and SMS

Keep EMAIL_SENDING_ENABLED=false until the live site passes checks and SES is configured. The email profile is optional and does not start with the web service. Credentials needed only by the email worker can go into `.env.email.local`; that file is not used by the web or proxy services. Enabling reviewed sends still requires the runtime sending flag and the separate worker command.

Automatic SMS is not implemented. Messenger copy/mark-as-sent continues to work with no provider connection. Cognito/MFA integration remains a separate enhancement; this package preserves the current password-protected admin login and secure production cookies.

## Remote database option

If you later move PostgreSQL to RDS, remote connections require verified TLS. Set DATABASE_SSL_MODE=verify-full and mount the appropriate public RDS CA bundle through DATABASE_SSL_CA_FILE if needed. Insecure remote SSL modes are rejected. Local development and the isolated db Docker service keep working without TLS.

## Validation and limits

The production Next.js standalone build, database configuration tests, standalone health/Nepali-page HTTP checks, environment-file generation and safe-overwrite tests are checked locally. Compose YAML is parsed and the database port is not published. Docker image builds, the restore, DNS, certificates and AWS networking must be verified on your server; Docker is not available in this workspace. No AWS resource, domain record, billable server or automatic sender has been created.
