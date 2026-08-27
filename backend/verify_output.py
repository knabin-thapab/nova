import sys
sys.path.insert(0, r"C:\Users\Nabin thapa\.gemini\antigravity-ide\scratch\nova\backend")
from pipeline.media_probe import probe_video
from pipeline.validator import VideoValidator

output = r"C:\Users\Nabin thapa\.gemini\antigravity-ide\scratch\nova\backend\storage\outputs\job_13ad07a1_restored.mp4"
meta = probe_video(output)
print("OUTPUT VIDEO PROBE:")
for k, v in meta.items():
    print("  {}: {}".format(k, v))

passed, report = VideoValidator.verify_output(output, 600, 600, 60.0, 359)
print()
if passed:
    print("VERIFICATION: PASS")
else:
    print("VERIFICATION: FAIL")
for k, v in report.items():
    print("  {}: {}".format(k, v))
