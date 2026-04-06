import streamlit as st

# ⬇ Add the test session setup here
TEST_MODE = True
TEST_ROLE = "coach"
if TEST_MODE:
    if "logged_in" not in st.session_state:
        st.session_state.logged_in = True
    if "role" not in st.session_state:
        st.session_state.role = TEST_ROLE
    if "user" not in st.session_state:
        st.session_state.user = {"name": f"Test {TEST_ROLE.title()}"}

# ✅ Access Control
if not st.session_state.logged_in or st.session_state.role != TEST_ROLE:
    st.error("Access Denied.")
    st.stop()

# # 🏆 Legend Dashboard Code
# st.set_page_config(page_title="Legend Dashboard", layout="wide")
# st.title("🏆 Legend Dashboard")
# st.markdown(f"Welcome, **{st.session_state.user['name']}**!")

# st.subheader("🎥 Upload Highlights & Stories")
# st.info("Uploader coming soon!")

# st.subheader("👥 Mentor Athletes (Coming Soon)")

# st.subheader("🏅 Career Achievements")
import streamlit as st

if "logged_in" not in st.session_state or not st.session_state.logged_in:
    st.error("You must be logged in to access this page.")
    st.stop()

if st.session_state.role != "coach":
    st.error("Access denied.")
    st.stop()

st.set_page_config(page_title="Coach Dashboard", layout="wide")
st.title("🎓 Coach Dashboard")
st.markdown(f"Welcome, **{st.session_state.user['name']}**!")

st.subheader("🔍 Search Athletes")
# Placeholder: filters, search box

st.subheader("📁 View Scouting Reports")
# Placeholder: athlete profiles, downloads

st.subheader("✉️ Messages / Inquiries")
# Placeholder: inbox or contact form
