import sys
from pathlib import Path

# Make the repo root importable so `import core...` works under pytest.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
