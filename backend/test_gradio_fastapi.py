import gradio as gr
from fastapi.testclient import TestClient
from main import app as fastapi_app

with gr.Blocks(title="NOVA AI Worker") as demo:
    gr.Markdown("# NOVA AI Worker")

# Mount our custom FastAPI routes onto Gradio's internal FastAPI app
demo.app.mount("/api", fastapi_app)
demo.app.mount("/storage", fastapi_app)

client = TestClient(demo.app)

# Test /api/health
res = client.get("/api/health")
print("Health check status:", res.status_code)
print("Health check response:", res.json())

# Test /api/telemetry
res_t = client.get("/api/telemetry")
print("Telemetry status:", res_t.status_code)
print("Telemetry response:", res_t.json())
