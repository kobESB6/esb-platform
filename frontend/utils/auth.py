# utils/auth.py
# Authentication utility — tries all three user type endpoints
# Returns the matched user with their correct role attached
import json
import requests
import streamlit as st
import streamlit.components.v1 as components

from utils.config import API_BASE
API_URL = API_BASE   # backend address now comes from utils/config.py

COOKIE_NAME = "esb_token"
COOKIE_MAX_AGE = 7 * 24 * 60 * 60   # 7 days, same as the backend token's expiresIn '7d'


def authenticate(email, password):
    # Define all three login endpoints with their role labels
    endpoints = [
        {"url": f"{API_URL}/api/athletes/login", "role": "athlete", "key": "athlete"},
        {"url": f"{API_URL}/api/coaches/login",  "role": "coach",   "key": "coach"},
        {"url": f"{API_URL}/api/legends/login",  "role": "legend",  "key": "legend"},
    ]
    for endpoint in endpoints:
        try:
            response = requests.post(
                endpoint["url"],
                json={"email": email, "password": password}
            )
            if response.status_code == 200:
                data = response.json()
                # Pull the user object using the right key
                user = data[endpoint["key"]]
                # Attach the role so RoleRouter knows where to send them
                user["role"] = endpoint["role"]
                return user, data.get("token")
        except Exception as e:
            print(f"Auth error on {endpoint['url']}: {e}")
            continue
    # No match found across any endpoint
    return None, None


def create_user(username, password, name, role, extra):
    # Signature A — dumb pipe. This helper does NOT know what fields each
    # role needs; the form (Signup.py) assembles the role-specific `extra`
    # dict and hands it over. We just merge the three always-shared fields
    # with `extra` and POST to the right route.
    endpoints = {
        "athlete": f"{API_URL}/api/athletes/register",
        "coach":   f"{API_URL}/api/coaches/register",
        "legend":  f"{API_URL}/api/legends/register",
    }
    url = endpoints.get(role, endpoints["athlete"])

    # Shared fields every route requires, plus the role-specific `extra`.
    payload = {
        "name": name,
        "email": username,
        "password": password,
        **extra,
    }

       # Returns (user, error). error is None on success, or one of:
    #   "unreachable" — server is off, unreachable, or too slow to answer
    #   "duplicate"   — server said 409, email already registered
    #   "other"       — any other failure (bad field, server crash)
    try:
        response = requests.post(url, json=payload, timeout=5)
    except requests.exceptions.RequestException as e:
        print(f"Registration error: {e}")
        return None, "unreachable"

    if response.status_code == 201:
        # Server wraps the new user under the role name: {"coach": {...}}
        data = response.json()
        return data.get(role) or data, None
    if response.status_code == 409:
        return None, "duplicate"
    print(f"Registration failed: {response.status_code} {response.text}")
    return None, "other"

def auth_headers():
    token = st.session_state.get('token', '')
    return {'Authorization': f'Bearer {token}'} if token else {}


# ── Stay-logged-in cookie ─────────────────────────────────────────

def _write_cookie(value, max_age=None):
    # Streamlit can't write cookies, so we render an invisible HTML block.
    # Its JavaScript sets the cookie on the main page (parent.document),
    # because the block itself runs inside a small iframe.
    # No max_age = cookie lasts until the browser closes. max_age=0 = delete it.
    cookie = f"{COOKIE_NAME}={value}; path=/; SameSite=Strict"
    if max_age is not None:
        cookie += f"; max-age={max_age}"
    components.html(f"<script>parent.document.cookie = {json.dumps(cookie)};</script>", height=0)


def save_session_cookie():
    # Called by RoleRouter. Writes the cookie once per session.
    # "Remember me" checked = 7 days. Unchecked = until the browser closes.
    if st.session_state.get("logged_in") and not st.session_state.get("cookie_saved"):
        max_age = COOKIE_MAX_AGE if st.session_state.get("remember") else None
        _write_cookie(st.session_state.token, max_age)
        st.session_state.cookie_saved = True


def restore_session():
    # Called by RoleRouter before the Access Denied check.
    # After a refresh, session_state is empty but the browser still sends
    # the cookie. We ask the backend who that token belongs to and refill
    # the session. Returns True if the user is logged in.
    if st.session_state.get("logged_in"):
        return True
    if st.session_state.get("logged_out"):
        return False   # just logged out, so ignore the old cookie
    token = st.context.cookies.get(COOKIE_NAME)
    if not token:
        return False
    try:
        r = requests.get(f"{API_URL}/api/auth/me",
                         headers={"Authorization": f"Bearer {token}"}, timeout=5)
    except Exception as e:
        # Backend unreachable: keep the cookie. A server hiccup shouldn't log you out.
        print(f"Restore error: {e}")
        return False
    if r.status_code != 200:
        _write_cookie("", 0)   # bad or expired token, so delete it
        return False
    user = r.json()["user"]
    st.session_state.user = user
    st.session_state.role = user["role"]
    st.session_state.token = token
    st.session_state.logged_in = True
    st.session_state.cookie_saved = True   # already in the browser, don't rewrite it
    return True


def logout():
    # One shared Log Out for all three dashboards.
    st.session_state.clear()
    st.session_state.logged_out = True     # blocks restore_session from reusing the old cookie
    st.session_state.clear_cookie = True   # tells main.py to delete the cookie
    st.switch_page("main.py")


def finish_logout():
    # Called at the top of main.py. Deletes the cookie right after a logout.
    if st.session_state.pop("clear_cookie", False):
        _write_cookie("", 0)