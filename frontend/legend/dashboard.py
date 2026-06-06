# legend/dashboard.py
# Legend Dashboard — The Finished Product
# Giving back, celebrating legacy, mentoring the next generation

import streamlit as st
import requests

API_URL = "http://localhost:3000/api"

def show_legend_dashboard():

    # ── Access Control ────────────────────────────────────────────
    if not st.session_state.get("logged_in") or st.session_state.get("role") != "legend":
        st.error("🔒 Access Denied. This dashboard is for Legends only.")
        st.stop()

    # ── Pull user data from session ───────────────────────────────
    user = st.session_state.get("user", {})
    user_name = user.get("name", "Legend")

    # ── Page Header ───────────────────────────────────────────────
    st.title("🏆 Legend Dashboard")
    st.markdown(f"Welcome back, **{user_name}**!")
    st.markdown("*Providing Knowledge · Cultivating Passion · Advocates for Life*")
    st.markdown("---")

    # ── Progression Block ─────────────────────────────────────────
    progression = user.get("progression", {})
    if progression:
        rank = progression.get("rank", "Alumni")
        xp = progression.get("xp", 50)
        level = progression.get("level", 1)

        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Rank", rank)
        with col2:
            st.metric("Level", level)
        with col3:
            st.metric("XP", xp)
        st.markdown("---")

    # ── ON THE FIELD ──────────────────────────────────────────────
    st.subheader("🏟️ On The Field")

    on_field = user.get("onTheField", {})
    primary_sport = on_field.get("primarySport", "Not set")
    sports_played = on_field.get("sportsPlayed", [])
    highest_level = on_field.get("highestLevelPlayed", "Not set")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown(f"**Primary Sport:** {primary_sport}")
        st.markdown(f"**Highest Level:** {highest_level}")
    with col2:
        st.markdown(f"**Sports Played:** {', '.join(sports_played) if sports_played else 'Not set'}")

    st.markdown("**Career History**")
    career_history = on_field.get("careerHistory", [])
    if career_history:
        for entry in career_history:
            st.markdown(f"- {entry.get('school')} · {entry.get('sport')} · {entry.get('level')} · {entry.get('yearsStart')}–{entry.get('yearsEnd')}")
    else:
        st.info("No career history added yet.")

    st.markdown("**Media Archive**")
    media_archive = on_field.get("mediaArchive", [])
    if media_archive:
        for item in media_archive:
            st.markdown(f"- [{item.get('title')}]({item.get('url')}) · {item.get('type')} · Source: {item.get('source')}")
    else:
        st.info("No media uploaded yet.")

    st.markdown("---")

    # ── IN THE CLASSROOM ──────────────────────────────────────────
    st.subheader("📚 In The Classroom")

    in_class = user.get("inTheClassroom", {})
    colleges = in_class.get("collegesAttended", [])
    high_schools = in_class.get("highSchoolsAttended", [])

    st.markdown("**High Schools Attended**")
    if high_schools:
        for hs in high_schools:
            st.markdown(f"- {hs.get('school')} · {hs.get('sport')} · {hs.get('years')}")
    else:
        st.info("No high school history added yet.")

    st.markdown("**Colleges Attended**")
    if colleges:
        for college in colleges:
            st.markdown(f"- {college.get('school')} · {college.get('degree')} · {college.get('years')}")
    else:
        st.info("No college history added yet.")

    st.markdown("---")

    # ── OFF THE FIELD ─────────────────────────────────────────────
    st.subheader("🌍 Off The Field")

    off_field = user.get("offTheField", {})
    bio = off_field.get("bio", "")
    occupation = off_field.get("occupation", {})
    mentorship_focus = off_field.get("mentorshipFocus", [])

    if bio:
        st.markdown(f"**Bio:** {bio}")

    if occupation:
        st.markdown(f"**Current Role:** {occupation.get('current', 'Not set')} at {occupation.get('company') or occupation.get('industry', 'Not set')}")
        st.markdown(f"**Career Path:** {occupation.get('careerPath', 'Not set')}")

    if mentorship_focus:
        st.markdown(f"**Mentorship Focus:** {', '.join(mentorship_focus)}")

    st.markdown("---")

    # ── MENTORSHIP ────────────────────────────────────────────────
    st.subheader("👥 Mentorship")

    mentorship = user.get("mentorship", {})
    athletes_mentored = mentorship.get("athletesMentored", [])
    legend_connections = mentorship.get("legendConnections", [])
    max_mentees = mentorship.get("maxMentees", 5)

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Athletes Mentored", len(athletes_mentored))
    with col2:
        st.metric("Legend Connections", len(legend_connections))
    with col3:
        st.metric("Mentee Capacity", max_mentees)

    st.info("Mentorship connections coming in the next build.")
    st.markdown("---")

    # ── LOGOUT ────────────────────────────────────────────────────
    if st.button("Log Out"):
        st.session_state.clear()
        st.switch_page("main.py")