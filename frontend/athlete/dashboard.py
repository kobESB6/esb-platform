import streamlit as st

from utils.sidebar import show_sidebar

# === TEST MODE SETUP ===
TEST_MODE = True
TEST_ROLE = "athlete"  # Change if you're testing different roles

if TEST_MODE:
    st.session_state.logged_in = True
    st.session_state.role = TEST_ROLE
    st.session_state.user = {"name": f"Test {TEST_ROLE.title()}"}

# === ACCESS CONTROL (Skip if in test mode) ===
if not TEST_MODE:
    if not st.session_state.get("logged_in") or st.session_state.get("role") != TEST_ROLE:
        st.error("🚫 Access Denied.")
        st.stop()

# === DASHBOARD UI ===
st.set_page_config(page_title="Athlete Dashboard", layout="wide")
st.title("🏃 Athlete Dashboard")
st.markdown(f"Welcome, **{st.session_state.user['name']}**!")

# --- Sections ---
st.subheader("🏋️‍♂️ My Workouts")
st.info("Track and view your training routines.")

st.subheader("📈 Performance Tracker")
st.info("View progress in strength, speed, and skills.")

st.subheader("🧠 Mindset Journal")
st.info("Log your daily reflections and goals.")

st.subheader("👥 Fan/Supporter Feature (Coming Soon!)")
st.button("⭐ Followed By (Preview)", disabled=True)


def show_athlete_dashboard():
    st.set_page_config(page_title="🏃 Athlete Dashboard", layout="wide")
    st.title("🏃 Athlete Dashboard")
    st.markdown(f"Welcome, **{st.session_state.user['name']}**!")

    st.subheader("📊 Performance Metrics")
    st.write("Track your speed, strength, and GPA here.")

    st.subheader("📸 Upload Game Highlights")
    st.file_uploader("Upload video", type=["mp4", "mov"])

    st.subheader("📝 College Interest Form")
    st.write("Fill out forms from interested colleges.")
