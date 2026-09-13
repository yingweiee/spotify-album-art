# spotify-album-art

A web recreation of Spotify's Now Playing → full-screen artwork flow, plus three concepts for a new
feature: **tap the artwork again to reveal the details behind the art.**

**Live demo:** https://yingweiee.github.io/spotify-album-art/ (best on a phone)

No build step. Open `index.html` through any static server:

```bash
python3 -m http.server 5178
```

Then visit http://localhost:5178. Use the switcher (or `?c=flip`, `?c=explore`, `?c=sheet`) to change concepts.

## Base flow (recreated)

1. Now Playing screen: header, artwork, track info, live progress bar, controls, "About the artist".
2. Tap the artwork → shared-element transition into a black full-screen viewer.
3. Drag the artwork to tilt it in 3D (with glare); it springs back when released. `×` or `Esc` closes.

## Art details concepts

| # | Concept | Tap artwork in viewer… |
|---|---------|------------------------|
| 1 | **Flip** | The artwork flips like a record sleeve. The back has liner notes: credits, the story and the palette. Still tiltable. |
| 2 | **Explore** | The artwork zooms in and shows numbered hotspots. A caption card explains each one; tap a hotspot or use the arrows to move between them. Drag to pan. |
| 3 | **Sheet** | The artwork shrinks to the top and a bottom sheet slides up with the palette, story, credits and editions (tap an edition to preview it on the cover). Drag the handle down to dismiss. |

Tapping the artwork again, or pressing `×`, returns to the plain viewer.

## Files

- `index.html` – markup for the player and viewer
- `styles.css` – layout, motion, concept styles
- `app.js` – transitions, tilt/pan gestures, concept logic
- `data.js` – artwork metadata (swap for real data)
- `art.svg` – original placeholder cover ("Low Tide Radio" by fictional artist Oda Lumen)
