# utils/marks.py
# Translates Track & Field marks between how people write them and how
# ESB saves them. Used by the Track editor and the sport card.
#
#   time     "10.85" -> 10.85      "2:05.30" -> 125.30   (saved as seconds)
#   distance "21' 6\"" -> 258.0    "21-6.5"  -> 258.5    (saved as inches)
#
# parse_* raise ValueError with a plain message the screen can show.

import re


def parse_time(text):
    """'10.85' or '2:05.30' -> seconds. Empty -> None."""
    text = (text or "").strip()
    if not text:
        return None
    try:
        if ":" in text:
            mins, secs = text.split(":", 1)
            mins, secs = int(mins), float(secs)
            if secs >= 60:
                raise ValueError
            total = mins * 60 + secs
        else:
            total = float(text)
    except ValueError:
        raise ValueError(f"“{text}” isn't a time. Try 10.85 or 2:05.30")
    if total <= 0:
        raise ValueError(f"“{text}” isn't a time. Try 10.85 or 2:05.30")
    return round(total, 2)


def format_time(seconds):
    """125.3 -> '2:05.30'.  10.85 -> '10.85'."""
    if seconds is None:
        return ""
    seconds = round(float(seconds), 2)
    if seconds < 60:
        return f"{seconds:.2f}"
    mins = int(seconds // 60)
    secs = round(seconds - mins * 60, 2)
    return f"{mins}:{secs:05.2f}"


def parse_distance(text):
    """21' 6" or 21-6 or 21 6.5 or 21' -> inches. Empty -> None."""
    text = (text or "").strip()
    if not text:
        return None
    parts = re.sub(r"[’'\"”\-]", " ", text).split()
    try:
        if len(parts) == 1:
            feet, inches = int(parts[0]), 0.0
        elif len(parts) == 2:
            feet, inches = int(parts[0]), float(parts[1])
        else:
            raise ValueError
        if feet < 0 or inches < 0 or inches >= 12:
            raise ValueError
    except ValueError:
        raise ValueError(f"“{text}” isn't a distance. Try 21' 6\" or 21-6")
    return round(feet * 12 + inches, 2)


def format_distance(inches):
    """258.5 -> 21' 6.5\".  258 -> 21' 6\"."""
    if inches is None:
        return ""
    inches = round(float(inches), 2)
    feet = int(inches // 12)
    rest = round(inches - feet * 12, 2)
    return f"{feet}' {rest:g}\""


def parse_mark(kind, text):
    return parse_time(text) if kind == "time" else parse_distance(text)


def format_mark(kind, value):
    return format_time(value) if kind == "time" else format_distance(value)