import streamlit as st
from utils.sidebar import hide_default_nav

def show_coach_dashboard():
    hide_default_nav()
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

    # Shared sections — both coach types get these
    st.subheader("✉️ Messages / Inquiries")
    st.info("Messaging feature coming soon!")