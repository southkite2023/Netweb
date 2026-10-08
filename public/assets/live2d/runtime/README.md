# Live2D runtime

Loaded from the site only after the visitor summons the companion, in this order:

- `live2dcubismcore.min.js`: official Cubism Core 5.1.0, downloaded from https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js on 2026-10-08. Retained LICENSE.md and RedistributableFiles.txt describe the separate Live2D proprietary terms.
- `pixi.min.js`: pixi.js 6.5.10, https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js (MIT).
- `cubism4.min.js`: pixi-live2d-display 0.4.0, https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js (MIT).

Core 6 changes the render-order API and is incompatible with this renderer. Keep the verified Core 5.1 version when updating other assets.
