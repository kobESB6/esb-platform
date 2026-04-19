import streamlit as st

def hide_default_nav():
    st.markdown("""
        <style>
        [data-testid="stSidebarNav"] {display: none;}
        </style>
    """, unsafe_allow_html=True)

def show_sidebar():
    hide_default_nav()
    
    role = st.session_state.get("role", "")
    user = st.session_state.get("user", {})
    name = user.get("name", role.title())

    st.sidebar.markdown(f"### Welcome, {name}!")
    st.sidebar.markdown(f"**Role:** {role.title()}")
    st.sidebar.markdown("---")

    if role == "athlete":
        if st.sidebar.button("My Dashboard"):
            st.switch_page("pages/AthleteDashboard.py")
        if st.sidebar.button("My Profile"):
            st.switch_page("pages/AthleteDashboard.py")

    elif role == "coach":
        if st.sidebar.button("My Dashboard"):
            st.switch_page("pages/CoachDashboard.py")
        if st.sidebar.button("Find Athletes"):
            st.switch_page("pages/CoachDashboard.py")

    elif role == "legend":
        if st.sidebar.button("My Legacy"):
            st.switch_page("pages/LegendDashboard.py")
        if st.sidebar.button("Mentoring Portal"):
            st.switch_page("pages/LegendDashboard.py")

    st.sidebar.markdown("---")
    if st.sidebar.button("Log Out"):
        st.session_state.clear()
        st.switch_page("main.py")
