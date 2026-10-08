# 水色小狗

Source: owner-provided `水色小狗 2/模型文件/水色小狗` on 2026-10-08. Model and expression copyrights remain with the original creators. The built-in information card is preserved in the model and hidden in the companion view using its supplied X hotkey parameter (`Param121`).

The web export contains the original moc3, physics, idle animation and five interactive expressions. Texture atlases are reduced from 8192 to 2048 pixels and encoded as WebP (quality 88). Neutral resets the parameters used by the selected expressions. No VTube Studio settings, unrelated artwork or personal local paths are deployed.

The source manifest did not define Expressions, Motions or HitAreas. The web manifest registers its existing expressions and Idle animation. Pointer interactions are handled by the companion stage instead of fabricated ArtMesh hit-area identifiers.

Documentation used: https://jiangweifang.github.io/wp-live2d/docs/config/v2-custom-model and https://jiangweifang.github.io/wp-live2d/docs/advanced/touch-area . This Vue site uses a native canvas integration rather than the WordPress plugin.

2026-10-08 loading optimization: `model.moc3.gz` is a byte-preserving gzip export (5,828,931 bytes versus 11,177,984 bytes raw). Browsers decode it locally into a session-cached blob URL. The original moc3 remains a compatibility fallback. The model and manifest are warmed after the initial page load, unless Save-Data is enabled. The lower option panel is removed; pointer and keyboard interaction remain. A hidden, fully loaded companion pauses its renderer and is reused on the next summon.
