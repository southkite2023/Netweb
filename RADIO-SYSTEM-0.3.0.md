# Yuashie Radio · Project 003 · 0.3.0

Version 0.3.0 turns Project 003 into **Yuashie Radio**, an amateur-radio logbook and in-site electronic QSL system integrated with the existing Yuashie account/community stack.

## User flow

1. Sign in with an existing Yuashie account.
2. Open `/radio/station` and bind a unique callsign.
3. Choose operator class A / B / C and maintain QTH, rig, antenna, default power, and radio bio.
4. The account receives the automatic `📻 Radio Operator` badge and a persistent `📻 CALLSIGN` identity chip on profiles/comments.
5. Create QSO records at `/radio/log/new`.
6. Upload one or more QSL designs at `/radio/qsl`; one template can be the default.
7. From `/radio/log`, send an electronic QSL for a QSO when the remote callsign is bound to another Yuashie user.
8. The receiver sees the card in the QSL inbox and can mark it received.

## QSO fields

The log structure follows the requested table:

- date
- remote callsign
- time (BJT / UTC+8)
- frequency (MHz)
- mode
- RST sent / received
- power sent / received (W)
- station QTH
- rig
- antenna
- notes / summary
- QSL requested / sent / received

`matched_qso_id` is reserved for later reciprocal-QSO matching.

## QSL design

QSL artwork is stored separately from QSO data. The original uploaded image is not permanently modified. When a card is displayed, the saved QSO snapshot is rendered as an overlay over the selected QSL image.

Accepted QSL formats: PNG, JPEG, WebP. Maximum size: 5 MB. A 3:2 image such as 1500×1000 is recommended.

## Database

Migration: `server/sql/005_radio.sql`

New tables:

- `radio_profiles`
- `qso_logs`
- `qsl_templates`
- `qsl_messages`

The callsign is normalized to uppercase and unique across Yuashie accounts. The current verification state is `unverified` or `verified`; v0.3.0 does not perform licence verification automatically.

## Routes

Frontend:

- `/projects/003`
- `/radio`
- `/radio/log`
- `/radio/log/new`
- `/radio/log/:id/edit`
- `/radio/qsl`
- `/radio/station`
- `/radio/:callsign`

The backend routes are under `/api/radio/*`.

## Future-compatible fields

The schema already leaves room for:

- callsign verification
- reciprocal QSO matching
- ADIF import/export
- band/DXCC/grid statistics
- confirmed-QSO workflows

These are intentionally not automated in v0.3.0.
