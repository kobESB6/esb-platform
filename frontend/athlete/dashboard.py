# athlete/dashboard.py
# Athlete Dashboard — The Journey In Progress
# Building the product, becoming an active participant in their recruiting

import streamlit as st
from athlete.edit_profile import render_edit_profile   # at the top with other imports

def show_athlete_dashboard():

    # ── Access Control ────────────────────────────────────────────
    if not st.session_state.get("logged_in") or st.session_state.get("role") != "athlete":
        st.error("🔒 Access Denied. This dashboard is for Athletes only.")
        st.stop()

    # ── Pull user data from session ───────────────────────────────
    user = st.session_state.get("user", {})
    user_name = user.get("name", "Athlete")
    is_verified = user.get("isVerified", False)

    # ── Page Header + Verification Badge ──────────────────────────
    st.title("🏃 Athlete Dashboard")
    st.markdown(f"Welcome, **{user_name}**!")

    if is_verified:
        st.success("✅ Verified Athlete")
    else:
        st.warning("⏳ Unverified — complete and verify your profile to unlock full exposure")

    st.markdown("*Providing Knowledge · Cultivating Passion · Advocates for Life*")
    st.markdown("---")

    # ── Progression Block ─────────────────────────────────────────
    progression = user.get("progression", {})
    if progression:
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Rank", progression.get("rank", "Rookie"))
        with col2:
            st.metric("Level", progression.get("level", 1))
        with col3:
            st.metric("XP", progression.get("xp", 50))
        st.markdown("---")

    # ── ON THE FIELD ──────────────────────────────────────────────
    st.subheader("🏟️ On The Field")

    on_field = user.get("onTheField", {})
    # promoted columns live at the top level; fall back to the blob if needed
    position = user.get("position") or on_field.get("position", "Not set")
    primary_sport = user.get("primarySport") or on_field.get("primarySport", "Not set")
    sports_played = user.get("sportsPlayed") or on_field.get("sportsPlayed", [])
    school = user.get("school") or on_field.get("school", "Not set")
    grad_year = user.get("graduationYear") or on_field.get("graduationYear", "Not set")
    height = on_field.get("height", "Not set")
    weight = on_field.get("weight", "Not set")
    recruiting_status = on_field.get("recruitingStatus", "Not set")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown(f"**Primary Sport:** {primary_sport}")
        st.markdown(f"**Position:** {position}")
        st.markdown(f"**Height:** {height}")
        st.markdown(f"**Weight:** {weight} lbs" if weight != "Not set" else "**Weight:** Not set")
    with col2:
        st.markdown(f"**Sports Played:** {', '.join(sports_played) if sports_played else 'Not set'}")
        st.markdown(f"**School:** {school}")
        st.markdown(f"**Graduation Year:** {grad_year}")
        st.markdown(f"**Recruiting Status:** {recruiting_status}")

    st.markdown("**🎥 Highlights**")
    highlights = on_field.get("highlights", [])
    if highlights:
        for clip in highlights:
            st.markdown(f"- [{clip.get('title', 'Untitled')}]({clip.get('url', '#')})")
    else:
        st.info("No highlights added yet.")

    st.markdown("---")

    # ── IN THE CLASSROOM ──────────────────────────────────────────
    st.subheader("📚 In The Classroom")

    in_class = user.get("inTheClassroom", {})
    gpa = user.get("gpa") or in_class.get("gpa", "Not set")
    sat = in_class.get("sat")
    act = in_class.get("act")
    eligibility = in_class.get("eligibilityStatus", "Not Checked")
    clearinghouse = in_class.get("clearinghouseStatus", "Not Registered")
    transcript_verified = in_class.get("transcriptVerified", False)
    academic_achievements = in_class.get("academicAchievements", [])

    transcript_badge = " ✅" if transcript_verified else ""

    col1, col2 = st.columns(2)
    with col1:
        st.markdown(f"**GPA:** {gpa}{transcript_badge}")
        st.markdown(f"**SAT:** {sat if sat else 'Not taken'}")
        st.markdown(f"**ACT:** {act if act else 'Not taken'}")
    with col2:
        st.markdown(f"**Eligibility Status:** {eligibility}")
        st.markdown(f"**Clearinghouse:** {clearinghouse}")

    st.markdown("**🏅 Academic Achievements**")
    if academic_achievements:
        for ach in academic_achievements:
            st.markdown(f"- {ach}")
    else:
        st.info("No academic achievements added yet.")

    st.markdown("---")

    # ── OFF THE FIELD ─────────────────────────────────────────────
    st.subheader("🌍 Off The Field")

    off_field = user.get("offTheField", {})
    bio = off_field.get("bio", "")
    my_story = off_field.get("myStory", "")
    character_traits = off_field.get("characterTraits", [])
    leadership_roles = off_field.get("leadershipRoles", [])

    if bio:
        st.markdown(f"**Bio:** {bio}")

    if my_story:
        st.markdown("**My Story**")
        st.markdown(f"> {my_story}")

    if character_traits:
        st.markdown(f"**Character Traits:** {', '.join(character_traits)}")

    if leadership_roles:
        st.markdown(f"**Leadership:** {', '.join(leadership_roles)}")

    if not (bio or my_story or character_traits or leadership_roles):
        st.info("No off-the-field story added yet — this is where your character shines.")

    st.markdown("---")

    # ── EDIT PROFILE ──────────────────────────────────────────────
    with st.expander("✏️ Edit My Profile"):
        render_edit_profile()

    st.markdown("---")

    # ── LOGOUT ────────────────────────────────────────────────────
    if st.button("Log Out"):
        st.session_state.clear()
        st.switch_page("main.py")