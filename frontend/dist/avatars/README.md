# Avatar models

The verification page loads avatars in this priority order:

1. Custom single-file character at `male.glb` (used for male and "other") or `female.glb` if you drop your own here.
2. Built-in realistic CC0-1.0 modular character in `cc0/` (`base_body_anim.glb` + outfit/hair + live BMI/height/gender morph targets).
3. Built-in procedural Three.js avatar fallback (`buildAvatar.js`).

Requirements / tips for custom `male.glb` / `female.glb` overrides:
- glTF binary (`.glb`), humanoid, **facing +Z**, standing upright. Any scale: it is fitted to height automatically.
- Include the outfit in the model (the page does not dress it).
- An idle animation named like `idle` / `stand` is played if present.
- Optional morph targets named `weight` / `fat` / `slim` are driven by the user's BMI.
- Keep it light for phones: ideally under ~5 MB and a 1k-2k texture size.
- Only use models you are licensed to ship (e.g. CC0 packs, purchased assets, or your own commissions).
