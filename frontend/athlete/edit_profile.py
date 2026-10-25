# athlete/edit_profile.py
# Per-section edit forms for athletes — each callable INDEPENDENTLY so the
# dashboard can drop any one of them inline under its matching display section.
#
# Each function renders ONE st.form + handles its own save. A save fires a PATCH
# carrying ONLY that section's slice; the backend merge endpoint handles partial
# payloads, so untouched data survives.
#
# SOURCE-OF-TRUTH RULE (settled):
#   Searchable fields  -> promoted COLUMNS (primarySport, position, gpa, school, ...)
#   Narrative fields   -> JSONB BLOBS (bio, intendedMajor, socialLinks, ...)
#   A form NEVER writes a searchable value into a blob — no new duplication.

import streamlit as st
from utils.sports import SPORTS, SPORT_REGISTRY
from utils.marks import parse_mark, format_mark
import requests
from utils.auth import auth_headers
def _authpost(*a, **k):   k.setdefault('headers', auth_headers()); return requests.post(*a, **k)
def _authpatch(*a, **k):  k.setdefault('headers', auth_headers()); return requests.patch(*a, **k)
def _authdelete(*a, **k): k.setdefault('headers', auth_headers()); return requests.delete(*a, **k)

from utils.config import API_BASE
API_URL = API_BASE   # backend address now comes from utils/config.py

# -- Shared PATCH helper -------------------------------------------
# Every section calls this with its own small payload. One place to own
# the request + session-refresh logic, so the forms stay DRY.
def _patch(athlete_id, payload, user):
    """Fire a PATCH with `payload`, refresh session on success. Returns True/False."""
    if not payload:
        st.info("No changes to save.")
        return False
    try:
        response = _authpatch(f"{API_URL}/api/athletes/{athlete_id}", json=payload)
        if response.status_code == 200:
            updated_user = response.json()
            # PATCH response drops `role` (not a DB column) — re-attach like auth.py does
            updated_user["role"] = user.get("role", "athlete")
            st.session_state.user = updated_user
            st.session_state.role = updated_user["role"]
            st.success("✅ Saved!")
            st.switch_page("pages/RoleRouter.py")   # re-enter via the same path login uses
            return True
        else:
            st.error(f"Update failed ({response.status_code}): {response.text}")
            return False
    except Exception as e:
        st.error(f"Couldn't reach the server: {e}")
        return False


def _athlete_id(user):
    """Shared guard — returns the UUID or None (with an error shown)."""
    aid = user.get("id")
    if not aid:
        st.error("Can't edit: no athlete ID in session. Try logging out and back in.")
    return aid


# ==================================================================
# ON THE FIELD  (searchable -> COLUMNS)
#   primarySport / position / graduationYear -> columns
#   #   sportsPlayed -> full list replace; primary always included (built in the form)
#   heightInches / weightLbs -> columns (already promoted)
#  fortyTime -> lives in football_stats now (see edit_football below)
# ==================================================================
# Must match the isIn list in backend/models/User.js
RECRUITING_STATUSES = ["Uncommitted", "Receiving Interest", "Offered",
                       "Verbally Committed", "Signed"]

