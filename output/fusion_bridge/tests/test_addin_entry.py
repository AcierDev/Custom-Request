import importlib.util
import sys
import types
import unittest
from pathlib import Path
from unittest import mock


DIRECT_MODULE_NAME = "fusion_bridge_direct_entry"


class AddinEntryTests(unittest.TestCase):
    def test_direct_file_load_can_import_local_bridge_package(self):
        addin_path = Path(__file__).resolve().parents[1] / "FusionBridge.py"
        core = types.ModuleType("adsk.core")
        core.CustomEventHandler = object
        fusion = types.ModuleType("adsk.fusion")
        adsk = types.ModuleType("adsk")
        adsk.core = core
        adsk.fusion = fusion
        spec = importlib.util.spec_from_file_location(
            DIRECT_MODULE_NAME,
            addin_path,
        )
        module = importlib.util.module_from_spec(spec)

        with mock.patch.dict(
            sys.modules,
            {"adsk": adsk, "adsk.core": core, "adsk.fusion": fusion},
        ):
            spec.loader.exec_module(module)

        self.assertEqual(module.__package__, "")


if __name__ == "__main__":
    unittest.main()
