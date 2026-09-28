# pages/ResetPassword.py — consumes a reset link, lets the user set a new password.
# Reached via the link from /api/auth/request-reset:
#   http://localhost:8501/ResetPassword?email=...&token=...
# Reads email+token from the URL (st.query_params), posts to /api/auth/reset-password.

import streamlit as st
import requests

from utils.config import API_BASE
API_URL = API_BASE   # backend address now comes from utils/config.py

st.set_page_config(page_title="Reset Password - ESB", layout="centered")
st.title("Reset Your Password")

# Read the matched pair from the URL. st.query_params returns plain strings.
email = st.query_params.get("email")
token = st.query_params.get("token")

# If someone lands here without a link, don't show a broken form.
if not email or not token:
    st.warning(
        "This page is for completing a password reset from your reset link. "
        "If you need to reset your password, start from the Login page."
    )
    st.stop()

st.caption(f"Resetting password for: {email}")

# Two fields — new password + confirm. Not inside st.form so we can validate
# the confirm-match before firing the request (simple, explicit).
new_password = st.text_input("New password", type="password")
confirm_password = st.text_input("Confirm new password", type="password")

if st.button("Set New Password"):
    # Client-side guards first — fast feedback, no wasted request.
    if not new_password or not confirm_password:
        st.error("Please fill in both password fields.")
    elif new_password != confirm_password:
        st.error("Passwords do not match.")
    elif len(new_password) < 8:
        st.error("Password must be at least 8 characters.")
    else:
        try:
            resp = requests.post(
                f"{API_URL}/api/auth/reset-password",
                json={"email": email, "token": token, "newPassword": new_password}
            )
            if resp.status_code == 200:
                st.success("Password reset! You can now log in with your new password.")
                st.page_link("pages/Login.py", label="Go to Login")
            else:
                # Backend returns the generic 'Invalid or expired reset token' here.
                detail = resp.json().get("error", "Something went wrong.")
                st.error(detail)
        except Exception as e:
            st.error(f"Could not reach the server: {e}")