def edit_on_the_field(user):
    athlete_id = _athlete_id(user)
    if not athlete_id:
        return

    on_field        = user.get("onTheField", {})
    current_primary = user.get("primarySport")   or on_field.get("primarySport", "")
    current_pos     = user.get("position")       or on_field.get("position", "")
    current_grad    = user.get("graduationYear") or on_field.get("graduationYear", None)
    current_h_in    = user.get("heightInches")
    cur_feet        = current_h_in // 12 if current_h_in else 0
    cur_inch        = current_h_in % 12 if current_h_in else 0
    current_weight  = user.get("weightLbs") or 0
    current_status  = user.get("recruitingStatus") or "Uncommitted"
    current_name    = user.get("name") or ""
    with st.form("edit_onfield_form"):
        new_name = st.text_input("Name", value=current_name, max_chars=60)
        col1, col2 = st.columns(2)
        with col1:
                      # Open the dropdown on the athlete's current sport.
            # Older accounts may hold a typed name that isn't on the list;
            # those get a "— Select —" start so the athlete picks a real one.
            if current_primary in SPORTS:
                sport_options = SPORTS
                sport_index   = SPORTS.index(current_primary)
            else:
                sport_options = ["— Select —"] + SPORTS
                sport_index   = 0
            new_primary = st.selectbox("Primary sport", sport_options, index=sport_index)
            new_grad    = st.number_input("Graduation year",
                                          value=int(current_grad) if current_grad else 2026,
                                                                                   min_value=2024, max_value=2035, step=1)
            # Open on the athlete's current status
            status_index = RECRUITING_STATUSES.index(current_status) if current_status in RECRUITING_STATUSES else 0
            new_status   = st.selectbox("Recruiting status", RECRUITING_STATUSES, index=status_index)
        with col2:
            new_pos   = st.text_input("Position", value=current_pos)
                        # One box handles adding AND removing other sports.
            # The sportsPlayed column is the only source of truth (no blob fallback).
            current_sports = user.get("sportsPlayed") or []
            current_others = [s for s in current_sports if s != current_primary]
            new_others = st.multiselect("Other sports you play", SPORTS,
                                        default=[s for s in current_others if s in SPORTS],
                                        help="Add or remove sports beyond your primary")

        st.markdown("**Measurables**")
        mcol1, mcol2, mcol3 = st.columns(3)
        with mcol1:
            new_feet = st.number_input("Height (ft)", value=int(cur_feet),
                                       min_value=0, max_value=8, step=1)
        with mcol2:
            new_inch = st.number_input("Height (in)", value=int(cur_inch),
                                       min_value=0, max_value=11, step=1)
        with mcol3:
            new_weight = st.number_input("Weight (lbs)", value=int(current_weight),
                                         min_value=0, max_value=500, step=1)
        saved = st.form_submit_button("Save On The Field")

    if saved:
        payload = {}
        clean_name = new_name.strip()
        if not clean_name:
            st.warning("Name can't be blank.")
            return
        if clean_name != current_name:
            payload["name"] = clean_name
        if new_primary != current_primary and new_primary != "— Select —":
            payload["primarySport"] = new_primary
        if new_pos != current_pos:
            payload["position"] = new_pos
        if current_grad is None or int(new_grad) != int(current_grad):
            payload["graduationYear"] = int(new_grad)
                # Rebuild the full list: primary first, then the others, no repeats.
        # Primary always stays in the list so coach sport searches find it.
        final_primary = payload.get("primarySport", current_primary)
        new_list = list(dict.fromkeys([final_primary] + new_others)) if final_primary else new_others
        
        if new_list != current_sports:
            payload["sportsPlayed"] = new_list
        new_h_in = int(new_feet) * 12 + int(new_inch)
        if new_h_in != (current_h_in or 0):
            payload["heightInches"] = new_h_in if new_h_in > 0 else None
        if int(new_weight) != (current_weight or 0):
                        payload["weightLbs"] = int(new_weight) if new_weight > 0 else None
        if new_status != current_status:
            payload["recruitingStatus"] = new_status

        _patch(athlete_id, payload, user)
        
