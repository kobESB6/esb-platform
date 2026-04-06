import requests

API_URL = "http://localhost:3000"

def authenticate(email, password):
    try:
        response = requests.post(
            f"{API_URL}/api/coaches/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            coach = data["coach"]
            coach["role"] = "coach"
            return coach
        else:
            return None
    except Exception as e:
        print(f"Auth error: {e}")
        return None

def create_user(username, password, name, role):
    try:
        response = requests.post(
            f"{API_URL}/api/coaches/register",
            json={
                "name": name,
                "email": username,
                "password": password,
                "school": "TBD",
                "sport": "TBD"
            }
        )
        return response.status_code == 201
    except:
        return False
