# Project 004 · Yuashie Calendar

## Website routes

- `/projects/004`: project introduction, planned coverage, capabilities and instructions. Primary CTA opens the builder; no GitHub CTA here.
- `/projects/004/subscribe`: interactive frontend test builder, copyable test URL and secondary GitHub source link.
- `/projects/calendar` and `/projects/calendar/subscribe`: redirects to the above canonical routes.
- `/project` (also reachable via `/projects`): Calendar card opens the introduction rather than GitHub. Home, search and saved-project navigation reuse the existing project directory.

Uses existing SiteNav/SiteFooter, Quota Hub layout and site theme variables. Chinese, English and Japanese follow the site's current locale. Forms use native checkboxes/radios, labeled controls, keyboard focus, live copy feedback and a mobile single-column layout.

## Current status

**Partial real launch (2026-10-29):** the website now offers two independent, operating AniList anime ICS subscriptions. The calendar backend successfully generated 174 upcoming Japanese TV anime episodes on first run and published both on GitHub Pages. No API data is fetched from the website itself; links use published static ICS. The existing arbitrary category/game combination builder is **still a demo** with an intentionally unresolvable .invalid URL. Games, new releases, per-title anime filters and multi-category combination remain unimplemented. The diagram remains illustrative.

The live anime URLs (separate from custom builder) are:

- `https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/start.ics` (one all-day marker per airing episode)
- `https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/span.ics` (exact airing time)

These are explicitly labeled as AniList aggregator data, not official Japanese broadcaster announcements. The start/duration radio in the subscription page chooses between these two feed links; links also appear on Project 004's introduction page. This feature does not expose per-show selections. Source code and ingestion details: [yuashie-calendar/docs/real-anime.md](https://github.com/southkite2023/yuashie-calendar/blob/main/docs/real-anime.md).

The endpoint `https://calendar.example.invalid/v1/feed.ics` is deliberately on the reserved `.invalid` domain. It will not resolve and is NOT a real feed. Copying demonstrates the URL contract; there is no active webcal/add-to-calendar action. Changing feed-affecting options clears the generated URL so stale selections cannot be copied. Clipboard failures allow manual copying from a readonly selectable field.

## Proposed URL contract (schema 1)

| Parameter | Values / meaning |
| --- | --- |
| `schema` | `1` |
| `categories` | Comma-separated `games`, `anime`, `releases`; at least one required |
| `genshin`, `star-rail`, `zzz`, `arknights` | Per-game comma-separated `version`, `preview`, `banner`; omitted when empty |
| `mode` | `start`: start date only; `duration`: full event period |
| `tz` | `Asia/Shanghai` |
| `test` | Always `1` during this frontend test |

Only known games and event types are serialized; duplicates are removed and order is canonical. A game with no selected event types does not contribute to the feed. Disabling the game category omits all game filters while preserving UI choices for re-enabling. An entirely empty selection disables generation.

Example (unusable test URL):

```text
https://calendar.example.invalid/v1/feed.ics?schema=1&mode=duration&tz=Asia%2FShanghai&genshin=version%2Cbanner&categories=games%2Canime&test=1
```

## Backend launch requirements

Connect verified real sources for the four games' version updates, preview livestreams and banners, weekly Japanese anime and new-game launches. Define source refresh schedules, game regions, source timezones and date conversion rules. Keep the frontend's public limitations aligned with implemented coverage.

Implement a real HTTPS feed endpoint with parameter validation and `text/calendar` responses, stable event UID, update timestamps, caching and correct ICS escaping. Duration mode must use exclusive `DTEND` for all-day events; start mode emits one day. Single-day episodes, previews and releases stay single-day. Convert source dates/times consistently (including Japanese broadcast dates), and test in Apple Calendar and Google Calendar.

Only then replace the reserved endpoint, remove test status and enable subscription actions. Adding a backend or deployment capability requires the repository's coordinated backend deployment workflow; this change adds frontend pages only.

## Validation

`npm run build`, `npm test` (including URL validation, independent defaults and multilingual coverage), plus the existing frontend deployment boundary tests.


## 2026-10-30: Select current-season anime by title

The live anime selector at `/projects/004/subscribe#anime-season-picker` reads the public,
read-only JSON catalog at
`https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/catalog/current-season.json`.
It renders the AniList current-season TV/TV_SHORT list with search, checkboxes,
a separately chosen `start` or `span` mode (precise broadcast time by default),
and a stable individual URL for every selected show:

`https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/shows/{anilist_media_id}/span.ics`

The project introduction links to the selector instead of the old whole-anime feed.
The whole-anime subscription is available only as an optional collapsed section.
Titles are sourced from AniList (native first, with English/romaji search aliases);
some ongoing series and season shows without an upcoming two-week episode or season
metadata may not appear, so this catalog is not a complete seasonal database.

**Architecture limitation:** GitHub Pages serves static files, so checking multiple
shows cannot generate one dynamically merged, continuously refreshed ICS URL.
Users must add each selected show's persistent URL separately; the copy-all
operation copies multiple URLs separated by newlines, it does not bulk-install
calendars. Building one subscription URL for arbitrary selections needs a
server-side dynamic feed (e.g. on an existing server), not static HTML or a
one-time downloaded ICS. The original multi-category builder remains a demo.

No favorites or account information is sent to the calendar backend. Source data
and stable per-title feeds are published by the calendar repository's scheduled
GitHub Actions workflow. Frontend catalog loading errors are displayed explicitly;
previously subscribed URLs keep working independently of the website.
