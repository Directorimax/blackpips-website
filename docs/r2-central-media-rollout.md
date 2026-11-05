# R2 central media rollout

This document accompanies the unapplied `20261015_create_central_media_library.sql`
migration. It does not authorize a production change.

## Security contract

- Keep `blackpips-media` private. Never enable an `r2.dev` public URL.
- Store only the R2 account ID and bucket name in client-visible configuration.
  Access keys remain in the server-side secret store.
- The server may authorize an upload only after checking the current user is an
  administrator, validating the video type and size, and constraining the key to
  the content-addressed `videos/sha256/...` namespace. Authorization expires in
  15 minutes; files of 100 MiB or more use multipart upload.
- Playback authorization remains lesson-based: authenticate, verify the lesson
  is published, verify course entitlement and progression, resolve the lesson's
  linked asset, then issue a five-minute R2 signed GET URL. The signed request
  must permit byte ranges. Never store a signed URL in the database.
- Existing Contabo/legacy URLs remain the fallback until each copied object is
  checksum-verified and the owner approves a controlled playback cutover.

## Rollout

1. Export authorized Contabo object and lesson metadata read-only. Hash every
   source object server-side and generate the deterministic manifest. Resolve
   all missing identities and checksum/size conflicts.
2. Review the additive migration and take a database backup. Apply it during an
   approved maintenance window; do not populate lesson links yet.
3. Configure a least-privilege R2 credential scoped to `blackpips-media` and the
   managed video prefix. Test create/upload/list/read while confirming public
   access remains disabled.
4. Copy Masterclass objects server-to-server without deleting or overwriting
   Contabo. Record each source mapping; verify destination size and SHA-256.
5. Import verified assets as `available`, attach a small internal-only lesson,
   and validate range seeking, entitlement, draft denial, progression,
   watermarking, and capture protection on web, iOS, and Android.
6. Add admin library browsing/upload/attach/reassign/unlink controls against the
   checked RPCs. Require confirmation for reassignment/unlink and show usage
   dependencies. Keep lesson deletion separate.
7. Cut over a small approved cohort, monitor errors, then proceed course by
   course. Retain Contabo throughout the observation period.

## Rollback

Disable new R2 authorization, restore the legacy Contabo playback resolver, and
leave lesson IDs, progress, entitlements, and source objects untouched. Remove
lesson-to-asset links only after exporting them. The three new tables and RPCs
can remain inert; dropping them is optional and must happen only after confirming
there are no consumers. Never delete R2 or Contabo objects as part of rollback.
