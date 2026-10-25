# utils/sport_card.py
# ONE sport card, built from data + the registry's look (utils/sports.py).
# Never hand-drawn per screen: the dashboard uses it now, a public profile
# and the mobile app later. Basic card = free for everyone; premium will add
# finishes, photos, and designs on top of this same card.

import html
import requests
import streamlit as st
from utils.auth import auth_headers
from utils.config import API_BASE
from utils.sports import SPORT_REGISTRY
from utils.marks import format_mark

_CSS = (
    "<style>"
    ".esb-card{position:relative;max-width:340px;aspect-ratio:5/7;border-radius:16px;"
    "padding:16px;color:var(--t);border:3px solid rgba(255,255,255,.85);"
    "background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(0,0,0,.28)),"
    "repeating-linear-gradient(0deg,transparent 0 38px,rgba(255,255,255,.08) 38px 40px),var(--c);"
    "box-shadow:0 6px 18px rgba(0,0,0,.25);display:flex;flex-direction:column;gap:4px;"
    "font-family:sans-serif;margin-bottom:12px;box-sizing:border-box}"
    ".esb-card-top{display:flex;justify-content:space-between;font-size:12px;font-weight:700;"
    "letter-spacing:.12em;text-transform:uppercase}"
    ".esb-card-pos{font-size:56px;font-weight:800;line-height:1;margin-top:10px;"
    "height:56px;display:flex;align-items:center}"
    ".esb-card-name{font-size:22px;font-weight:700}"
    ".esb-card-meta{font-size:13px;opacity:.85}"
    ".esb-card-stats{margin-top:auto;display:grid;grid-template-columns:1fr 1fr;gap:8px}"
    ".esb-card-stat{background:rgba(0,0,0,.25);border-radius:8px;padding:6px 8px;min-width:0}"
    ".esb-card-stat b{display:block;font-size:20px;white-space:nowrap}"
    ".esb-card-stat span{display:block;font-size:11px;opacity:.85;text-transform:uppercase;"
    "letter-spacing:.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
    ".esb-card-pos.long{font-size:34px}"
    ".esb-card-more{grid-column:1/-1;font-size:11px;opacity:.85;text-align:center;letter-spacing:.05em}"
        ".esb-card-clips{height:76px;overflow-y:auto}"
    ".esb-card-clips:has(details[open]){height:auto;overflow:visible}"
    ".esb-card-noclips{margin-top:8px;font-size:12px;opacity:.6;text-align:center}"
    ".esb-card-foot{font-size:10px;letter-spacing:.2em;opacity:.7;text-align:center;margin-top:8px}"
    "</style>"
)


def fetch_sport_row(athlete_id, sport):
    """Read an athlete's row for one sport. Returns the route's JSON, or None."""
        # The registry's slug is the web-address name ("track-field", not "track & field").
    slug = SPORT_REGISTRY.get(sport, {}).get("slug", sport.lower())
    try:
        r = requests.get(f"{API_BASE}/api/athletes/{athlete_id}/sports/{slug}",
                         headers=auth_headers(), timeout=5)
    except Exception:
        return None
    return r.json() if r.status_code == 200 else None


def _fmt(value, stat):
    if value is None:
        return "—"
    if isinstance(stat["step"], int):
        shown = str(int(value))
    else:
                # Decimals follow the step: 0.001 -> 3 (batting avg), 0.01 -> 2, else 1.
        if stat["step"] < 0.01:
            shown = f"{value:.3f}"
        elif stat["step"] < 0.1:
            shown = f"{value:.2f}"
        else:
            shown = f"{value:.1f}"
    return f"{shown} {stat['unit']}"


def render_sport_card(sport, row, user, highlights=None):
    """Draw one sport card. Skips sports the registry hasn't given a look yet.
    highlights = list of {"title", "url"} with full URLs. Each one becomes a
    ▶ title row on the card. The player stays hidden until the row is opened."""
    info = SPORT_REGISTRY.get(sport, {})
    look = info.get("look")
    if not look:
        return
    row = row or {}
    e = html.escape

    star = "★ Primary" if user.get("primarySport") == sport else ""
    # One row per highlight. Nothing shows when the sport has no clips.
    # <details> opens and closes on its own, no code needed.
    # preload="none" means the video doesn't load until it's opened.
    chip = ""
    for clip in highlights or []:
        chip += (
            '<details style="margin-top:8px;border:1px solid var(--t);'
            'border-radius:10px;padding:4px 10px">'
            f'<summary style="cursor:pointer;font-size:13px;font-weight:700">{e(clip["title"])}</summary>'
            f'<video controls preload="none" src="{e(clip["url"])}" '
            'style="width:100%;margin-top:6px;border-radius:6px"></video>'
        '</details>'
        )
    # Every card gets the same highlight slot so cards in a row match.
    # No clips -> a faint note fills the slot instead of empty space.
    if not chip:
        chip = '<div class="esb-card-noclips">No highlights yet</div>'
    chip = f'<div class="esb-card-clips">{chip}</div>'
    position = row.get("position") or "—"
    meta_bits = [b for b in [user.get("school"),
                             f"Class of {user['graduationYear']}" if user.get("graduationYear") else None] if b]
    meta = " · ".join(meta_bits)
    if not row.get("exists"):
        meta = f"Add your {sport} details below"

    if info.get("events"):
        # Track & Field: events, not a position. Best marks in registry order,
        # up to 4 boxes. The first event is the big text.
        marks = row.get("marks") or {}
        shown = [ev for ev in info["events"] if ev["name"] in marks]
        position = shown[0]["name"] if shown else "—"
        if row.get("exists") and not shown:
            meta = f"Add your {sport} marks below"
        stats_html = "".join(
            f'<div class="esb-card-stat"><b>{e(format_mark(ev["kind"], marks[ev["name"]]))}</b>'
            f'<span>{e(ev["name"])}</span></div>'
            for ev in shown[:4]
        )
        extra = len(shown) - 4
        if extra > 0:
            stats_html += f'<div class="esb-card-more">+{extra} more event{"s" if extra > 1 else ""}</div>'
    else:
        stats_html = "".join(
            f'<div class="esb-card-stat"><b>{e(_fmt(row.get(s["key"]), s))}</b>'
            f'<span>{e(s["label"])}</span></div>'
            for s in info.get("stats", [])
        )

    # No indented lines: Streamlit treats indented HTML as a code block.
    card = (
        f'<div class="esb-card" style="--c:{look["color"]};--t:{look["text"]}">'
        f'<div class="esb-card-top"><span>{look["icon"]} {e(sport)}</span><span>{star}</span></div>'
        f'<div class="esb-card-pos{" long" if len(position) > 5 else ""}">{e(position)}</div>'
        f'<div class="esb-card-name">{e(user.get("name") or "")}</div>'
        f'<div class="esb-card-meta">{e(meta)}</div>'
        f'<div class="esb-card-stats">{stats_html}</div>'
        f'{chip}'
        f'<div class="esb-card-foot">ESB · EAT SLEEP BREATHE SPORTS</div>'
        f'</div>'
    )
    st.markdown(_CSS + card, unsafe_allow_html=True)