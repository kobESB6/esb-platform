# utils/auth.py
# Authentication utility — tries all three user type endpoints
# Returns the matched user with their correct role attached
import requests
import streamlit as st

API_URL = "http://localhost:3000"


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

    try:
        response = requests.post(url, json=payload)
        return response.status_code == 201
    except Exception as e:
        print(f"Registration error: {e}")
        return False


def auth_headers():
    token = st.session_state.get('token', '')
    return {'Authorization': f'Bearer {token}'} if token else {}
