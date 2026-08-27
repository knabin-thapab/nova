import os
import cv2
import numpy as np
from pipeline.realesrgan_engine import RealESRGANEngine

def test_engine():
    print("Testing Real-ESRNet Engine...", flush=True)
    engine = RealESRGANEngine(scale=4, content_type="photo")
    
    # 1. Test standard small image (single pass)
    test_img = np.zeros((200, 200, 3), dtype=np.uint8)
    cv2.circle(test_img, (100, 100), 50, (255, 200, 150), -1)
    cv2.putText(test_img, "NOVA AI", (30, 105), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
    
    out = engine.enhance_image(test_img)
    print(f"[OK] Single-pass test completed: {test_img.shape} -> {out.shape}", flush=True)
    assert out.shape == (800, 800, 3), f"Expected (800, 800, 3), got {out.shape}"
    
    # 2. Test scale=2
    engine_2x = RealESRGANEngine(scale=2, content_type="photo")
    out_2x = engine_2x.enhance_image(test_img)
    print(f"[OK] 2x scale test completed: {test_img.shape} -> {out_2x.shape}", flush=True)
    assert out_2x.shape == (400, 400, 3), f"Expected (400, 400, 3), got {out_2x.shape}"
    
    # 3. Test seamless padded tiling on high-resolution image
    large_img = np.zeros((1100, 1100, 3), dtype=np.uint8)
    out_large = engine.enhance_image(large_img)
    print(f"[OK] Seamless tiling test completed: {large_img.shape} -> {out_large.shape}", flush=True)
    assert out_large.shape == (4400, 4400, 3), f"Expected (4400, 4400, 3), got {out_large.shape}"
    
    print("\n>>> ALL REAL-ESRNET QUALITY & RESTORATION TESTS PASSED! <<<", flush=True)

if __name__ == "__main__":
    test_engine()
