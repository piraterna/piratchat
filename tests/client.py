import requests

USERNAME = "test"

if __name__ == "__main__":
    # register 
    #r = requests.post("http://0.0.0.0:8080/register", json={"username": USERNAME})
    #print(r.status_code, r.text)

    KEY = "5de22171ce78e520c221aaaf02344571fca8a21b9ae45e83acc6fe583e87194e"

    # login 
    r = requests.post("http://0.0.0.0:8080/login", json={"key": KEY})
    print(r.status_code, r.text)
