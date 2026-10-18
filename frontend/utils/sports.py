# ==================================================================
# SPORTS — the canonical sport list for all of ESB.
#
# One list, used everywhere: Signup, every edit form, and later search.
# If a sport name is spelled one way here, it's spelled that way in the
# database, so coaches' sport filters always match.
#
# Real sports only. Screens that need a "— Select —" placeholder add it
# themselves, so this list stays clean for edit forms.
#
# This is the seed of the sport registry. Later each sport grows its own
# positions/events, metrics, and look (colors, icon) for its sport card.
# ==================================================================
SPORTS = [
    "Football", "Basketball", "Baseball", "Soccer",
    "Track & Field", "Volleyball", "Softball", "Wrestling", "Tennis",
    "Golf", "Swimming", "Cross Country", "Lacrosse", "Other",
]


# ==================================================================
# SPORT REGISTRY — everything ESB knows about each sport.
#
#   positions : the choices for Position (or Events for Track & Field).
#               Spelled exactly as coach wishlists save them — change a
#               name here and saved wishlists stop matching.
#   stats     : searchable stats. Each "key" is the real column name in
#               that sport's stats table (football_stats, etc.), so the
#               form, the route, and the database all use one name.
#   look      : colors and icon for the sport card.
#
# Football is the first full sport. The others only have positions
# for now; they get stats and a look when we build them.
# ==================================================================
SPORT_REGISTRY = {
    "Football": {
        "positions": ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K/P"],
        "stats": [
            {"key": "fortyTime",      "label": "40-yard dash",       "unit": "sec",
             "min": 3.5, "max": 9.0,  "step": 0.01},
            {"key": "shuttleTime",    "label": "Pro shuttle (5-10-5)", "unit": "sec",
             "min": 3.5, "max": 8.0,  "step": 0.01},
            {"key": "verticalInches", "label": "Vertical jump",      "unit": "in",
             "min": 0.0, "max": 50.0, "step": 0.5},
            {"key": "benchMaxLbs",    "label": "Bench max",          "unit": "lbs",
             "min": 0,   "max": 500,  "step": 5},
        ],
                "look": {"color": "#1B5E20", "text": "#FFFFFF", "icon": "🏈"},
        "slug": "football",
    },
    "Basketball":    {"positions": ["PG", "SG", "SF", "PF", "C"]},
    "Baseball":      {"positions": ["Pitcher", "Catcher", "1B", "2B", "3B", "SS", "OF"]},
    "Softball":      {"positions": ["Pitcher", "Catcher", "1B", "2B", "3B", "SS", "OF"]},
    "Soccer":        {"positions": ["Goalkeeper", "Defender", "Midfielder", "Forward"]},
    "Volleyball":    {"positions": ["Setter", "Outside Hitter", "Middle Blocker",
                                    "Opposite", "Libero"]},
    "Wrestling":     {"positions": ["106", "113", "120", "126", "132", "138", "145",
                                    "152", "160", "170", "182", "195", "220", "285"]},
        # Track & Field has EVENTS, not one position. Two lists:
    #   positions : what coach wishlists save. Never rename these. Adding is safe.
    #   events    : what an athlete enters a best mark for. One mark per event.
    #               kind "time"     = saved as seconds  (2:05.30 -> 125.30)
    #               kind "distance" = saved as inches   (21' 6" -> 258)
    #               min/max are in those same units. Relay splits run faster
    #               than open races, so they are their own events.
    "Track & Field": {
        "positions": ["100m", "200m", "400m", "800m", "1600m", "3200m",
                      "100m Hurdles", "110m Hurdles", "300m Hurdles", "400m Hurdles",
                      "Long Jump", "High Jump", "Triple Jump", "Pole Vault",
                      "Shot Put", "Discus", "Javelin", "Relays"],
        "events": [
            {"name": "100m",         "kind": "time",     "min": 9.5,   "max": 20.0},
            {"name": "200m",         "kind": "time",     "min": 19.0,  "max": 40.0},
            {"name": "400m",         "kind": "time",     "min": 43.0,  "max": 90.0},
            {"name": "800m",         "kind": "time",     "min": 100.0, "max": 240.0},
            {"name": "1600m",        "kind": "time",     "min": 220.0, "max": 600.0},
            {"name": "3200m",        "kind": "time",     "min": 480.0, "max": 1200.0},
            {"name": "100m Hurdles", "kind": "time",     "min": 12.0,  "max": 25.0},
            {"name": "110m Hurdles", "kind": "time",     "min": 12.5,  "max": 25.0},
            {"name": "300m Hurdles", "kind": "time",     "min": 34.0,  "max": 70.0},
            {"name": "400m Hurdles", "kind": "time",     "min": 46.0,  "max": 90.0},
            {"name": "4x100 Split",  "kind": "time",     "min": 9.0,   "max": 15.0},
            {"name": "4x400 Split",  "kind": "time",     "min": 42.0,  "max": 80.0},
            {"name": "4x800 Split",  "kind": "time",     "min": 100.0, "max": 240.0},
            {"name": "Long Jump",    "kind": "distance", "min": 120,   "max": 330},
            {"name": "Triple Jump",  "kind": "distance", "min": 240,   "max": 660},
            {"name": "High Jump",    "kind": "distance", "min": 36,    "max": 96},
            {"name": "Pole Vault",   "kind": "distance", "min": 60,    "max": 240},
            {"name": "Shot Put",     "kind": "distance", "min": 120,   "max": 840},
            {"name": "Discus",       "kind": "distance", "min": 360,   "max": 2640},
                        {"name": "Javelin",      "kind": "distance", "min": 360,   "max": 3000},
        ],
        # Track-surface red. "slug" is the web-address name, since "&" and
        # spaces break URLs: /api/athletes/:id/sports/track-field
        "look": {"color": "#A63A2B", "text": "#FFFFFF", "icon": "🏃"},
        "slug": "track-field",
    },
}

# Spelling guard: every registry sport must be on the SPORTS list,
# or coach filters and athlete rows won't match. Fails loudly on a typo.
for _name in SPORT_REGISTRY:
    assert _name in SPORTS, f"Registry sport {_name!r} is not in SPORTS"

# Same shape the coach wishlist already uses, now built from the registry.
POSITIONS_BY_SPORT = {
    name: info["positions"]
    for name, info in SPORT_REGISTRY.items()
    if info.get("positions")
}