# ==================================================================
# FOOTBALL  (per-sport details -> athlete_sports + football_stats)
#   Reads/writes /api/athletes/:id/sports/football, NOT the users PATCH.
#   Position and stat boxes are built from the sport registry, so labels,
#   ranges, and keys live in one place (utils/sports.py).
#   An empty stat box means "not set" and saves as null.
#   Shown only when Football is in sportsPlayed (backend enforces it too).
# ==================================================================
def edit_football(user):
    athlete_id = _athlete_id(user)
    if not athlete_id:
        return

    football = SPORT_REGISTRY["Football"]
    url = f"{API_URL}/api/athletes/{athlete_id}/sports/football"

    # Read the current row so the form opens filled in.
    try:
        r = requests.get(url, headers=auth_headers())
    except Exception as e:
        st.error(f"Couldn't reach the server: {e}")
        return
    if r.status_code != 200:
        st.error(f"Couldn't load Football details ({r.status_code}): {r.text}")
        return
    current = r.json()

    positions   = football["positions"]
    current_pos = current.get("position")
    pos_options = ["— Select —"] + positions
    pos_index   = pos_options.index(current_pos) if current_pos in positions else 0

    with st.form("edit_football_form"):
        new_pos = st.selectbox("Position", pos_options, index=pos_index)

        st.markdown("**Combine numbers**")
        new_stats = {}
        cols = st.columns(2)
        for i, stat in enumerate(football["stats"]):
            is_int = isinstance(stat["step"], int)
            cur = current.get(stat["key"])
            # Streamlit needs value, min, max, and step to be the same type.
            # The backend can send 31 for 31.0, so cast to match.
            if cur is not None:
                cur = int(cur) if is_int else float(cur)
            # Streamlit only lets a number box be emptied if it was created
            # with value=None. So create it empty-able, and fill in the saved
            # number through session_state (first load only, so the
            # athlete's typing isn't overwritten). Athlete ID in the key keeps
            # two logins in one browser from sharing boxes.
            widget_key = f"fb_{athlete_id}_{stat['key']}"
            if widget_key not in st.session_state:
                st.session_state[widget_key] = cur
            with cols[i % 2]:
                new_stats[stat["key"]] = st.number_input(
                    f'{stat["label"]} ({stat["unit"]})',
                    min_value=stat["min"], max_value=stat["max"], step=stat["step"],
                    value=None, placeholder="Not set", key=widget_key,
                    format=None if is_int else ("%.2f" if stat["step"] < 0.1 else "%.1f"),
                )
        saved = st.form_submit_button("Save Football")

    if saved:
        # Send only what changed.
        payload = {}
        final_pos = None if new_pos == "— Select —" else new_pos
        if final_pos != current_pos:
            payload["position"] = final_pos
        for stat in football["stats"]:
            key     = stat["key"]
            new_val = new_stats[key]
            old_val = current.get(key)
            if new_val is None and old_val is None:
                continue
            if new_val is None or old_val is None or abs(float(new_val) - float(old_val)) > 1e-6:
                payload[key] = new_val

        if not payload:
            st.info("No changes to save.")
            return
        try:
            resp = _authpatch(url, json=payload)
        except Exception as e:
            st.error(f"Couldn't reach the server: {e}")
            return
        if resp.status_code == 200:
            st.success("✅ Football saved!")
            st.switch_page("pages/RoleRouter.py")
        else:
            # Show the backend's own message (e.g. "fortyTime must be between...").
            try:
                msg = resp.json().get("error", resp.text)
            except Exception:
                               msg = resp.text
            st.error(f"Couldn't save Football ({resp.status_code}): {msg}")
# ==================================================================
# SOFTBALL  (per-sport details -> athlete_sports + softball_stats)
#   Reads/writes /api/athletes/:id/sports/softball.
#   Same pattern as Football: position + 4 fixed stats from the registry.
# ==================================================================
def edit_softball(user):
    athlete_id = _athlete_id(user)
    if not athlete_id:
        return

    softball = SPORT_REGISTRY["Softball"]
    url = f"{API_URL}/api/athletes/{athlete_id}/sports/softball"

    # Read the current row so the form opens filled in.
    try:
        r = requests.get(url, headers=auth_headers())
    except Exception as e:
        st.error(f"Couldn't reach the server: {e}")
        return
    if r.status_code != 200:
        st.error(f"Couldn't load Softball details ({r.status_code}): {r.text}")
        return
    current = r.json()

    positions   = softball["positions"]
    current_pos = current.get("position")
    pos_options = ["— Select —"] + positions
    pos_index   = pos_options.index(current_pos) if current_pos in positions else 0

    with st.form("edit_softball_form"):
        new_pos = st.selectbox("Position", pos_options, index=pos_index)

        st.markdown("**Softball numbers**")
        new_stats = {}
        cols = st.columns(2)
        for i, stat in enumerate(softball["stats"]):
            is_int = isinstance(stat["step"], int)
            cur = current.get(stat["key"])
            # Streamlit needs value, min, max, and step to be the same type.
            if cur is not None:
                cur = int(cur) if is_int else float(cur)
            # Empty-able number box: create with value=None and fill the saved
            # number through session_state on first load only (same trick as
            # Football). Athlete ID in the key keeps two logins apart.
            widget_key = f"sb_{athlete_id}_{stat['key']}"
            if widget_key not in st.session_state:
                st.session_state[widget_key] = cur
            # Decimals follow the step: 0.001 -> 3 (batting avg), 0.01 -> 2.
            if is_int:
                fmt = None
            elif stat["step"] < 0.01:
                fmt = "%.3f"
            elif stat["step"] < 0.1:
                fmt = "%.2f"
            else:
                fmt = "%.1f"
            with cols[i % 2]:
                new_stats[stat["key"]] = st.number_input(
                    f'{stat["label"]} ({stat["unit"]})',
                    min_value=stat["min"], max_value=stat["max"], step=stat["step"],
                    value=None, placeholder="Not set", key=widget_key,
                    format=fmt,
                )
        saved = st.form_submit_button("Save Softball")

    if saved:
        # Send only what changed.
        payload = {}
        final_pos = None if new_pos == "— Select —" else new_pos
        if final_pos != current_pos:
            payload["position"] = final_pos
        for stat in softball["stats"]:
            key     = stat["key"]
            new_val = new_stats[key]
            old_val = current.get(key)
            if new_val is None and old_val is None:
                continue
            if new_val is None or old_val is None or abs(float(new_val) - float(old_val)) > 1e-6:
                payload[key] = new_val

        if not payload:
            st.info("No changes to save.")
            return
        try:
            resp = _authpatch(url, json=payload)
        except Exception as e:
            st.error(f"Couldn't reach the server: {e}")
            return
        if resp.status_code == 200:
            st.success("✅ Softball saved!")
            st.switch_page("pages/RoleRouter.py")
        else:
            # Show the backend's own message (e.g. "era must be between...").
            try:
                msg = resp.json().get("error", resp.text)
            except Exception:
                msg = resp.text
                st.error(f"Couldn't save Softball ({resp.status_code}): {msg}")

