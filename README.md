# NCL — National Cyber League

A responsive, three-language Counter-Strike 2 university league website built with Next.js App Router, TypeScript, Tailwind CSS 4 and Lucide icons. Uzbek is the default; Russian and English are available in the header. Language is retained in the `?lang=uz|ru|en` URL when navigating or refreshing.

## Run locally

Use Node.js 24 LTS and npm. Next.js requires Node 20.9+; the data tests use native TypeScript support and require Node 22.18+ (validated with Node 24).

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

## Pages and architecture

- `/`: cinematic home, season preview, upcoming matches, honest empty results, league introduction and partner information.
- `/tournaments`: demo format, stages and rules status.
- `/teams`: 16 searchable anonymous slots with roster detail dialogs.
- `/matches`: status filters and match detail dialogs.
- `/bracket`: horizontally scrollable 16-slot single-elimination bracket. Select any pairing for details; winners configured in the shared model propagate to subsequent rounds.
- `/live`: offline by default; optional YouTube embed.
- `/sponsors`: clearly marked, unfilled partner tiers.
- `/about`: league information, native accessible FAQ disclosures and contact status.

`src/app/` owns routes, metadata and styles. `src/components/site.tsx` contains the shared responsive shell, page views and reusable match, team emblem, countdown and heading components. `src/lib/data.ts` is the typed source of truth for teams, matches, translations and configuration. No database, submission handler or live statistics are simulated. Unknown routes return a real 404.

## Edit content and branding

All current team names, pairings and proposed tournament format are **demonstration data**, not official university identities or published fixtures. There are no fabricated outcomes, sponsor agreements or dates. Replace demo content and notices only after official approval.

- Change `config.accent` in `src/lib/data.ts` to the approved NCL color. Core surfaces and layout live in `src/app/globals.css`.
- Replace the local CSS wordmark and numbered shield emblems in `src/components/site.tsx` with approved assets placed under `public/`. The current artwork is locally rendered CSS/SVG; no remote image dependencies.
- Edit `teams` to supply official team identities and five-player rosters. Extend the player model with approved bios, photos and handles when available; current profiles intentionally contain no invented people.
- Edit `matches` to set participants, status, ISO-8601 `startsAt` values with explicit timezone offsets, map scores, series scores and `winnerId`. Both matches and bracket use this exact model. Later rounds resolve team IDs from their source matches' winners. Never set a winner before confirmation.
- Set `config.startsAt` to a genuine future ISO date to enable the live countdown. An absent/invalid date shows an unannounced state, and a past date shows that the scheduled start was reached. This does not mark a match as live. Displayed match dates use `Asia/Tashkent` (UZT, UTC+5).
- Set `config.youtubeVideoId` to an official 11-character YouTube video ID. An embed represents a configured broadcast, not a verified live status. With no ID, the site is explicitly offline.
- Set `config.contactEmail` and `config.rulesUrl` only when official values exist. No registration form or fake submission flow is included.
- All editorial/UI translations are collocated in `src/lib/data.ts` and the view components using `Localized` values. Technical terms, brand names and game formats remain unchanged across languages.

## Future backend integration

Replace the data exports with server-side repository/service functions backed by a database or CMS while retaining the `Team` and `Match` contracts. Validate unique IDs, source links, result/map consistency, timezone-aware dates and authorized winner updates server-side. Add authenticated administration with role-based publishing, audit history and explicit draft/official status. Feed published records to server components, revalidate after updates and use an authenticated subscription or polling endpoint for match changes. Store no credentials in browser bundles. Add real registration only alongside eligibility checks, privacy consent, persistence and confirmation/error handling. Add sponsor profiles only after verified agreements; integrate broadcast status with an official provider rather than a fabricated viewer count.

## Accessibility and validation

Responsive navigation exposes its expanded state; filters expose pressed state; dialogs support Escape, autofocus and focus containment; reduced-motion preferences are respected. Bracket has keyboard-scrollable overflow. The native language selector is keyboard operable. Verify desktop/mobile layout and keyboard navigation before each release. Lint and production build are the baseline checks; HTTP route and data-model smoke checks are used during implementation. No official match behavior can be validated until real data is supplied.

## Verified first-version checks

- `npm install`, `npm run lint` and `npm run build` completed successfully.
- `npm test`: four passing data integrity and winner-progression tests.
- Production Chromium smoke checks: eight routes and 404, Uzbek/Russian/English switching and refresh retention, roster search/dialogs, match filters, bracket selection, Escape/Tab dialog behavior, offline broadcast, mobile menu and no document overflow at 1440px/390px. No browser runtime errors were reported.
- Desktop and mobile home layouts were visually inspected. Official assets, actual tournament data, provider-backed broadcast status and backend integration remain future work.

## Premium redesign

The redesign keeps the existing routes, language switching and typed tournament model. It adds a broadcast-inspired visual system: large Inter Tight editorial typography, a cinematic NCL hero, an illustrated tournament feature, broadcast match cards, colored demo team crests, connected knockout rounds, a 16:9 standby broadcast center and tiered sponsor positions. Sponsor shapes are abstract placeholders, not real partner logos.

`src/components/stage-art.tsx` contains the original SVG arena/monogram composition reused throughout the site. All artwork is CSS/SVG created for this project; no external imagery is loaded. The existing NCL wordmark, skewed logo tile and `config.accent` remain in use. Inter Tight is self-hosted through `@fontsource-variable/inter-tight` under the SIL Open Font License (see `THIRD_PARTY_NOTICES.md`); Latin and Cyrillic are supported without runtime font-service requests.

Motion uses brief opacity/transform transitions and hover accent lines. It avoids continuous animation, scroll listeners and animation dependencies. Reduced-motion preferences disable reveals/transitions and change bracket navigation to immediate scrolling. Bracket navigation supports touch, keyboard overflow and translated previous/next controls; selected pairings stay highlighted after closing the details panel. Confirmed winners receive a lime emphasis while unresolved matches remain neutral.

Redesign validation includes lint, all four existing data tests, the production build, desktop/mobile visual review, interaction smoke checks, and a 120-case route/language/viewport matrix (8 pages × 3 languages × widths 320, 390, 768, 1440 and 1920). No document or heading overflow or browser runtime errors were observed. Demo dates, sponsors and results remain unconfigured.
