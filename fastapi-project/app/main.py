from fastapi import FastAPI

app = FastAPI(title="FastAPI + Poetry Example")

@app.get("/")
async def read_root():
    return {"message": "Hello, FastAPI with Poetry!"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/items")
async def create_item(name: str, price: float):
    return {"item_name": name, "item_price": price}
