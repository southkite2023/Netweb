# Yuashie Personal Site · 0.3.1

Vue 3 + Vite frontend with a Fastify + PostgreSQL account/community API.

Current features include accounts, public profiles, selectable badges, project comments, avatars, Bug/Suggestion review, Contribution ledger, administrator tools, the Project 002 Minecraft whitelist bridge, and **Project 003 · Yuashie Radio**.

Version 0.3.1 adds a successful-comment dialog, top-of-page route navigation, a global TOP button, and Chinese as the initial language. See `UPDATE-0.3.1.md` for upgrade notes.

## Project 003 · Yuashie Radio

Version 0.3.0 adds an amateur-radio identity, QSO logbook, custom QSL template library, and in-site electronic QSL delivery.

Users can:

- bind one unique amateur-radio callsign to a Yuashie account;
- choose operator class A / B / C;
- display a persistent `📻 CALLSIGN` identity beside the website identity;
- save and search QSO records including BJT time, frequency, mode, RST, power, QTH, rig, antenna, notes, and QSL state;
- upload PNG/JPEG/WebP QSL designs up to 5 MB;
- send an electronic QSL to another Yuashie user whose callsign matches the remote callsign in the QSO log;
- receive and acknowledge electronic QSL cards in the QSL inbox;
- expose a public station page at `/radio/:callsign`.

QSL images and QSO metadata remain separate: QSO details are overlaid dynamically rather than burned into the original artwork.

See `RADIO-SYSTEM-0.3.0.md` for the implementation and schema notes.

## Deployment

The desktop `Yuashie Publish` flow builds the frontend, uploads the API, applies every SQL migration in `server/sql` in filename order, creates persistent avatar/QSL content directories, restarts the API, performs a health check, and then swaps the frontend build.

The new radio migration is `server/sql/005_radio.sql`.

## Minecraft whitelist bridge

Project 002 continues to use `YuashieWhitelistBridge` inside Paper. It polls the Yuashie API over outbound HTTPS and updates Bukkit's local whitelist, so no public RCON port is required.

See `MINECRAFT-BRIDGE-0.2.6.md` for the Minecraft bridge details.
