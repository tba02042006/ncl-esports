# NCL — National Cyber League

A responsive, three-language Counter-Strike 2 university league website built with Next.js App Router, TypeScript, Tailwind CSS 4 and Lucide icons. Uzbek is the default; Russian and English are available in the header. Language is retained in the `?lang=uz|ru|en` URL when navigating or refreshing.

## Run locally

Use Node.js 24 LTS and npm (pinned in `.nvmrc` and `package.json`). Supabase requires Node 22+; tests use native TypeScript support. Node 24 is the supported project runtime.

```sh
npm ci
npm run dev
```

Open http://localhost:3000 locally. For a production run:

```sh
npm run lint
npm test
npm run build
npm start
```

In a restricted cloud environment use `npm ci --cache /tmp/ncl-npm-cache` if the default home cache is unwritable. The lockfile is committed for reproducible installation. No credentials or external services are needed for the demo.

## Public website and Admin

The approved premium public design is preserved across `/`, `/tournaments`, `/teams`, `/matches`, `/bracket`, `/live`, `/sponsors` and `/about`. Published articles also have `/news` and `/news/[slug]` routes.

The real admin application is at **`/admin`**. It uses Supabase PostgreSQL, Supabase Auth and private Supabase Storage. It includes tournament/university/team/player/match CRUD, publication and archiving, bracket generation and result confirmation, broadcast settings, sponsor tiers, translated news/site content, processed image uploads, owner-only settings/administrator roles and audit history. Counts come from the database, not demonstration statistics.

**Start here: [Supabase and Vercel setup guide](docs/SUPABASE_SETUP.md).** It explains exactly what to click, how to apply the migration, disable public signup, bootstrap the first owner, configure invitation/recovery emails and add the two public environment variables. No service-role key is required or used. Without configuration, `/admin` explicitly shows a setup screen and never pretends to persist changes.

## Architecture and content

- `src/app/`: public server-rendered routes, protected admin route group, login/account activation and signed media delivery.
- `src/components/site.tsx`, `stage-art.tsx`, `published-content.tsx`: existing premium design and published-content rendering. Public language switching stays in the URL.
- `src/lib/data.ts`: original typed 16-team demonstration data and public translations. It remains the fallback when no official tournament exists.
- `src/lib/public-data.ts`: anonymous/RLS-scoped Supabase reader. Only published, visible records reach the public browser; admin sessions are never reused for public queries.
- `src/lib/public-snapshot.ts`: public view model and demo/official/unavailable states.
- `src/lib/admin/`: Zod validation, field definitions, server-only authorization, real Server Actions and safe image re-encoding.
- `supabase/migrations/`: versioned PostgreSQL schema, RLS, role boundaries, transactional mutations, graph checks and append-only audit logging.
- `tests/`: demo-model tests, validation/image tests and real PostgreSQL migration/RLS tests using PGlite.

Publish a tournament first, then its teams/players and fixtures in progression order. Admin forms require Uzbek, Russian and English content. Dates use explicit offsets and display in Tashkent time (UTC+5). Team rosters are derived from saved player records. Scores are derived from completed maps; a confirmed winner must match the series result. Bracket source links automatically resolve confirmed winners, and played downstream matches prevent unsafe upstream edits. Editors may edit drafts; admins can publish; owners manage league settings and administrator roles. All mutations enforce permissions server-side and in PostgreSQL.

The public pages load current published data on requests rather than a build-time snapshot. Visitors can choose a published tournament. Before any official tournament is published, demo teams/fixtures remain labeled. Published sponsors/news/site copy can appear independently. A configured but unavailable backend shows a clear demonstration fallback notice, never invented official statistics.

## Branding and local demo editing

The approved NCL logo tile, wordmark, lime accent and premium layouts remain unchanged. Core styles live in `src/app/globals.css`; admin styles are scoped in `src/app/admin/admin.css`. Inter Tight is served locally. Demo data in `src/lib/data.ts` remains editable for offline development. For connected deployments, use Admin rather than editing source constants: published database content takes precedence.

