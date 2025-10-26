Letter Placeholder Dictionary

Minimal vanilla HTML/CSS/JS demo.

- `index.html` - page
- `styles.css` - styling (white background, big Helvetica letters)
- `script.js` - behavior
- `dictionary.json` - JSON list of war/violence related words (>=100 entries)

Usage:
Open `index.html` in a browser (a local static server recommended).

Behavior summary:
- On load: picks a random 7-letter word from `dictionary.json` and displays its letters evenly across the screen.
- On mouse move: picks a fixed letter index and chaos-animates other letters with random alphabet letters.
- On mouse stop: finds another word in the dictionary with the same fixed letter at the same position and replaces the word; shows its definition below in gray italic.

Notes:
- You can change the placeholder length by editing `LETTER_COUNT` in `script.js` and `--letters` in `styles.css`.
- The dictionary contains abbreviations for some multi-word concepts to fit seven letters.
