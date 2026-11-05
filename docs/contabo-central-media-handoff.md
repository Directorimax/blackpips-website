# Central Media Library — Contabo backend handoff

This is the single backend contract for the BLACKPIPS website and Flutter admin
clients. As of 16 October 2026, the Central Media Edge Function is deployed but
remains server-gated; this document does not authorize broader production use.

## Verified import inputs

Transfer these exact authoritative files from
`/home/blackpips/blackpips-infra/deploy/blackpips-supabase/migrations/r2-media-inventory-20261015/`:

- `r2-migration-manifest.json`
- `canonical-assets.csv`
- `lesson-asset-map.csv`
- `r2-copy-report.json`

Do not infer mappings from titles or an RLS-limited client. Validate the report
totals before import: 14 unique assets, 14 lesson mappings, 42 source objects,
28 redundant copies, and 1,893,319,612 canonical bytes. Preserve every lesson
UUID. Do not map or overwrite the separate manually tested `Entry type one
T1.mp4` object.

## Database deployment

Review and apply the additive
`supabase/migrations/20261015_create_central_media_library.sql` migration after
a backup. Import `media_assets` by verified SHA-256 and canonical R2 key, then
import `media_asset_sources` evidence and `lesson_media_assets` using the
authoritative lesson map. Run the import in a transaction, reject unknown lesson
UUIDs, checksum/key disagreement, duplicate lesson rows, or totals that do not
match the artifacts. Do not change legacy lesson playback columns.

Both clients call these authenticated, admin-checked RPCs:

- `admin_list_media_assets_v2()` returns asset metadata plus `usage[]` entries
  containing `lesson_id`, `lesson_title`, `course_id`, `course_title`,
  `is_published`, and `lesson_position`.
- `admin_attach_media_asset(p_lesson_id, p_media_asset_id)` attaches or replaces
  only the named lesson relationship. The asset must be `available`.
- `admin_unlink_media_asset(p_lesson_id, p_expected_media_asset_id)` uses an
  optimistic expected asset and deletes only the relationship.
- `admin_delete_media_asset(p_media_asset_id)` refuses referenced assets and
  never deletes an R2 object.

Keep tables inaccessible directly to `anon` and `authenticated`; RPCs must use
`SECURITY DEFINER`, a fixed search path, and `is_admin()` on every call.

## Secure upload API (deployed, generally disabled)

The deployed `/functions/v1/central-media/uploads` flow and its part-sign,
resume, complete and abort routes must continue to re-check administrator role,
accept `{title, mime_type, file_size_bytes, checksum_sha256}`, validate SHA-256,
video MIME and configured size limits, return an existing asset when the hash is
already canonical, or create a pending asset and a short-lived (maximum 15
minutes) multipart authorization constrained to
`videos/sha256/<first-two>/<sha256>.<ext>`. For files at least 100 MiB support
multipart create, part signing, completion, abort and resume. Completion must
server-verify object key, size, MIME and checksum before marking `available`.
Never return or log permanent R2 credentials. General admin upload access is
still disabled by the backend gate, so both clients intentionally keep ordinary
upload controls unavailable.

## Secure playback API (controlled activation)

`POST /functions/v1/central-media/playback` exposes the same descriptor shape to
website and Flutter:

```json
{
  "lesson_id": "uuid",
  "source": "legacy_contabo|private_r2",
  "url": "short-lived signed URL",
  "expires_at": "ISO-8601",
  "mime_type": "video/mp4",
  "duration_seconds": 123,
  "supports_byte_ranges": true,
  "watermark_text": "authenticated email"
}
```

Before resolving R2, authenticate the user; load the requested lesson; enforce
published/draft rules, entitlement and phase unlocking; then resolve that exact
lesson's asset and issue a maximum five-minute signed GET supporting Range.
Preserve existing watermark, capture protection, seeking and progress APIs.
Released clients must continue receiving legacy Contabo descriptors. Do not
switch production playback until a separately approved staged cutover.

The client opt-in is debug/development-only and lesson-specific. Every renewal
calls the backend again with the authenticated Supabase session and
`allow_private_r2: true`; the client never extends an expiry itself. Contabo
remains the default when the opt-in is absent.

## Safe deployment prerequisites

Backup first; verify private R2 access remains disabled; configure a
least-privilege server credential; stage the migration and artifact import;
exercise admin denial, draft denial, entitlement and progression tests; verify
one asset can link to multiple lesson UUIDs; verify one unlink leaves the other
links and all progress intact; verify referenced deletion fails; test legacy
playback on released clients; and obtain owner approval before production apply,
import, uploads, or playback cutover.