# ==================================================================
# SOCCER  (per-sport details -> athlete_sports + soccer_stats)
#   Reads/writes /api/athletes/:id/sports/soccer.
#   Same pattern as Softball: position + 4 fixed stats from the registry.
#   All four stats are whole numbers, so no decimal formats needed.
# ==================================================================
def edit_soccer(user):
    athlete_id = _athlete_id(user)
    if not athlete_id:
        return

    soccer = SPORT_REGISTRY["Soccer"]
    url = f"{API_URL}/api/athletes/{athlete_id}/sports/soccer"

    # Read the current row so the form opens filled in.
    try:
        r = requests.get(url, headers=auth_headers())
    except Exception as e:
        st.error(f"Couldn't reach the server: {e}")
        return
    if r.status_code != 200:
        st.error(f"Couldn't load Soccer details ({r.status_code}): {r.text}")
        return
    current = r.json()

    positions   = soccer["positions"]
    current_pos = current.get("position")
    pos_options = ["— Select —"] + positions
    pos_index   = pos_options.index(current_pos) if current_pos in positions else 0

    with st.form("edit_soccer_form"):
        new_pos = st.selectbox("Position", pos_options, index=pos_index)

        st.markdown("**Soccer numbers** (season totals)")
        new_stats = {}
        cols = st.columns(2)
        for i, stat in enumerate(soccer["stats"]):
            cur = current.get(stat["key"])
            if cur is not None:
                cur = int(cur)
            # Empty-able number box: create with value=None and fill the saved
            # number through session_state on first load only (same trick as
            # Softball). Athlete ID in the key keeps two logins apart.
            widget_key = f"sc_{athlete_id}_{stat['key']}"
            if widget_key not in st.session_state:
                st.session_state[widget_key] = cur
            with cols[i % 2]:
                new_stats[stat["key"]] = st.number_input(
                    f'{stat["label"]} ({stat["unit"]})',
                    min_value=stat["min"], max_value=stat["max"], step=stat["step"],
                    value=None, placeholder="Not set", key=widget_key,
                )
        saved = st.form_submit_button("Save Soccer")

    if saved:
        # Send only what changed.
        payload = {}
        final_pos = None if new_pos == "— Select —" else new_pos
        if final_pos != current_pos:
            payload["position"] = final_pos
        for stat in soccer["stats"]:
            key     = stat["key"]
            new_val = new_stats[key]
            old_val = current.get(key)
            if new_val != old_val:
                payload[key] = new_val

        if not payload:
            st.info("No changes to save.")
            return
        try:
            resp = _authpatch(url, json=payload)
        except Exception as e:
            st.error(f"Couldn't reach the server: {e}")
            return
        if resp.status_code == 200:
            st.success("✅ Soccer saved!")
            st.switch_page("pages/RoleRouter.py")
        else:
            # Show the backend's own message (e.g. "saves must be between...").
            try:
                msg = resp.json().get("error", resp.text)
            except Exception:
                msg = resp.text
            st.error(f"Couldn't save Soccer ({resp.status_code}): {msg}")

