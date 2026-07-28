from django.test import Client


def test_health_endpoint():
    client = Client()
    res = client.get("/health/")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert res.json()["service"] == "rhemavoice-api"
