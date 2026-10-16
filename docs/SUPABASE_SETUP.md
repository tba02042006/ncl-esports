# Connect the NCL admin panel

The code supports real Supabase PostgreSQL, Auth and Storage. Until you connect a project, `/admin` shows a setup screen and saves nothing. The public site keeps its labeled demonstration content. A project URL and publishable key are not administrator credentials; database roles and RLS enforce access. This application does not need a service-role key.

## 1. Create the project and database

1. Sign in at **supabase.com/dashboard** and click **New project**. Choose your organization, a project name and region, and save the database password securely.
2. Wait for the project to finish provisioning.
3. Open **SQL Editor → New query**.
4. Copy the entire file `supabase/migrations/202610160001_ncl_admin.sql` from this repository, paste it into the editor, and click **Run**. Run it once on a new project; it is a versioned migration, not a repeatable seed script. Alternatively use `supabase db push` with a linked Supabase CLI project.
5. Open **Table Editor**. Confirm `ncl_content`, `ncl_admins`, `ncl_media` and `ncl_audit` exist. Storage should contain a **private** `ncl-media` bucket. Do not make it public or add broad storage policies.

No sample official data or default administrator is seeded. Dashboard statistics are actual saved record counts, including zero.

## 2. Disable public signup and configure invitations

1. Open **Authentication → Sign In / Providers → Email** (the dashboard may label this **Providers**).
2. **Disable “Allow new users to sign up”**. Disable anonymous sign-ins too. Keep email/password sign-in enabled. There is no signup form in the NCL application, but the provider setting is essential to disable direct Auth API signup.
3. In **Authentication → URL Configuration**, set **Site URL** to your exact production origin, for example `https://your-ncl-site.vercel.app`. Add your exact development origin and controlled preview deployment URLs only if needed. Avoid broad redirect wildcards.
4. In **Authentication → Email Templates → Invite user**, set the invitation link to:
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite"
     >Activate your NCL account</a
   >
   ```
5. For **Reset password**, use:
   ```html
   <a
     href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
     >Reset your NCL password</a
   >
   ```
6. Configure production SMTP in Supabase before inviting real users. Supabase applies Auth rate limits; do not disable them. Use a strong password policy in **Authentication settings** and a minimum of 12 characters for administrators.

The application consumes these single-use tokens only on password submission, verifies the invited user's database membership, sets the password and redirects to sign-in. It does not provide a public recovery or signup endpoint. Ask the project owner to issue recovery emails through the Supabase dashboard. Never paste invitation tokens into issues or chat.

## 3. Authorize the first owner

1. Open **Authentication → Users → Add user → Invite user** and enter your email. Do not open the invitation email yet.
2. Copy the new user's **UUID** from the Users table. This is an identifier, not a secret.
3. In **SQL Editor**, run the following, replacing the placeholder with your user UUID:
   ```sql
   insert into public.ncl_admins (user_id, role)
   values ('YOUR-AUTH-USER-UUID', 'owner');
   ```
4. Once the deployment is configured, open the invitation email, click **Activate your NCL account**, choose a password, then sign in at `/admin/login`.

This SQL bootstrap is deliberately the only way to create the first owner. Do not add an owner based on an email query parameter, client metadata or a public “claim admin” endpoint.

For another administrator: invite them through **Authentication → Users**, then use **NCL Admin → Administrators** to paste their UUID and grant a role **before they activate the invite**. The application never exposes an Auth admin API key. Deleting or disabling Auth users is performed in the Supabase dashboard; role revocation is available in NCL Admin. Do not delete the last owner through the Supabase dashboard.

### Roles

| Role   | Access                                                                                                                                                                                    |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editor | Read the workspace, upload private media, create/edit drafts. Cannot publish, delete content, publish images, generate brackets, edit official records or manage administrators/settings. |
| Admin  | Content CRUD, publication/archiving, bracket generation, image publication and audit reading. Cannot manage administrators or site settings.                                              |
| Owner  | All admin capabilities, league settings and administrator role management. The application prevents removal/demotion of the final owner.                                                  |

Membership is checked server-side and inside PostgreSQL RPCs on every mutation. No access is derived from user-editable Auth metadata. Session validation uses `getUser`, not unverified cookie data. Auth cookies are HttpOnly, SameSite=Lax and Secure in production. Changing a password revokes refresh sessions; existing access tokens expire according to your Supabase JWT lifetime. Role revocation is checked directly against the database on every operation. Direct table writes are revoked; typed server validation is backed by SQL validation, RLS and transactional RPCs. Admin routes are private/no-store and excluded from search indexing. Next.js Server Actions enforce same-origin requests; do not loosen their allowed-origin configuration.

## 4. Add deployment configuration

Find **Project Settings → API / API Keys** (or the project **Connect** dialog). Copy the **Project URL** and the **publishable key**. Legacy projects can use the public **anon** key instead. Never copy `service_role` or a secret API key.

### Local development

Copy `.env.example` to `.env.local`, then edit it:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Then run:

```sh
npm ci
npm run dev
```

Restart Next.js after editing environment variables. `.env.local` is ignored by Git. A public publishable key is intended for browsers; RLS is still mandatory.

### Vercel

1. Sign in at **vercel.com** and click **Add New → Project**.
2. Import `tba02042006/ncl-esports`. Select **Next.js**, **Node.js 24.x**, repository root, build command **npm run build** and install command **npm ci**.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` under **Settings → Environment Variables**. Choose the intended environments. Use a separate Supabase project for development/preview if you want isolated data.
4. Click **Deploy** (or **Redeploy** after changing variables).
5. Set the exact deployed URL as the Supabase **Site URL**, finish the invitation setup above, and open `https://YOUR-SITE/admin/login`.
6. If testing on a branch before merging, deploy the branch as a Vercel Preview and point a separate Supabase staging project at that preview. Never publish test fixtures in your production project.

