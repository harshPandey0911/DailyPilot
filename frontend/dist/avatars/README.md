# Avatar models

Drop artist-made rigged characters here and the verification page will use them automatically:

- `male.glb`   (used for male and "other")
- `female.glb`

If a file is missing, the built-in procedural avatar is shown instead.

Requirements / tips
- glTF binary (`.glb`), humanoid, **facing +Z**, standing upright. Any scale: it is fitted to height automatically.
- Include the outfit in the model (the page does not dress it).
- An idle animation named like `idle` / `stand` is played if present.
- Optional morph targets named `weight` / `fat` / `slim` are driven by the user's BMI.
- Keep it light for phones: ideally under ~5 MB and a 1k-2k texture size.
- Only use models you are licensed to ship (e.g. CC0 packs, purchased assets, or your own commissions).
