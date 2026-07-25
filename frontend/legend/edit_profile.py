# legend/edit_profile.py
# Per-section edit forms for legends — each callable INDEPENDENTLY so the
# dashboard can drop any one of them inline under its matching display section.
#
# Each function renders ONE st.form + handles its own save. A save fires a PATCH
# carrying ONLY that section's slice; the backend merge endpoint handles partial
# payloads, so untouched data survives.
#
# LEGEND-SPECIFIC NOTES:
#   - position / school / graduationYear are the SAME columns athletes use, but
#     on a legend they mean *played / attended / graduated*, not currently enrolled.
#   - Mentorship data lives in the `mentorship` blob (NOT `recruiting` — that's coach).
#   - offTheField.occupation is a NESTED object. Backend merge is shallow, so we
#     always send the WHOLE occupation object (same workaround as socialLinks).

import streamlit as st
import requests

API_URL = "http://localhost:3000"   # same base as utils/auth.py (no trailing /api)


# -- Shared PATCH helper -------------------------------------------
def _patch(legend_id, payload, user):
    """Fire a PATCH with `payload`, refresh session on success. Returns True/False."""
    if not payload:
        st.info("No changes to save.")
        return False
    try:
        response = requests.patch(f"{API_URL}/api/legends/{legend_id}", json=payload)
        if response.status_code == 200:
            updated_user = response.json()
            # PATCH response drops `role` (not a DB column) — re-attach like auth.py does
            updated_user["role"] = user.get("role", "legend")
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


def _legend_id(user):
    """Shared guard — returns the UUID or None (with an error shown)."""
    lid = user.get("id")
    if not lid:
        st.error("Can't edit: no legend ID in session. Try logging out and back in.")
    return lid


# ==================================================================
# ON THE FIELD  (the legend's playing career)
#   primarySport / position / school / graduationYear -> COLUMNS
#   highestLevelPlayed -> onTheField blob (narrative)
#   addSport -> sportsPlayed array (append + de-dupe server-side)
# ==================================================================
def edit_on_the_field(user):
    legend_id = _legend_id(user)
    if not legend_id:
        return

    on_field        = user.get("onTheField", {})
    current_primary = user.get("primarySport")   or on_field.get("primarySport", "")
    current_pos     = user.get("position")       or ""
    current_school  = user.get("school")         or ""
    current_grad    = user.get("graduationYear")
    current_level   = on_field.get("highestLevelPlayed") or ""

    with st.form("edit_legend_onfield_form"):
        col1, col2 = st.columns(2)
        with col1:
            new_primary = st.text_input("Primary sport", value=current_primary)
            new_pos     = st.text_input("Position played", value=current_pos)
            new_school  = st.text_input("School attended", value=current_school)
        with col2:
            new_level = st.text_input("Highest level played", value=current_level,
                                      help="e.g. NCAA D1, NAIA, Professional")
            # Legends graduated in the past — range runs backward, not forward.
            new_grad  = st.number_input("Graduation year",
                                        value=int(current_grad) if current_grad else 2010,
                                        min_value=1950, max_value=2035, step=1)
            add_sport = st.text_input("Add another sport (optional)", value="",
                                      help="Adds one more sport beyond your primary")
        saved = st.form_submit_button("Save On The Field")

    if saved:
        payload = {}
        if new_primary != current_primary:
            payload["primarySport"] = new_primary
        if new_pos != current_pos:
            payload["position"] = new_pos
        if new_school != current_school:
            payload["school"] = new_school
        if current_grad is None or int(new_grad) != int(current_grad):
            payload["graduationYear"] = int(new_grad)
        if new_level != current_level:
            payload["onTheField"] = {"highestLevelPlayed": new_level}
        if add_sport.strip():
            payload["addSport"] = add_sport.strip()
        _patch(legend_id, payload, user)


