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
import requests

API_URL = "http://localhost:3000"   # same base as utils/auth.py (no trailing /api)


# -- Shared PATCH helper -------------------------------------------
# Every section calls this with its own small payload. One place to own
# the request + session-refresh logic, so the forms stay DRY.
def _patch(athlete_id, payload, user):
    """Fire a PATCH with `payload`, refresh session on success. Returns True/False."""
    if not payload:
        st.info("No changes to save.")
        return False
    try:
        response = requests.patch(f"{API_URL}/api/athletes/{athlete_id}", json=payload)
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
#   addSport -> sportsPlayed array (append + de-dupe server-side)
#   NOTE: height / weight / fortyTime are NOT yet promoted columns.
#         TODO(sports-editor session): promote to columns via migration,
#         then add those inputs here writing to the new columns.
# ==================================================================
def edit_on_the_field(user):
    athlete_id = _athlete_id(user)
    if not athlete_id:
        return

    on_field        = user.get("onTheField", {})
    current_primary = user.get("primarySport")   or on_field.get("primarySport", "")
    current_pos     = user.get("position")       or on_field.get("position", "")
    current_grad    = user.get("graduationYear") or on_field.get("graduationYear", None)

    with st.form("edit_onfield_form"):
        col1, col2 = st.columns(2)
        with col1:
            new_primary = st.text_input("Primary sport", value=current_primary)
            new_grad    = st.number_input("Graduation year",
                                          value=int(current_grad) if current_grad else 2026,
                                          min_value=2024, max_value=2035, step=1)
        with col2:
            new_pos   = st.text_input("Position", value=current_pos)
            add_sport = st.text_input("Add another sport (optional)", value="",
                                      help="Adds one more sport beyond your primary")
        saved = st.form_submit_button("Save On The Field")

    if saved:
        payload = {}
        if new_primary != current_primary:
            payload["primarySport"] = new_primary
        if new_pos != current_pos:
            payload["position"] = new_pos
        if current_grad is None or int(new_grad) != int(current_grad):
            payload["graduationYear"] = int(new_grad)
        if add_sport.strip():
            payload["addSport"] = add_sport.strip()
        _patch(athlete_id, payload, user)


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
