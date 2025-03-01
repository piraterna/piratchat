import requests
import sys

if __name__ == "__main__":
    if len(sys.argv) != 2:
        exit(1)

    USERNAME = sys.argv[1]

    print("** registering up")
    r = requests.post("http://0.0.0.0:8080/register", json={"username": USERNAME})
    print(r.status_code, r.text)

    if r.status_code == 201:
        key = r.json()["key"]
        print(key)

        print("** logging in")
        r = requests.post("http://0.0.0.0:8080/login", json={"key": key})
        print(r.status_code, r.text)
        print("cookies:", r.cookies)

        if r.status_code == 200:
            print("registered & logged in!")

            print("** logging out")
            r = requests.get("http://0.0.0.0:8080/logout", cookies=r.cookies)
            print(r.status_code)
