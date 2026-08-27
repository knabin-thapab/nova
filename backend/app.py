import os
import sys
import traceback
import gradio as gr
import cv2
import numpy as np

print("=" * 60, flush=True)
print("[NOVA] AI Media Restoration Worker - Starting up...", flush=True)
print("=" * 60, flush=True)

try:
    print("[1/3] Importing core FastAPI application...", flush=True)
    from main import app as fastapi_app, _run_photo_enhancement
    from pipeline.telemetry import SystemTelemetry
    print("[1/3] [OK] FastAPI app imported successfully", flush=True)

    print("[2/3] Building Gradio Worker Dashboard...", flush=True)

    def test_enhance_image(img: np.ndarray, mode: str):
        """Quick interactive test function inside the Gradio dashboard."""
        if img is None:
            return None
        img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        enhanced_bgr = _run_photo_enhancement(img_bgr, mode=mode, scale=4)
        return cv2.cvtColor(enhanced_bgr, cv2.COLOR_BGR2RGB)

    def get_live_status():
        """Returns live system telemetry for dashboard."""
        t = SystemTelemetry.get_hardware_telemetry()
        gpu = t.get("gpu", {})
        gpu_stat = gpu.get("name", "Host CPU")
        return (
            f"**Worker Type:** `{t.get('workerType')}`\n\n"
            f"**Compute Device:** `{gpu.get('device')}` ({gpu_stat})\n\n"
            f"**CPU Usage:** `{t.get('cpuPercent')}%` | **RAM:** `{t.get('ramUsedGB')} / {t.get('ramTotalGB')} GB` (`{t.get('ramPercent')}%`)\n\n"
            f"**Available Threads:** `{t.get('threads')}`"
        )

    with gr.Blocks(title="NOVA AI Worker") as demo:
        gr.Markdown("""
        # NOVA AI Media Restoration Worker
        ### High-Performance AI Super-Resolution & Video Restoration Engine
        """)

        with gr.Row():
            with gr.Column(scale=2):
                status_box = gr.Markdown(value=get_live_status)
                refresh_btn = gr.Button("Refresh Status", size="sm")
                refresh_btn.click(fn=get_live_status, outputs=status_box)

            with gr.Column(scale=3):
                gr.Markdown("""
                ### API Endpoints Directory
                - **Health & Telemetry:** [`/api/health`](/api/health) | [`/api/telemetry`](/api/telemetry)
                - **Photo Restoration:** `POST` [`/api/enhance-image`](/docs#/default/enhance_image_api_enhance_image_post)
                - **Video Pipeline:** `POST` [`/api/jobs`](/docs#/default/create_job_api_jobs_post) | `GET` [`/api/download/{job_id}`](/docs)
                - **OpenAPI Documentation:** [`/docs`](/docs) | [`/redoc`](/redoc)
                """)

        with gr.Tab("Quick AI Test"):
            gr.Markdown("Upload a photo to test real AI enhancement directly on this worker.")
            with gr.Row():
                with gr.Column():
                    input_img = gr.Image(type="numpy", label="Input Image")
                    mode_sel = gr.Dropdown(
                        choices=["balanced", "portrait", "landscape", "anime"],
                        value="balanced",
                        label="Enhancement Mode"
                    )
                    submit_btn = gr.Button("Enhance Image", variant="primary")
                with gr.Column():
                    output_img = gr.Image(type="numpy", label="Enhanced Output (Real-ESRGAN)")

            submit_btn.click(fn=test_enhance_image, inputs=[input_img, mode_sel], outputs=output_img)

    print("[2/3] [OK] Gradio dashboard built successfully", flush=True)

    print("[3/3] Attaching FastAPI routes to Gradio ASGI application...", flush=True)
    # Include all FastAPI endpoints and middlewares directly onto Gradio app
    demo.app.mount("/storage", fastapi_app)
    for route in fastapi_app.routes:
        demo.app.routes.append(route)
    for middleware in fastapi_app.user_middleware:
        demo.app.user_middleware.append(middleware)

    app = demo.app
    print("[3/3] [OK] Combined Gradio + FastAPI ASGI application ready", flush=True)

except Exception as e:
    print("=" * 60, flush=True)
    print(f"[!] CRITICAL STARTUP ERROR: {e}", flush=True)
    traceback.print_exc(file=sys.stdout)
    sys.stdout.flush()
    print("=" * 60, flush=True)

    with gr.Blocks(title="NOVA Startup Diagnostic") as demo:
        gr.Markdown(f"# NOVA Startup Diagnostics\n```\n{traceback.format_exc()}\n```")
    app = demo.app


# Hugging Face Space & local entrypoint launcher
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print(f"[*] Launching NOVA AI Worker on 0.0.0.0:{port} via Gradio...", flush=True)
    demo.launch(
        server_name="0.0.0.0",
        server_port=port,
        show_error=True
    )
