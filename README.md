# spotify-album-art

A web recreation of Spotify's Now Playing → full-screen artwork flow, with a new **Explore** feature:
tap the artwork again to discover the details behind the art.

**Live demo:** https://yingweiee.github.io/spotify-album-art/ (best on a phone)

No build step. Open `index.html` through any static server:

```bash
python3 -m http.server 5178
```

Then visit http://localhost:5178.

## Flow

1. Now Playing screen: header, artwork, track info, live progress bar, controls, "About the artist".
2. Tap the artwork → shared-element transition into a black full-screen viewer.
3. Drag the artwork to tilt it in 3D (with glare); it springs back when released.
4. **Tap the artwork again → Explore.** The artwork zooms in and numbered hotspots appear on notable details.
   A caption card explains each one; tap a hotspot or use the arrows to move between them, and drag to pan.
5. Tap the artwork, tap outside it or press `×` to leave Explore; `×` or `Esc` again closes the viewer.

## Files

- `index.html` – markup for the player and viewer
- `styles.css` – layout, motion and hotspot styles
- `app.js` – transitions, tilt/pan gestures, Explore logic
- `data.js` – hotspot content (swap for real data)
- `art.svg` – original placeholder cover ("Low Tide Radio" by fictional artist Oda Lumen)