No database password or service-role key goes into Vercel for this application. If your cloud task uses an outbound allowlist, add your exact `YOUR_PROJECT_REF.supabase.co` hostname to its network settings for Auth, REST and Storage access. A saved variable is not proof of connectivity; retry login and saving after configuration is applied.

## 5. First publishing workflow

1. **Tournaments → Create record**. Fill Uzbek, Russian and English fields, an approved slug, dates if known, format, capacity and rules. Save a draft, review, then publish.
2. **Media library → Upload**. PNG/JPEG/WebP only, ≤3 MB, ≤16 megapixels. The server validates decoding, rejects animation, strips metadata, limits output to 2048×2048 and re-encodes WebP. New media is private. An admin clicks **Publish image** before a published record may reference it. Signed image URLs expire in 60 seconds. Hiding an image used in published content is blocked.
3. Create **Universities**, then **Teams**, then **Players**. Assign each team to a unique slot in its tournament. Assign players to teams; their records become the roster. Publish the tournament before its teams, and teams before players.
4. For a knockout competition, fill all team slots and open **Bracket → Generate draft bracket**. This creates actual draft fixtures and source links atomically, with no outcomes or dates. It supports power-of-two capacities from 2 to 64. It refuses to replace existing fixtures. For round robin or groups/playoffs, author fixtures manually and link knockout stages where appropriate; no group ranking/seeding engine is included.
5. Open **Matches** to schedule fixtures. Enter only completed maps and their scores. To finish a series, select the correct winner and confirm the result. Series totals are calculated from map wins. Publishing is independent from match status: a draft match is always private, even if marked live.
6. Publish fixtures in progression order. The previous-round sources must be published first. Confirmed winners automatically appear in linked next-round slots. The public matches and bracket use the same resolved model.
7. Manual source-participant overrides require admin/owner permission and a reason (at least 10 characters), and are audited. Clear or reopen affected downstream matches from the final backwards before correcting upstream results. The database rejects upstream edits once a dependent match is live/finished; it never silently rewrites played matches.
8. Publish **Broadcast**, **Partners**, **News**, and **Site content** records. A broadcast needs a real YouTube video URL for upcoming/live states. This is an editorial status, not provider-verified live telemetry. The site does not invent viewer counts. News articles appear on `/news` and `/news/[slug]` in all three languages.
9. Owners can use **Settings** to select a featured tournament and official contact email. Published tournament navigation lets visitors select other competitions. Without a featured choice, the oldest published tournament is selected. Archiving a tournament hides its public child teams, players and matches; it preserves the records in Admin.

All translations are plain text, never evaluated HTML. Site content placements are `hero_intro`, `league_about`, `contact_note` and `home_headline` (name = first headline line, body = second line). Sponsor visibility follows publication status. Private media must not contain information you intend to keep after deliberately publishing the image.

Edits use version checks to prevent one administrator silently overwriting another. Related writes use a transaction lock to keep graph generation/results/role changes consistent. An append-only audit log records changes, reasons and actors. Permanent deletion of referenced records is refused; archive instead. The media library retains uploads rather than offering destructive asset deletion; remove unreferenced orphaned files through the Supabase dashboard if necessary.

## 6. Verify the connected deployment

The repository includes real PostgreSQL migration/RLS tests with PGlite, but it cannot certify your remote Supabase project without connecting it. After configuration:

- Sign in as owner; create a draft tournament. Confirm it survives reload and is absent publicly.
- Publish it; confirm its translated name/rules appear on `/tournaments`.
- Upload a private image. Confirm anonymous access returns 404; publish the image, attach it to content and verify it renders.
- Invite an editor. Confirm they can save drafts but cannot publish or grant themselves an administrator role, including through direct RPC calls.
- Generate a small test bracket in a **staging project**; confirm map results advance winners and started descendants prevent upstream corrections.
- Sign out, verify `/admin` redirects to sign-in, and verify unauthorized mutations fail.
- Test an invitation and recovery email using your SMTP setup.

Baseline checks:

```sh
npm run lint
npm test
npm run build
```

The tests cover validation, role permissions, RLS isolation, publication, stale writes, bracket graph integrity and audit protections. They stub Supabase's `auth`/`storage` schemas in a local PostgreSQL engine; they do not exercise hosted Auth email delivery or Storage HTTP behavior. The admin interface is English in this first version; public Uzbek/Russian/English behavior and all content translations are preserved.

For repeatable browser checks after a production build, use `npm run test:e2e` with Chromium installed (`CHROMIUM_PATH` can override `/usr/bin/chromium`). It starts a test-only Auth/Storage API fixture backed by the actual PostgreSQL migration and an isolated Next.js server. It creates test records only in memory, never in your real Supabase project. The fixture verifies the application flow; live email delivery and hosted Storage still require the checklist above.
