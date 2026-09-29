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