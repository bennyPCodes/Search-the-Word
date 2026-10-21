# Search the Word

A word search game of encouraging KJV Bible verses. Each level hides key words from a verse in the grid; every word found fills in the verse. Guess the verse early for bonus points.

## Put it on GitHub Pages
1. Create a new repository (for example `search-the-word`) and upload every file in this folder, keeping the `icons` folder.
2. Settings, then Pages: "Deploy from a branch", `main`, `/ (root)`, Save.
3. It goes live at `https://<your-username>.github.io/search-the-word/`.
4. On iPhone: open the link in Safari, then Share, then Add to Home Screen.

## How difficulty grows
- Levels 1–15: 8×8 board, words run across and down only, full word list shown.
- Levels 16–50: diagonals added. From level 31, the list shows only first letters.
- Level 51+: words can run in all eight directions, including backwards.
- Level 121+: the list shows only blanks, so the verse is your guide.
- After level 307: endless rounds on bigger boards with a points multiplier.

## Updating
- After changing any file, bump `VERSION` in `sw.js` (for example `searchword-v2`).
- Add verses by appending to the END of `verses.js`.

Progress saves on the device, separately from Cross-Words.
