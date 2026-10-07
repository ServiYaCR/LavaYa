# ServiYa Security Hardening Candidate — 2026-10-07

This is a candidate source tree, not the currently deployed production build.

Changes represented here:
- restrict authenticated profile updates to full_name, phone_whatsapp, role;
- remove anonymous/direct execution of internal SECURITY DEFINER functions;
- restrict public RPC execution and cross-provider active-job lookup;
- add DB-level order workflow guard;
- add admin read policy for verification documents;
- provider verification upload code stores Storage object paths instead of public URLs.

## Storage transition not yet applied to production
The live `verification-docs` bucket remains public until the deployed client is updated. After the updated client is deployed and existing DB values are converted from public URLs to object paths, change the bucket to Private using the Supabase Storage API/Dashboard. Do not mutate `storage.buckets` directly with SQL.

Private-bucket reads should use authenticated download or short-lived signed URLs. Existing six verification images must not be deleted during the transition.


## Private Storage migration update

The hardened candidate now uses dedicated `face_photo_path` and `cedula_photo_path` columns. It does **not** repurpose the legacy `*_url` columns. Migrations 019 and 020 add/backfill/reconcile those path fields against `storage.objects`. Keep the legacy URL columns until the bucket has been switched to Private and the cutover has been verified; then they can be nulled/retired in a later migration.

## Migration 021 live alignment
`migration_021_sync_verification_paths_on_provider_write.sql` is now aligned to the intended live definition: it auto-fills missing verification paths from `storage.objects`, requires each non-null path to belong to the Provider's UUID folder, and requires the referenced Storage object to exist. Direct execution is revoked from public/anon/authenticated; the function is used by the Provider-profile trigger.