# ==================================================================
# TRACK & FIELD  (per-sport details -> athlete_sports + track_marks)
#   Reads/writes /api/athletes/:id/sports/track-field.
#   "Your events" picker sits OUTSIDE the form so mark boxes appear as
#   soon as an event is picked. Mark boxes are text, so athletes type
#   10.85, 2:05.30, or 21' 6" like a results sheet. utils/marks.py
#   turns those into seconds or inches for saving.
#   Removing an event from the picker deletes its mark on save.
# ==================================================================
TRACK_SPORT = "Track & Field"


def edit_track(user):
    athlete_id = _athlete_id(user)
    if not athlete_id:
        return

    events = SPORT_REGISTRY[TRACK_SPORT]["events"]
    by_name = {e["name"]: e for e in events}
    names = [e["name"] for e in events]
    url = f"{API_URL}/api/athletes/{athlete_id}/sports/track-field"

    # Read the saved marks so the form opens filled in.
    try:
        r = requests.get(url, headers=auth_headers())
    except Exception as e:
        st.error(f"Couldn't reach the server: {e}")
        return
    if r.status_code != 200:
        st.error(f"Couldn't load Track & Field details ({r.status_code}): {r.text}")
        return
    saved_marks = r.json().get("marks") or {}

    # Picker: starts with the events that already have a mark.
    # Athlete ID in every key keeps two logins in one browser apart.
    prefix = f"tf_{athlete_id}_"
    pick_key = prefix + "events"
    if pick_key not in st.session_state:
        st.session_state[pick_key] = [n for n in names if n in saved_marks]
    picked = st.multiselect(
        "Your events", names, key=pick_key,
        help="Pick every event you compete in. Removing one deletes its mark when you save.",
    )
    picked = [n for n in names if n in picked]   # always registry order
    if not picked:
        st.caption("Pick your events above, then enter your best mark for each.")

    with st.form("edit_track_form"):
        typed = {}
        cols = st.columns(2)
        for i, name in enumerate(picked):
            ev = by_name[name]
            hint = "10.85 or 2:05.30" if ev["kind"] == "time" else "21' 6\" or 21-6"
            box_key = prefix + name
            if box_key not in st.session_state:
                st.session_state[box_key] = format_mark(ev["kind"], saved_marks.get(name))
            with cols[i % 2]:
                typed[name] = st.text_input(f"{name} best", key=box_key, placeholder=hint)
        saved = st.form_submit_button("Save Track & Field")

    if saved:
        changes, errors = {}, []
        for name in picked:
            ev = by_name[name]
            try:
                val = parse_mark(ev["kind"], typed[name])
            except ValueError as e:
                errors.append(f"{name}: {e}")
                continue
            if val is not None and not (ev["min"] <= val <= ev["max"]):
                low  = format_mark(ev["kind"], ev["min"])
                high = format_mark(ev["kind"], ev["max"])
                errors.append(f"{name}: must be between {low} and {high}")
                continue
            old = saved_marks.get(name)
            if val is None and old is None:
                continue
            if val is None or old is None or abs(val - float(old)) > 1e-6:
                changes[name] = val
        # Events taken out of the picker: delete their marks.
        for name in saved_marks:
            if name not in picked:
                changes[name] = None

        if errors:
            for msg in errors:
                st.error(msg)
            return
        if not changes:
            st.info("No changes to save.")
            return
        try:
            resp = _authpatch(url, json={"marks": changes})
        except Exception as e:
            st.error(f"Couldn't reach the server: {e}")
            return
        if resp.status_code == 200:
            # Forget what was typed so the form reloads from the saved marks.
            for k in [k for k in st.session_state if str(k).startswith(prefix)]:
                del st.session_state[k]
            st.success("✅ Track & Field saved!")
            st.switch_page("pages/RoleRouter.py")
        else:
            try:
                msg = resp.json().get("error", resp.text)
            except Exception:
                msg = resp.text
            st.error(f"Couldn't save Track & Field ({resp.status_code}): {msg}")

