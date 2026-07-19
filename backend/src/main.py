from fastapi import FastAPI # core api framework
from fastapi.middleware.cors import CORSMiddleware # security tool for controlling the sites that can talk to the backend
from api.incidents import router as incidents_router # import logiv from incidents.py

app = FastAPI(title="SOC Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # any website can access this api (wouldnt work with the local host routes for some reason but need to implement the frontent url)
    allow_credentials=True,
    allow_methods=["*"], # all types of http requests
    allow_headers=["*"],
)

app.include_router(incidents_router) # instead of writing all endpoints, it uses fastapi to check incidents.py for the routes


@app.get("/")
def root():
    return {"status": "API running"} # confirmation message