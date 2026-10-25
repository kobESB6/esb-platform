# athlete/dashboard.py
# Athlete Dashboard — The Journey In Progress
# Building the product, becoming an active participant in their recruiting

import streamlit as st
# Per-section edit forms — each rendered inline under its matching display section.
from athlete.edit_profile import (
     edit_on_the_field,
    edit_football,
    edit_softball,
    edit_soccer,
    edit_track,
    edit_in_the_classroom,
    edit_off_the_field,
    edit_contact,
    upload_highlight,
    delete_highlight, 
    edit_highlight_title,
)

from utils.config import API_BASE
from utils.auth import logout
from utils.sports import SPORT_REGISTRY
from utils.sport_card import fetch_sport_row, render_sport_card
MEDIA_BASE = API_BASE   # backend origin that serves /uploads, from utils/config.py
def show_athlete_dashboard():

    # -- Access Control --------------------------------------------
    if not st.session_state.get("logged_in") or st.session_state.get("role") != "athlete":
        st.error("🔒 Access Denied. This dashboard is for Athletes only.")
        st.stop()

    # -- Pull user data from session -------------------------------
    user = st.session_state.get("user", {})
    user_name = user.get("name", "Athlete")
    is_verified = user.get("isVerified", False)

    # -- Page Header + Verification Badge --------------------------
    st.title("🏃 Athlete Dashboard")
    st.markdown(f"Welcome, **{user_name}**!")

    if is_verified:
        st.success("✅ Verified Athlete")
    else:
        st.warning("⏳ Unverified — complete and verify your profile to unlock full exposure")

    st.markdown("*Providing Knowledge · Cultivating Passion · Advocates for Life*")
    st.markdown("---")

    # -- Progression Block -----------------------------------------
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

    # -- ON THE FIELD ----------------------------------------------
    st.subheader("🏟️ On The Field")

    on_field = user.get("onTheField", {})
    # promoted columns live at the top level; fall back to the blob if needed
    position = user.get("position") or on_field.get("position", "Not set")
    primary_sport = user.get("primarySport") or on_field.get("primarySport", "Not set")
    sports_played = user.get("sportsPlayed") or on_field.get("sportsPlayed", [])
    school = user.get("school") or on_field.get("school", "Not set")
    grad_year = user.get("graduationYear") or on_field.get("graduationYear", "Not set")
    # column-first (heightInches/weightLbs); format inches -> ft/in for display
    _h_in = user.get("heightInches")
    height = f"{_h_in // 12}'{_h_in % 12}\"" if _h_in else "Not set"
    _w_lbs = user.get("weightLbs")
    weight = f"{_w_lbs} lbs" if _w_lbs else "Not set"
    recruiting_status = user.get("recruitingStatus") or "Not set"   # column only; blob copy retired Oct 3

    col1, col2 = st.columns(2)
    with col1:
        st.markdown(f"**Primary Sport:** {primary_sport}")
        st.markdown(f"**Position:** {position}")
        st.markdown(f"**Height:** {height}")
        st.markdown(f"**Weight:** {weight}")
    with col2:
        st.markdown(f"**Sports Played:** {', '.join(sports_played) if sports_played else 'Not set'}")
        st.markdown(f"**School:** {school}")
        st.markdown(f"**Graduation Year:** {grad_year}")
        st.markdown(f"**Recruiting Status:** {recruiting_status}")

       # -- SPORT CARDS: one per sport the registry has a look for (Football now) --
        card_sports = [s for s in sports_played if SPORT_REGISTRY.get(s, {}).get("look")]

    # Group clips by sport. A clip with no sport, or a sport with no card,
    # goes under the primary sport's card.
    highlights = on_field.get("highlights", [])
    home = user.get("primarySport") if user.get("primarySport") in card_sports else None
    clips_by_sport = {s: [] for s in card_sports}
    loose = []   # clips with no card to sit under
    for clip in highlights:
        s = clip.get("sport")
        if s in clips_by_sport:
            clips_by_sport[s].append(clip)
        elif home:
            clips_by_sport[home].append(clip)
        else:
            loose.append(clip)

        # Clips store a RELATIVE url (/uploads/...); the backend serves them at
    # MEDIA_BASE. Absolute URL so the player AND title link hit the API host.
        # R2 clips arrive with a fresh signed playUrl (good for 1 hour). Look it
    # up by the clip's url (its name tag). Old disk clips have no playUrl,
    # so they still use MEDIA_BASE.
    _play = {c.get("url"): c.get("playUrl") for c in highlights if c.get("playUrl")}

    def _full_url(url):
        if url in _play:
            return _play[url]
        return url if url.startswith("http") else f"{MEDIA_BASE}{url}"

    def _show_clip(clip):
        url = clip.get("url", "")
        title = clip.get("title", "Untitled")
        full_url = _full_url(url)
        edit_key = f"editing_{url}"
        confirm_key = f"confirming_del_{url}"

        # Title + ✏️ 🗑 in one row. The video plays on the card now.
        col_title, col_edit, col_del = st.columns([4, 1, 1])
        with col_title:
            st.markdown(f"[{title}]({full_url})")
        with col_edit:
            if st.button("✏️", key=f"editbtn_{url}"):
                st.session_state[edit_key] = True
        with col_del:
            if st.button("🗑", key=f"delbtn_{url}"):
                st.session_state[confirm_key] = True

        # Edit-title field. Appears when ✏️ is clicked.
        if st.session_state.get(edit_key):
            new_title = st.text_input("New title", value=title, key=f"newtitle_{url}")
            c1, c2 = st.columns([1, 1])
            with c1:
                if st.button("Save", key=f"savetitle_{url}"):
                    edit_highlight_title(user, url, new_title)
            with c2:
                if st.button("Cancel", key=f"canceltitle_{url}"):
                    st.session_state[edit_key] = False
                    st.rerun()

        # Delete confirmation. Appears when 🗑 is clicked.
        if st.session_state.get(confirm_key):
            st.warning(f"Delete **{title}**? This can't be undone.")
            c1, c2 = st.columns([1, 1])
            with c1:
                if st.button("Yes, delete", key=f"confirmdel_{url}"):
                    delete_highlight(user, url)
            with c2:
                if st.button("Keep it", key=f"keepdel_{url}"):
                    st.session_state[confirm_key] = False
                    st.rerun()

    if card_sports:
        card_cols = st.columns(min(len(card_sports), 3))
        for i, sport in enumerate(card_sports):
            with card_cols[i % len(card_cols)]:
                card_clips = [
                    {"title": c.get("title", "Untitled"), "url": _full_url(c.get("url", ""))}
                    for c in clips_by_sport[sport]
                ]
                render_sport_card(sport, fetch_sport_row(user.get("id"), sport), user, card_clips)

    # Clips with no card to sit on (athlete has no sport cards yet).
    if loose:
        st.markdown("**🎥 Highlights**")
        for clip in loose:
            if clip.get("url"):
                st.video(_full_url(clip["url"]))

    if not highlights:
        st.info("No highlights added yet.")
    else:
        # Rename and delete live here, so the card stays clean for sharing.
        with st.expander("⚙️ Manage highlights"):
            for clip in highlights:
                _show_clip(clip)
    with st.expander("🎥 Add Highlight"):
        upload_highlight(user)

    with st.expander("✏️ Edit On The Field"):
        edit_on_the_field(user)

    # Football section shows only for athletes who play Football.
    if "Football" in (user.get("sportsPlayed") or []):
        with st.expander("🏈 Edit Football"):
            edit_football(user)

    # Softball section shows only for athletes who play Softball.
    if "Softball" in (user.get("sportsPlayed") or []):
        with st.expander("🥎 Edit Softball"):
            edit_softball(user)

    # Soccer section shows only for athletes who play Soccer.
    if "Soccer" in (user.get("sportsPlayed") or []):
        with st.expander("⚽ Edit Soccer"):
            edit_soccer(user)

    # Track & Field section shows only for athletes who run Track.
    if "Track & Field" in (user.get("sportsPlayed") or []):
        with st.expander("🏃 Edit Track & Field"):
            edit_track(user)

    st.markdown("---")

    # -- IN THE CLASSROOM ------------------------------------------
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

    with st.expander("✏️ Edit In The Classroom"):
        edit_in_the_classroom(user)

    st.markdown("---")

    # -- OFF THE FIELD ---------------------------------------------
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

    with st.expander("✏️ Edit Off The Field"):
        edit_off_the_field(user)

    st.markdown("---")

    # -- CONTACT & LINKS -------------------------------------------
    st.subheader("📇 Contact & Links")
    social = off_field.get("socialLinks", {}) or {}
    any_link = any(social.get(k) for k in ("twitter", "instagram", "hudl", "linkedin"))
    if any_link:
        if social.get("twitter"):   st.markdown(f"**Twitter/X:** {social['twitter']}")
        if social.get("instagram"): st.markdown(f"**Instagram:** {social['instagram']}")
        if social.get("hudl"):      st.markdown(f"**Hudl:** {social['hudl']}")
        if social.get("linkedin"):  st.markdown(f"**LinkedIn:** {social['linkedin']}")
    else:
        st.info("No links added yet.")

    with st.expander("✏️ Edit Contact & Links"):
        edit_contact(user)

    st.markdown("---")

    # -- LOGOUT ----------------------------------------------------
    if st.button("Log Out"):
        logout()