import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import streamlit as st
from utils.sidebar import hide_default_nav
from utils.auth import restore_session, save_session_cookie

# Hide default nav
hide_default_nav()

# After a refresh, session_state is empty. Try to rebuild it from the cookie.
# Already logged in? restore_session() just says yes and does nothing.
if not restore_session():
    st.error("Access Denied. Please log in first.")
    if st.button("Go to login"):
        st.switch_page("pages/Login.py")
    st.stop()

# Logged in. Save the cookie. (This only does work the first time per session.)
save_session_cookie()

role = st.session_state.role.lower()

if role == "athlete":
    from athlete.dashboard import show_athlete_dashboard
    show_athlete_dashboard()
elif role == "coach":
    from coach.dashboard import show_coach_dashboard
    show_coach_dashboard()
elif role == "legend":
    from legend.dashboard import show_legend_dashboard
    show_legend_dashboard()
else:
    st.error("Unknown role. Please log in again.")
    st.session_state.clear()