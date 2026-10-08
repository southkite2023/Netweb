# Project 004 · Yuashie Calendar

## Website routes

- `/projects/004`: project introduction, planned coverage, capabilities and instructions. Primary CTA opens the builder; no GitHub CTA here.
- `/projects/004/subscribe`: interactive frontend test builder, copyable test URL and secondary GitHub source link.
- `/projects/calendar` and `/projects/calendar/subscribe`: redirects to the above canonical routes.
- `/project` (also reachable via `/projects`): Calendar card opens the introduction rather than GitHub. Home, search and saved-project navigation reuse the existing project directory.

Uses existing SiteNav/SiteFooter, Quota Hub layout and site theme variables. Chinese, English and Japanese follow the site's current locale. Forms use native checkboxes/radios, labeled controls, keyboard focus, live copy feedback and a mobile single-column layout.

## Current status

Frontend interaction test only. No data is fetched, no actual events are fabricated and no subscription is offered as operational. The diagram is explicitly illustrative. Anime and new-game releases currently have category-level selection only; individual shows, platforms and source lists await real integration.

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
