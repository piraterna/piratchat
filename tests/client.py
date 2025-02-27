import requests

USERNAME = "test0"

if __name__ == "__main__":
    # register
    r = requests.post("http://0.0.0.0:8080/register", json={"username": USERNAME})
    print(r.status_code, r.text)

    if r.status_code == 201:
        key = r.json()["key"]
        print(key)

        # login
        r = requests.post("http://0.0.0.0:8080/login", json={"key": key})
        print(r.status_code, r.text)

        if r.status_code == 200:
            print("registered & logged in!")
