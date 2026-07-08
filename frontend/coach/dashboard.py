import streamlit as st
from utils.sidebar import hide_default_nav
from coach.edit_profile import edit_off_the_field, edit_contact

def show_coach_dashboard():
    hide_default_nav()
    # Hide the whole sidebar on the coach view (Option A — sidebar removed).
    # hide_default_nav() above hides Streamlit's auto page-list; this hides
    # the custom sidebar RoleRouter draws. Coach-only — athlete/legend keep theirs.
    st.markdown(
        "<style>[data-testid='stSidebar'] {display: none;}</style>",
        unsafe_allow_html=True,
    )
    if "logged_in" not in st.session_state or not st.session_state.logged_in:
        st.error("You must be logged in to access this page.")
        st.stop()
    if st.session_state.role != "coach":
        st.error("Access denied.")
        st.stop()

    st.title("🎓 Coach Dashboard")
    st.markdown(f"Welcome, **{st.session_state.user['name']}**!")
    
    # Branch on coach type — value set at registration: 'highschool' | 'college'
    coach_type = st.session_state.user.get('coachType')

    if coach_type == 'college':
        st.subheader("🎯 Recruiting Wishlist")
        st.info("Build your target athlete wishlist — AI matching coming soon.")
    elif coach_type == 'highschool':
        st.subheader("📋 Your Roster")
        st.markdown("Track and manage your roster below.")
    else:
        st.warning("Coach type not set on your account. Please contact support or re-register.")
# Off The Field — shared by both coach types (bio = trust surface)
    st.subheader("🌟 Off The Field")
    off_field = st.session_state.user.get("offTheField", {})
    bio = off_field.get("bio", "")
    if bio:
        st.markdown(bio)
    else:
        st.caption("No bio yet — add one below.")

    with st.expander("✏️ Edit Off The Field"):
        edit_off_the_field(st.session_state.user)
# Contact & Links — shared; the coach's verification surface
    st.subheader("📇 Contact & Links")
    with st.expander("✏️ Edit Contact & Links"):
        edit_contact(st.session_state.user)
        
    # Shared sections — both coach types get these
    st.subheader("✉️ Messages / Inquiries")
    st.info("Messaging feature coming soon!")
    # Log Out — relocated from the removed sidebar
    if st.button("Log Out"):
        st.session_state.clear()
        st.switch_page("main.py")
