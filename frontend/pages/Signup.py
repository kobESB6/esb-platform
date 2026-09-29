import streamlit as st
import time
from utils.auth import create_user
from utils.sports import SPORTS as SPORTS_LIST

st.set_page_config(page_title="Join ESB", layout="centered")

# Canonical sport list — single source so searchable columns stay consistent.
# Athlete & legend pick their OWN primarySport; coach picks their OWN coaching sport.
# No sport is ever assigned TO an athlete here — that ownership question belongs to
# the future coach-creates-athlete/roster subsystem, which must let athletes override.
SPORTS = ["— Select —"] + SPORTS_LIST

SPORTS = ["— Select —", "Football", "Basketball", "Baseball", "Soccer",
          "Track & Field", "Volleyball", "Softball", "Wrestling", "Tennis",
          "Golf", "Swimming", "Cross Country", "Lacrosse", "Other"]

# --- UI: Branding ---
st.image("media/esb_background.png", use_container_width=True)

# --- Custom Styling ---
st.markdown("""
    <style>
    .form-container {
        background-color: #ffffffdd;
        padding: 3rem;
        border-radius: 12px;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
        max-width: 600px;
        margin: 2rem auto;
        text-align: center;
    }
    .form-title {
        font-size: 2.5em;
        color: #FF6600;
        font-weight: bold;
        margin-bottom: 1rem;
    }
    .form-button {
        background-color: #FF6600;
        color: white;
        padding: 0.8rem 2rem;
        font-size: 1rem;
        font-weight: bold;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    .form-button:hover {
        background-color: #cc5200;
        transform: scale(1.05);
    }
    .login-link {
        display: block;
        margin-top: 1.5rem;
        font-size: 0.95rem;
        color: #003366;
        font-weight: bold;
    }
    </style>
""", unsafe_allow_html=True)

# --- Signup Form UI ---
st.markdown('<div class="form-container">', unsafe_allow_html=True)
st.markdown('<div class="form-title">Create Your ESB Account</div>', unsafe_allow_html=True)

name = st.text_input("Full Name")
username = st.text_input("Email or Username")
role = st.selectbox("Choose a Role", ["Athlete", "Coach", "Legend"])
password = st.text_input("Password", type="password")

# --- Role-specific fields (Signature A: the form owns role-shape) ---
extra = {}
if role == "Athlete":
    extra["primarySport"] = st.selectbox("Primary Sport", SPORTS)
    extra["position"] = st.text_input("Position")
    extra["school"] = st.text_input("School")
    extra["graduationYear"] = st.number_input(
        "Graduation Year", min_value=2024, max_value=2035, value=2027, step=1
    )
elif role == "Coach":
    extra["school"] = st.text_input("School / Organization")
    extra["sport"] = st.selectbox("Sport", SPORTS)
    coach_type_label = st.radio(
        "Coaching Level", ["High School", "College"], horizontal=True
    )
    extra["coachType"] = "highschool" if coach_type_label == "High School" else "college"
elif role == "Legend":
    extra["primarySport"] = st.selectbox("Primary Sport", SPORTS)

if st.button("Sign Up", key="signup_button"):
    # Base validation — shared fields + a role selected
    if not name or not username or not password or role not in ["Athlete", "Coach", "Legend"]:
        st.warning("Please fill in all fields and select a role.")
    # Sport must be an actual pick, not the placeholder
    elif extra.get("primarySport") == "— Select —" or extra.get("sport") == "— Select —":
        st.warning("Please select a sport.")
    # Role-specific text fields must be non-empty
    elif any(isinstance(v, str) and not v.strip() for v in extra.values()):
        st.warning("Please fill in all fields for your role.")
    else:
        success = create_user(username, password, name, role.lower(), extra)
        if success:
            st.session_state.user = {
                "name": name,
                "role": role.lower(),
            }
            st.session_state.logged_in = True
            st.session_state.role = role.lower()
            st.success(f"Welcome to ESB, {name}!")
            with st.spinner("Redirecting..."):
                time.sleep(1.5)
            st.switch_page("pages/RoleRouter.py")  # ✅ Use central router
        else:
            st.error("An account with this username already exists.")

st.markdown('</div>', unsafe_allow_html=True)

# --- Login redirect button ---
if st.button("Already have an account? Log in here"):
    st.switch_page("pages/Login.py")