# ==================================================================
# IN THE CLASSROOM
#   gpa / school -> COLUMNS (searchable)
#   intendedMajor -> inTheClassroom blob (narrative)
# ==================================================================
def edit_in_the_classroom(user):
    athlete_id = _athlete_id(user)
    if not athlete_id:
        return

    classroom      = user.get("inTheClassroom", {})
    current_gpa    = user.get("gpa")    or classroom.get("gpa", None)
    current_school = user.get("school") or classroom.get("school", "")
    current_major  = classroom.get("intendedMajor", "")

    with st.form("edit_classroom_form"):
        col1, col2 = st.columns(2)
        with col1:
            new_gpa    = st.number_input("GPA",
                                         value=float(current_gpa) if current_gpa else 0.0,
                                         min_value=0.0, max_value=4.0, step=0.01, format="%.2f")
            new_school = st.text_input("School", value=current_school)
        with col2:
            new_major = st.text_input("Intended major", value=current_major)
        saved = st.form_submit_button("Save In The Classroom")

    if saved:
        payload = {}
        if current_gpa is None or float(new_gpa) != float(current_gpa):
            payload["gpa"] = round(float(new_gpa), 2)
        if new_school != current_school:
            payload["school"] = new_school
        if new_major != current_major:
            payload["inTheClassroom"] = {"intendedMajor": new_major}
        _patch(athlete_id, payload, user)


# ==================================================================
# OFF THE FIELD  (all narrative -> blob, none searchable)
# ==================================================================
def edit_off_the_field(user):
    athlete_id = _athlete_id(user)
    if not athlete_id:
        return

    off_field    = user.get("offTheField", {})
    current_bio  = off_field.get("bio", "")
    current_stmt = off_field.get("personalStatement", "")

    with st.form("edit_offfield_form"):
        new_bio  = st.text_area("Bio", value=current_bio)
        new_stmt = st.text_area("Personal statement", value=current_stmt)
        saved = st.form_submit_button("Save Off The Field")

    if saved:
        blob_changes = {}
        if new_bio != current_bio:
            blob_changes["bio"] = new_bio
        if new_stmt != current_stmt:
            blob_changes["personalStatement"] = new_stmt
        payload = {"offTheField": blob_changes} if blob_changes else {}
        _patch(athlete_id, payload, user)


# ==================================================================
# CONTACT & LINKS  (identity-level, not an IDMM dimension)
#   Email = login key -> read-only. No phone field (minor safety).
#   Social links -> offTheField.socialLinks blob; coach-facing, not public.
# ==================================================================
def edit_contact(user):
    athlete_id = _athlete_id(user)
    if not athlete_id:
        return

    off_field = user.get("offTheField", {})
    social    = off_field.get("socialLinks", {}) or {}

    st.caption("Links are shown to verified coaches — not the public.")
    with st.form("edit_contact_form"):
        st.text_input("Email (login — not editable here)",
                      value=user.get("email", ""), disabled=True)
        col1, col2 = st.columns(2)
        with col1:
            new_twitter = st.text_input("Twitter/X", value=social.get("twitter") or "")
            new_hudl    = st.text_input("Hudl",      value=social.get("hudl")    or "")
        with col2:
            new_instagram = st.text_input("Instagram", value=social.get("instagram") or "")
            new_linkedin  = st.text_input("LinkedIn",  value=social.get("linkedin")  or "")
        saved = st.form_submit_button("Save contact & links")

    if saved:
        link_changes = {}
        for key, new_val, old_val in [
            ("twitter",   new_twitter,   social.get("twitter")   or ""),
            ("instagram", new_instagram, social.get("instagram") or ""),
            ("hudl",      new_hudl,      social.get("hudl")      or ""),
            ("linkedin",  new_linkedin,  social.get("linkedin")  or ""),
        ]:
            if new_val != old_val:
                link_changes[key] = new_val or None   # None (not "") when emptied

        payload = {}
        if link_changes:
            # socialLinks is one level deeper than offTheField's shallow merge,
            # so send the WHOLE socialLinks object (existing + changes).
            payload["offTheField"] = {"socialLinks": {**social, **link_changes}}
        _patch(athlete_id, payload, user)

