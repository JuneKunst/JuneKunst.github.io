# BEE learning diagram sources

These five authored Archify candidates are the source of the standalone HTML in `bee/`.
The current source revision is `92900a52a5b453f96dc83c3dc6ec6e7bee170632` in
`visualkhh/Lv2_bee_Assignment` (mission-flow, including arm-skills).
Keep model/source evidence and pending design boundaries truthful when updating.

Render with `python3 _tools/update_bee_skills.py --repo-root CLEAN_CHECKOUT --out-dir OUTPUT_DIRECTORY`.
All five finalize receipts must pass before publishing generated HTML.
Preserve the previous standalone artifacts under `bee/archive/` before copying updates.
Refresh the artifact hashes in `bee/manifest.json` after copying.

The navigation and sequential learning view are `bee/skills.html`, `skills.js`,
`skills.css`, and `learning-data.js`. They run without a ROS bridge or model API.
The guide adds temporary highlighting to the iframe DOM; generated HTML is not patched.
