"""Generate reference ephemerides with pyephem to validate astro.js."""
import json
import ephem

DATES = ["2026/7/7 06:00:00", "2026/1/15 12:00:00", "2026/12/25 03:30:00",
         "2027/3/20 18:00:00", "2026/8/12 09:00:00"]
BODIES = {
    "sun": ephem.Sun, "moon": ephem.Moon, "mercury": ephem.Mercury,
    "venus": ephem.Venus, "mars": ephem.Mars, "jupiter": ephem.Jupiter,
    "saturn": ephem.Saturn, "uranus": ephem.Uranus, "neptune": ephem.Neptune,
}

out = {"positions": [], "riseset": []}
for d in DATES:
    row = {"date": d, "bodies": {}}
    for name, cls in BODIES.items():
        b = cls()
        b.compute(d)  # geocentric apparent
        row["bodies"][name] = {
            "ra": float(b.g_ra) * 180 / ephem.pi,
            "dec": float(b.g_dec) * 180 / ephem.pi,
            "mag": float(b.mag),
            "illum": float(b.phase) / 100.0,
        }
    out["positions"].append(row)

# rise/set at Seattle
obs = ephem.Observer()
obs.lat, obs.lon, obs.elevation = "47.6062", "-122.3321", 50
for d in DATES:
    obs.date = d
    row = {"date": d, "events": {}}
    for name in ("sun", "moon", "jupiter", "venus"):
        b = BODIES[name]()
        try:
            row["events"][name] = {
                "rise": str(obs.next_rising(b)),
                "set": str(obs.next_setting(b)),
            }
        except (ephem.AlwaysUpError, ephem.NeverUpError):
            row["events"][name] = None
    out["riseset"].append(row)

print(json.dumps(out, indent=1))
