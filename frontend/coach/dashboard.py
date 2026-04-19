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

    st.subheader("🔍 Search Athletes")
    st.info("AI-powered athlete search coming in Week 2!")

    st.subheader("📁 View Scouting Reports")
    st.info("Athlete profiles and scouting reports coming soon!")

    st.subheader("✉️ Messages / Inquiries")
    st.info("Messaging feature coming soon!")