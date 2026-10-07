# ServiYa Post-Hardening DB Manifest — 2026-10-07

This is a non-secret recovery/DD manifest for the live ServiYa Supabase project after authorized security hardening.

## Live project status at verification
- Project status: ACTIVE_HEALTHY
- Region: us-east-1
- PostgreSQL major version: 17
- Plan: Free
- Edge Functions: none
- Development branches: none
- Realtime-published tables: none
- Vault secrets: 0
- Storage buckets: 1 (`verification-docs`)
- Storage objects in verification bucket: 6
- Active cron jobs: 1 (`servyia-pickup-reminders`)

## Hardening migration sequence
The live project records the following hardening operations, in order:
1. `restrict_profile_update_columns`
2. `restrict_internal_security_definer_execution`
3. `restrict_public_rpc_execution`
4. `guard_order_update_workflow`
5. `allow_admin_read_verification_docs`
6. `add_private_verification_paths`
7. `reconcile_verification_paths_from_storage`
8. `sync_verification_paths_on_provider_write`

During iterative hardening the live migration history contains two versions with the final name `sync_verification_paths_on_provider_write`; the later definition supersedes the earlier refinement. The SQL in `migration_021_sync_verification_paths_on_provider_write.sql` is the intended final definition.

## Verified security behavior
- Authenticated non-admin can update allowed profile fields but cannot update `is_admin`.
- Anonymous direct execution of SECURITY DEFINER functions: 0 advisor findings after hardening.
- Internal trigger/cron functions are not directly executable by anon/authenticated.
- Provider active-job count hides other Provider IDs.
- Customer valid cancel workflow passes; direct customer price tampering is rejected.
- Provider valid workflow transition passes; invalid price tampering is rejected.
- Admin Order and Provider-management operations remain available.
- `face_photo_path` / `cedula_photo_path` are dedicated path columns.
- Existing 3 Providers map to 3 face + 3 cédula Storage objects (6/6 path-object matches).
- Verification path auto-fill from Storage passes.
- Non-existent verification object paths are rejected.

## Storage cutover state
The live `verification-docs` bucket is still Public because the currently deployed Cloudflare client predates the hardened source. Do not represent this as final security state.

Safe cutover order:
1. Deploy the hardened client.
2. Verify new registrations write `face_photo_path` / `cedula_photo_path` and do not call `getPublicUrl()`.
3. Change `verification-docs` to Private using supported Supabase Storage controls.
4. Verify Provider authenticated access and Admin access.
5. Confirm old public URLs no longer retrieve the six identity documents.
6. Only then retire/null legacy `face_photo_url` / `cedula_photo_url` values if desired.

## Remaining Security Advisor items
- Three authenticated SECURITY DEFINER warnings remain for application/RLS helper functions intentionally used by authenticated flows: `get_available_orders_with_distance`, `is_admin_user`, `provider_active_job_count`.
- Leaked Password Protection remains disabled because it is a Pro-plan-and-above feature; the project is on Free.

## Backup authority
- 2026-10-06 consolidated ZIP = immutable **pre-hardening preservation master**.
- This candidate source + migrations 014–021 = hardening delta.
- A fresh post-hardening DB/Storage backup is still required after client deployment and Private Storage cutover to create one coherent sale-ready preservation master.
