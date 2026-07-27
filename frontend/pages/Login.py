import streamlit as st
import requests
from utils.auth import authenticate
import time

st.set_page_config(page_title="Login - ESB", layout="centered")

# --- Custom Title Styling ---
st.markdown("""
    <style>
    .form-title {
        font-size: 2.5em;
        color: #FF6600;
        font-weight: bold;
        text-align: center;
        margin-bottom: 1rem;
        margin-top: 2rem;
    }
    </style>
""", unsafe_allow_html=True)

st.markdown('<div class="form-title">Log In to Your Account</div>', unsafe_allow_html=True)

# --- Form Inputs ---
username = st.text_input("Email or Username")
password = st.text_input("Password", type="password")
remember = st.checkbox("Remember me")

# --- Form Submission ---
if st.button("Log In", key="login_button"):
    user = authenticate(username, password)
    
    if user:
        st.success(f"Welcome back, {user['name']}!")
        st.session_state.user = user
        st.session_state.role = user["role"]
        st.session_state.logged_in = True
        if remember:
            st.session_state.remember = True

        with st.spinner("Redirecting..."):
            time.sleep(1.5)

        st.switch_page("pages/RoleRouter.py")  # ✅ clean redirect

    else:
        st.error("Invalid username or password.")


# --- Forgot password ---
with st.expander("Forgot password?"):
    reset_email = st.text_input("Enter your account email", key="reset_email")
    if st.button("Send reset link", key="send_reset"):
        try:
            r = requests.post(
                "http://localhost:3000/api/auth/request-reset",
                json={"email": reset_email}
            )
            # Enumeration-safe: same message regardless of whether the email exists.
            st.info(r.json().get("message",
                "If an account exists, a reset link has been generated."))
        except Exception as e:
            st.error(f"Could not reach the server: {e}")
