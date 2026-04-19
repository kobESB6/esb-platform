import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import streamlit as st
from utils.sidebar import show_sidebar

# Hide default nav
show_sidebar()

# Ensure session is valid
if "role" not in st.session_state or not st.session_state.get("logged_in"):
    st.error("Access Denied. Please log in first.")
    st.stop()

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