from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello, FastAPI with Poetry!"}

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_create_item():
    response = client.post("/items?name=Widget&price=9.99")
    assert response.status_code == 200
    assert response.json()["item_name"] == "Widget"
