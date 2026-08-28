import gradio as gr
from fastapi.testclient import TestClient
from main import app as fastapi_app

with gr.Blocks(title="NOVA AI Worker") as demo:
    gr.Markdown("# NOVA AI Worker")

# Insert all FastAPI routes at top of Gradio's internal app routes
for r in fastapi_app.routes:
    demo.app.routes.insert(0, r)


client = TestClient(demo.app)

# Test /api/health
res = client.get("/api/health")
print("Health check status:", res.status_code)
print("Health check response:", res.json())

# Test /api/telemetry
res_t = client.get("/api/telemetry")
print("Telemetry status:", res_t.status_code)
print("Telemetry response:", res_t.json())
