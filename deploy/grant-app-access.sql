-- Run as wedding_owner after restoring the database or applying migrations.
GRANT CONNECT ON DATABASE wedding_site TO wedding_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM wedding_app;
GRANT USAGE ON SCHEMA public TO wedding_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO wedding_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO wedding_app;
REVOKE INSERT,UPDATE,DELETE ON schema_migrations FROM wedding_app;
