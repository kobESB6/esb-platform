# coach/edit_profile.py
# Per-section edit forms for coaches — each callable INDEPENDENTLY so the
# dashboard can drop any one inline under its matching display section.
# Mirrors athlete/edit_profile.py (the proven template). Same merge endpoint
# shape: each save PATCHes ONLY its section's slice; backend spread-merges.
#
# SOURCE-OF-TRUTH RULE (settled):
#   Searchable fields -> promoted COLUMNS (primarySport, school, coachType)
#   Narrative fields  -> JSONB BLOBS (bio, coachingPhilosophy, academicSupport)
#   Recruiting targets -> wishlist COLUMN (canonical; NOT onTheField.wishList)
#   A form NEVER writes a searchable value into a blob.

import streamlit as st
import requests

API_URL = "http://localhost:3000"  #  same base as athlete edit + auth.py

# -- Shared PATCH helper ----------------------------------------------
# Identical to the athlete helper except the endpoint.  # COACH: /api/coaches/

def _patch(coach_id, payload, user): 
    """Fire a PATCH with `payload`, refresh session on success. Returns True/False."""
    if not payload:
        st.info("No changes to save")
        return False
    try: 
        response = requests.patch(f"{API_URL}/api/coaches/{coach_id}", json=payload)
        if response.status_code == 200:
            updated_user = response.json()
            # PATCH response drops `role`  (not a DB column) - re-attach, like auth.py
            updated_user["role"] = user.get("role", "coach") # COACH: default role 
            st.session_state.user = updated_user
            st.session_state.role = updated_user["role"]
            st.success("✅ Saved!")
            st.switch_page("pages/RoleRouter.py") #re enter via login's path
            return True
        else: 
           st.error(f"Update failed ({response.status_code}): {response.text}")
           return False
    except Exception as e:
        st.error(f"Couldn't reach the server: {e}")
        return False        


def _coach_id(user):
    """Shared guard - returns the UUID or None (with an error shown)."""
    cid = user.get("id")
    if not cid:
        st.error("Can't edit: no coach ID in session. Try logging out and back in.")
    return cid

# ==================================================================
# OFF THE FIELD  (narrative -> offTheField blob; lean for coaches)
#   bio = core trust field (always shown).
#   coachingPhilosophy / playerDevelopmentApproach = OPTIONAL,
#   behind a toggle — athlete-facing pitch content, activate later.
# ==================================================================
def edit_off_the_field(user):
    coach_id = _coach_id(user)
    if not coach_id:
        return

    off_field        = user.get("offTheField", {})
    current_bio      = off_field.get("bio", "")
    current_phil     = off_field.get("coachingPhilosophy", "")
    current_approach = off_field.get("playerDevelopmentApproach", "")

    # Toggle lives OUTSIDE the form: a form batches everything and only reruns
    # on submit, so a toggle inside it wouldn't reveal fields until you'd already
    # submitted. Outside, flipping it reruns the page and the fields appear.
    show_optional = st.toggle(
        "Add coaching philosophy & development approach (optional)",
        # default it ON if either field already has content, so saved data
        # isn't hidden behind a toggle the coach has to remember to flip.
        value=bool(current_phil or current_approach),
        key="coach_offfield_optional",
    )

    with st.form("edit_coach_offfield_form"):
        new_bio = st.text_area("Bio", value=current_bio,
                               help="Shown to athletes and verified coaches.")
        # Only render the optional inputs when the toggle is on. When it's off,
        # new_phil/new_approach fall back to current values so the diff below
        # sees "no change" and we never accidentally blank them out.
        if show_optional:
            new_phil     = st.text_area("Coaching philosophy", value=current_phil)
            new_approach = st.text_area("Player development approach", value=current_approach)
        else:
            new_phil, new_approach = current_phil, current_approach

        saved = st.form_submit_button("Save Off The Field")

    if saved:
        blob_changes = {}
        if new_bio != current_bio:
            blob_changes["bio"] = new_bio
        if new_phil != current_phil:
            blob_changes["coachingPhilosophy"] = new_phil
        if new_approach != current_approach:
            blob_changes["playerDevelopmentApproach"] = new_approach

        payload = {"offTheField": blob_changes} if blob_changes else {}
        _patch(coach_id, payload, user)

    # ==================================================================
# CONTACT & LINKS  (identity-level, not an IDMM dimension)
#   Email = login key -> read-only. No phone field (minor safety).
#   Social links -> offTheField.socialLinks; shown to verified users,
#   the coach's verification/trust surface.
# ==================================================================
def edit_contact(user):
    coach_id = _coach_id(user)
    if not coach_id:
        return

    off_field = user.get("offTheField", {})
    social    = off_field.get("socialLinks", {}) or {}   # `or {}` guards a null

    st.caption("Links help verify your identity — shown to verified users, not public.")
    with st.form("edit_coach_contact_form"):
        # Email is the login key — display it, but never editable here.
        st.text_input("Email (login — not editable here)",
                      value=user.get("email", ""), disabled=True)
        col1, col2 = st.columns(2)
        with col1:
            new_linkedin = st.text_input("LinkedIn", value=social.get("linkedin") or "")
        with col2:
            new_twitter  = st.text_input("Twitter/X", value=social.get("twitter") or "")
        saved = st.form_submit_button("Save contact & links")

    if saved:
        # Diff each link: only include the ones that changed. Empty string
        # becomes None (not "") so a cleared field stores null, matching the
        # registration shape { twitter: null, linkedin: null }.
        link_changes = {}
        for key, new_val, old_val in [
            ("linkedin", new_linkedin, social.get("linkedin") or ""),
            ("twitter",  new_twitter,  social.get("twitter")  or ""),
        ]:
            if new_val != old_val:
                link_changes[key] = new_val or None

        payload = {}
        if link_changes:
            # socialLinks sits one level below offTheField's shallow merge, so
            # send the WHOLE socialLinks object (existing spread + changes).
            payload["offTheField"] = {"socialLinks": {**social, **link_changes}}
        _patch(coach_id, payload, user)    