# utils/auth.py
# Authentication utility — tries all three user type endpoints
# Returns the matched user with their correct role attached

import requests

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
                return user

        except Exception as e:
            print(f"Auth error on {endpoint['url']}: {e}")
            continue

    # No match found across any endpoint
    return None


def create_user(username, password, name, role):
    # Route registration to the correct endpoint based on role
    endpoints = {
        "athlete": f"{API_URL}/api/athletes/register",
        "coach":   f"{API_URL}/api/coaches/register",
        "legend":  f"{API_URL}/api/legends/register"
    }

    url = endpoints.get(role, endpoints["athlete"])

    try:
        response = requests.post(
            url,
            json={
                "name": name,
                "email": username,
                "password": password,
                "primarySport": "TBD",
                "sport": "TBD",
                "school": "TBD",
                "coachType": "college"
            }
        )
        return response.status_code == 201
    except Exception as e:
        print(f"Registration error: {e}")
        return False