# ==================================================================
# OFF THE FIELD  (bio + occupation + mentorship focus)
#   All narrative -> offTheField blob.
#   occupation is NESTED -> send the whole object every time (shallow merge).
# ==================================================================
def edit_off_the_field(user):
    legend_id = _legend_id(user)
    if not legend_id:
        return

    off_field  = user.get("offTheField", {})
    occupation = off_field.get("occupation", {}) or {}

    current_bio      = off_field.get("bio", "")
    current_focus    = ", ".join(off_field.get("mentorshipFocus", []) or [])
    current_role     = occupation.get("current", "")
    current_industry = occupation.get("industry", "")
    current_company  = occupation.get("company") or ""
    current_years    = occupation.get("yearsInField", "")
    current_path     = occupation.get("careerPath", "")
    current_network  = occupation.get("openToNetworking", True)

    with st.form("edit_legend_offfield_form"):
        new_bio = st.text_area("Bio", value=current_bio, height=100)

        st.markdown("**Occupation**")
        col1, col2 = st.columns(2)
        with col1:
            new_role     = st.text_input("Current role", value=current_role)
            new_industry = st.text_input("Industry", value=current_industry)
            new_company  = st.text_input("Company", value=current_company)
        with col2:
            new_years   = st.text_input("Years in field", value=current_years)
            new_path    = st.text_input("Career path", value=current_path)
            new_network = st.checkbox("Open to networking", value=bool(current_network))

        new_focus = st.text_input("Mentorship focus", value=current_focus,
                                  help="Comma-separated, e.g. distance running, recruiting navigation")
        saved = st.form_submit_button("Save Off The Field")

    if saved:
        blob = {}
        if new_bio != current_bio:
            blob["bio"] = new_bio

        focus_list = [f.strip() for f in new_focus.split(",") if f.strip()]
        if new_focus != current_focus:
            blob["mentorshipFocus"] = focus_list

        # Occupation: if ANY sub-field changed, resend the WHOLE object.
        # The backend merge is shallow — a partial occupation would wipe
        # the keys we left out. Same workaround athlete uses for socialLinks.
        occupation_changed = (
            new_role     != current_role     or
            new_industry != current_industry or
            new_company  != current_company  or
            new_years    != current_years    or
            new_path     != current_path     or
            new_network  != current_network
        )
        if occupation_changed:
            blob["occupation"] = {
                "current": new_role,
                "industry": new_industry,
                "company": new_company or None,
                "yearsInField": new_years,
                "careerPath": new_path,
                "openToNetworking": new_network,
            }

        _patch(legend_id, {"offTheField": blob} if blob else {}, user)


# ==================================================================
# MENTORSHIP  (the legend↔athlete blob — NOT `recruiting`)
#   athletesMentored / legendConnections are system-managed lists;
#   the legend only controls capacity, style, and active status here.
# ==================================================================
def edit_mentorship(user):
    legend_id = _legend_id(user)
    if not legend_id:
        return

    mentorship     = user.get("mentorship", {}) or {}
    current_active = mentorship.get("isActiveMentor", True)
    current_max    = mentorship.get("maxMentees", 5)
    current_style  = mentorship.get("mentorshipStyle", "")

    with st.form("edit_legend_mentorship_form"):
        col1, col2 = st.columns(2)
        with col1:
            new_active = st.checkbox("Currently accepting mentees", value=bool(current_active))
            new_max    = st.number_input("Mentee capacity",
                                         value=int(current_max) if current_max else 5,
                                         min_value=0, max_value=50, step=1)
        with col2:
            new_style = st.text_input("Mentorship style", value=current_style,
                                      help="e.g. direct, hands-off, weekly check-ins")
        saved = st.form_submit_button("Save Mentorship")

    if saved:
        blob = {}
        if new_active != current_active:
            blob["isActiveMentor"] = new_active
        if int(new_max) != int(current_max):
            blob["maxMentees"] = int(new_max)
        if new_style != current_style:
            blob["mentorshipStyle"] = new_style

        _patch(legend_id, {"mentorship": blob} if blob else {}, user)