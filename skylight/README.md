# Skylight

A pocket planetarium and nightly sky almanac in a single HTML file. Open
`index.html` in any browser — phone or desktop, online or offline — and it
shows exactly what's above your head right now: which planets are up and where
to look, the moon's phase and rise time, 5,044 real stars with constellation
figures, the Milky Way band, and a plain-English briefing for tonight
("step outside around 11:30 pm and look southeast").

Everything is computed on the device. No server, no account, no tracking, no
network requests — the astronomy is done from first principles in JavaScript.

## Features

- **Live sky dome** — stereographic all-sky chart for your location and time.
  Stars colored by real B−V temperature, constellation figures and names,
  ecliptic line, bright deep-sky objects, sun, moon (with correct phase and
  lit-side orientation), and all seven planets. Tap anything for details —
  including how long its light traveled to reach you.
- **Time scrubber** — drag through the night, or hours ahead; watch dawn wash
  the stars out. Pick any date to plan a weekend.
- **Tonight's briefing** — generated prose: sunset, true darkness, golden
  hour, what the moon will do to your sky, which planets are worth going
  outside for and when, meteor showers near peak.
- **Night vision mode** — the whole app turns deep red so your dark adaptation
  survives checking your phone.
- **Location** — geolocate, pick a city, or type coordinates. Saved locally.

## Accuracy

Positions come from Jean Meeus' *Astronomical Algorithms* (sun: ch. 25;
moon: truncated ELP-2000/82, ch. 47; precession: ch. 21) and the JPL
approximate planetary elements (Standish, valid 1800–2050), with Kepler-solver
orbits, light-time correction, and Sæmundsson refraction. The build validates
every body against pyephem (libastro): worst case ~4.4 arcminutes (Saturn —
a known limit of the element tables), rise/set within ±0.5 minute.

Times display in the device's timezone.

## Layout

```
index.html          the whole app, self-contained (~270 KB)
src/astro.js        positional astronomy engine (Node + browser)
src/data.js         generated star/constellation dataset — do not edit
src/app.js          UI: dome renderer, briefing writer, controls
src/app.css         styles
src/shell.html      page structure
build/make_data.py  regenerates src/data.js from d3-celestial's data files
build/assemble.py   concatenates src/ into index.html
build/reference.py  emits pyephem reference values (reference.json)
build/validate.js   checks astro.js against the reference values
build/uitest.js     Playwright smoke test (screenshots + tap cards)
```

Rebuild: `python3 build/assemble.py`. Validate: `python3 build/reference.py >
build/reference.json && node build/validate.js` (needs `pip install ephem`).

## Data

Star catalog (to magnitude 6), constellation lines/names, star proper names,
bright DSOs, and Milky Way outline are compacted from
[d3-celestial](https://github.com/ofrohn/d3-celestial) (BSD-3, Olaf Frohn),
itself derived from the HYG database (Hipparcos). Meteor shower table is
static IMO data.
