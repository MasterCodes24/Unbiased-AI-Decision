from fastapi import FastAPI

# Initialize the FastAPI application instance
app = FastAPI()

# Define a root endpoint to serve as the "Hello World"
@app.get("/")
def read_root():
    return {"message": "Hello World"}

# Define the GET endpoint for health checks
@app.get("/health")
def health_check():
    # Return a JSON dictionary indicating the status is okay
    return {"status": "ok"}