# ==================================================================
# HIGHLIGHTS — video upload (two-step: upload file → attach clip)
# Mirrors the _patch refresh pattern, but the upload leg is multipart.
# ==================================================================
def upload_highlight(user):
    aid = _athlete_id(user)
    if not aid:
        return

    # Show current usage against tier so the athlete knows where they stand.
    tier = user.get("tier", "basic")
    current = len(user.get("onTheField", {}).get("highlights", []))
    TIER_LIMITS = {"basic": 2, "premium": None}   # None = unlimited (display only)
    limit = TIER_LIMITS.get(tier, 2)
    if limit is not None:
        st.caption(f"Tier: **{tier}** — {current} of {limit} highlights used.")
    else:
        st.caption(f"Tier: **{tier}** — {current} highlights (unlimited).")

    title = st.text_input("Clip title", key="hl_title", placeholder="e.g. 40-yd dash")

    # Which sport is this clip for? Only sports they play. Primary is picked first.
    played = user.get("sportsPlayed") or []
    primary = user.get("primarySport")
    clip_sport = None
    if played:
        start = played.index(primary) if primary in played else 0
        clip_sport = st.selectbox(
            "Which sport is this clip for?", played, index=start, key="hl_sport"
        )
    video_file = st.file_uploader(
        "Choose a video", type=["mp4", "mov", "webm"], key="hl_file"
    )

    if st.button("Add Highlight", key="hl_submit"):
        if not video_file:
            st.warning("Pick a video file first.")
            return

        try:
            # ── Step 1: upload the file to disk, get back a URL ──
            files = {"video": (video_file.name, video_file.getvalue())}
            up = _authpost(
                f"{API_URL}/api/athletes/{aid}/highlights/upload", files=files
            )
            if up.status_code != 200:
                st.error(f"Upload failed ({up.status_code}): {up.text}")
                return
            clip_url = up.json()["url"]

            # ── Step 2: attach the clip to the athlete's highlights ──
            attach = _authpost(
                f"{API_URL}/api/athletes/{aid}/highlights",
                 json={"title": title or "Untitled", "url": clip_url, "sport": clip_sport},
            )

            # 403 = tier gate. Not an error — an upgrade moment.
            if attach.status_code == 403:
                info = attach.json()
                st.warning(
                    f"🔒 You've reached the **{info.get('tier', tier)}** limit "
                    f"of {info.get('limit', limit)} highlights. "
                    f"Upgrade to add more."
                )
                return
            if attach.status_code != 200:
                st.error(f"Attach failed ({attach.status_code}): {attach.text}")
                return

            # Success — refresh session exactly like _patch does.
            updated_user = attach.json()
            updated_user["role"] = user.get("role", "athlete")
            st.session_state.user = updated_user
            st.session_state.role = updated_user["role"]
            st.success("✅ Highlight added!")
            st.switch_page("pages/RoleRouter.py")

        except Exception as e:
            st.error(f"Couldn't reach the server: {e}")
# -- Back-compat shim ----------------------------------------------
# The old standalone "Edit My Profile" entry point still works if anything
# calls it — it just renders all four sections in sequence.
def render_edit_profile():
    user = st.session_state.get("user", {})
    if not _athlete_id(user):
        return
    st.markdown("### 🏟️ On The Field");    edit_on_the_field(user);     st.divider()
    st.markdown("### 📚 In The Classroom"); edit_in_the_classroom(user); st.divider()
    st.markdown("### 🌟 Off The Field");    edit_off_the_field(user);    st.divider()
    st.markdown("### 📇 Contact & Links");  edit_contact(user)
# ==================================================================
# HIGHLIGHTS CRUD — delete + edit-title (both free for all tiers)
# Mirror upload_highlight's success/refresh pattern.
# ==================================================================
def delete_highlight(user, url):
    aid = _athlete_id(user)
    if not aid:
        return
    try:
        r = _authdelete(
            f"{API_URL}/api/athletes/{aid}/highlights",
            json={"url": url},
        )
        if r.status_code == 200:
            updated = r.json()
            updated["role"] = user.get("role", "athlete")
            st.session_state.user = updated
            st.session_state.role = updated["role"]
            st.success("🗑 Highlight deleted.")
            st.switch_page("pages/RoleRouter.py")
        else:
            st.error(f"Delete failed ({r.status_code}): {r.text}")
    except Exception as e:
        st.error(f"Couldn't reach the server: {e}")


def edit_highlight_title(user, url, new_title):
    aid = _athlete_id(user)
    if not aid:
        return
    try:
        r = _authpatch(
            f"{API_URL}/api/athletes/{aid}/highlights",
            json={"url": url, "title": new_title},
        )
        if r.status_code == 200:
            updated = r.json()
            updated["role"] = user.get("role", "athlete")
            st.session_state.user = updated
            st.session_state.role = updated["role"]
            st.success("✏️ Title updated.")
            st.switch_page("pages/RoleRouter.py")
        else:
            st.error(f"Update failed ({r.status_code}): {r.text}")
    except Exception as e:
        st.error(f"Couldn't reach the server: {e}")
