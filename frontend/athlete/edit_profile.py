# athlete/edit_profile.py
# Edit-profile form for athletes.
# Sends ONLY changed fields as a PATCH — matches the backend merge semantics:
#   scalar columns → plain value, array column → addSport, JSONB blob → nested object.
# On success, updates st.session_state.user so the dashboard reflects edits immediately.

import streamlit as st
import requests

API_URL = "http://localhost:3000"   # same base as utils/auth.py (no trailing /api)


def render_edit_profile():
    user = st.session_state.get("user", {})

    # ── Guard: we NEED the athlete's UUID to build the PATCH URL ──
    # If login didn't return `id`, stop here with a clear message rather
    # than firing a broken request at /api/athletes/None.
    athlete_id = user.get("id")
    if not athlete_id:
        st.error("Can't edit: no athlete ID in session. Try logging out and back in.")
        return

    st.subheader("✏️ Edit Profile")

    # ── Prefill current values (mirror the dashboard's read precedence) ──
    # School: promoted column first, blob fallback — same idiom as dashboard.py
    on_field = user.get("onTheField", {})
    current_school = user.get("school") or on_field.get("school", "")

    # Bio lives in the offTheField JSONB blob
    off_field = user.get("offTheField", {})
    current_bio = off_field.get("bio", "")

    # ── The form ──
    # st.form batches inputs and only runs on submit — no rerun per keystroke.
    with st.form("edit_profile_form"):
        new_school = st.text_input("School", value=current_school)
        new_bio    = st.text_area("Bio", value=current_bio)
        add_sport  = st.text_input("Add a sport (optional)", value="",
                                   help="Type one sport to add it to your list")

        submitted = st.form_submit_button("Save changes")

    # Nothing happens until the button is pressed
    if not submitted:
        return

    # ── Build the payload: ONLY include fields that actually changed ──
    # This is what makes it a PATCH. Unchanged fields are never sent,
    # so the backend never touches them.
    payload = {}

    # School — only if it changed (and isn't just whitespace noise)
    if new_school != current_school:
        payload["school"] = new_school

    # Bio — wrap in offTheField so the backend merges it into the blob.
    # Send even if "" — clearing a bio is a legit edit (the backend uses
    # !== undefined, so "" saves correctly).
    if new_bio != current_bio:
        payload["offTheField"] = {"bio": new_bio}

    # Add-sport — only if they typed something. Backend de-dupes via Set,
    # so a repeat is harmless.
    if add_sport.strip():
        payload["addSport"] = add_sport.strip()

    # If they hit Save without changing anything, don't fire a pointless request
    if not payload:
        st.info("No changes to save.")
        return

    # ── Fire the PATCH ──
    try:
        response = requests.patch(
            f"{API_URL}/api/athletes/{athlete_id}",
            json=payload
        )

        if response.status_code == 200:
            updated_user = response.json()
            # The PATCH response omits password but also drops `role`
            # (it's not a DB column). Re-attach it so RoleRouter/guards
            # keep working, exactly like auth.py does after login.
            updated_user["role"] = user.get("role", "athlete")
            # Refresh session so the dashboard shows new values immediately
            st.session_state.user = updated_user
            st.session_state.role = updated_user["role"]   # keep all three keys in sync, like Login.py does
            st.success("✅ Profile updated!")
            st.switch_page("pages/RoleRouter.py")   # re-enter via the same path login uses # re-enter via the same path login uses
        else:
            st.error(f"Update failed ({response.status_code}): {response.text}")

    except Exception as e:
        st.error(f"Couldn't reach the server: {e}")