No registration submissions, live viewer counts or provider telemetry are simulated. Broadcast status is explicitly editorial, with an actual YouTube URL required for upcoming/live states. Additional future work could include authenticated registrations, provider-verified stream status and group-ranking/seeding automation; none is falsely presented as implemented.

## Accessibility and validation

Responsive navigation exposes its expanded state; filters expose pressed state; dialogs support Escape, autofocus and focus containment; reduced-motion preferences are respected. Bracket has keyboard-scrollable overflow. The native language selector is keyboard operable. Verify desktop/mobile layout and keyboard navigation before each release. Lint and production build are the baseline checks; HTTP route and data-model smoke checks are used during implementation. No official match behavior can be validated until real data is supplied.

## Verified first-version checks

- `npm install`, `npm run lint` and `npm run build` completed successfully.
- `npm test`: four passing data integrity and winner-progression tests.
- Production Chromium smoke checks: eight routes and 404, Uzbek/Russian/English switching and refresh retention, roster search/dialogs, match filters, bracket selection, Escape/Tab dialog behavior, offline broadcast, mobile menu and no document overflow at 1440px/390px. No browser runtime errors were reported.
- Desktop and mobile home layouts were visually inspected. Official assets, actual tournament data and provider-verified broadcast status must still be supplied.

## Premium redesign

The redesign keeps the existing routes, language switching and typed tournament model. It adds a broadcast-inspired visual system: large Inter Tight editorial typography, a cinematic NCL hero, an illustrated tournament feature, broadcast match cards, colored demo team crests, connected knockout rounds, a 16:9 standby broadcast center and tiered sponsor positions. Sponsor shapes are abstract placeholders, not real partner logos.

`src/components/stage-art.tsx` contains the original SVG arena/monogram composition reused throughout the site. All artwork is CSS/SVG created for this project; no external imagery is loaded. The existing NCL wordmark, skewed logo tile and `config.accent` remain in use. Inter Tight is self-hosted through `@fontsource-variable/inter-tight` under the SIL Open Font License (see `THIRD_PARTY_NOTICES.md`); Latin and Cyrillic are supported without runtime font-service requests.

Motion uses brief opacity/transform transitions and hover accent lines. It avoids continuous animation, scroll listeners and animation dependencies. Reduced-motion preferences disable reveals/transitions and change bracket navigation to immediate scrolling. Bracket navigation supports touch, keyboard overflow and translated previous/next controls; selected pairings stay highlighted after closing the details panel. Confirmed winners receive a lime emphasis while unresolved matches remain neutral.

Redesign validation includes lint, all four existing data tests, the production build, desktop/mobile visual review, interaction smoke checks, and a 120-case route/language/viewport matrix (8 pages × 3 languages × widths 320, 390, 768, 1440 and 1920). No document or heading overflow or browser runtime errors were observed. Demo dates, sponsors and results remain unconfigured.

## Admin validation and connection status

The backend requires your Supabase project URL, publishable key, applied migration and invited/authorized first owner. Hosted Auth email delivery, production Storage and Vercel deployment must be checked after connecting your project; local tests do not certify those external services. All form mutations require a real database response before reporting success.

`npm test` includes 21 passing checks across the original model, validation/image handling and PostgreSQL access/graph rules. Browser checks cover the preserved public functionality and desktop/mobile admin flows using an isolated PostgreSQL-backed test provider; that provider contains test-only identities and is never part of the deployed application. See the setup guide for the connected-deployment acceptance checklist and role details.

### Repeat the admin browser checks

With Chrome/Chromium installed, run `npm run build` followed by `npm run test:e2e`. Set `CHROMIUM_PATH` if Chromium is not at `/usr/bin/chromium`. The runner starts an isolated, in-memory PostgreSQL test provider on port 54329 and a production Next.js server on port 3100, exercises real application forms, then stops its processes. The provider mocks hosted Auth and Storage HTTP responses; database mutations and RLS use the actual migration. It never connects to your hosted project, and its fake identities/keys are test fixtures, not application credentials. Screenshots are written under `/tmp/`.
