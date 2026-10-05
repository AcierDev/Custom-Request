import json
import os
import signal
import struct
import subprocess
import sys
import time
import unittest
import zlib
from pathlib import Path
from tempfile import TemporaryDirectory
from render import render, verify_result
from test_schema import packet

TEST = {'width': 1, 'height': 1, 'ready_seconds': 10, 'exit_seconds': 10,
        'shutdown_seconds': 1, 'poll_seconds': 0.02, 'bit_depth': 8, 'rgb': 2}
PNG_SIGNATURE = b'\x89PNG\r\n\x1a\n'


def png_chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))


def valid_png(compressed=None):
    header = struct.pack('>IIBBBBB', TEST['width'], TEST['height'], TEST['bit_depth'], TEST['rgb'], 0, 0, 0)
    pixels = zlib.compress(b'\x00\xff\xff\xff') if compressed is None else compressed
    return PNG_SIGNATURE + png_chunk(b'IHDR', header) + png_chunk(b'IDAT', pixels) + png_chunk(b'IEND', b'')


def wait_for(predicate, seconds):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if predicate(): return True
        time.sleep(TEST['poll_seconds'])
    return predicate()


class RenderJobTests(unittest.TestCase):
    def test_existing_output_is_never_overwritten(self):
        with TemporaryDirectory() as temporary:
            folder = Path(temporary)
            source = folder / 'design.json'; source.write_text(json.dumps(packet()))
            output = folder / 'finished'; output.mkdir()
            marker = output / 'important.txt'; marker.write_text('keep')
            with self.assertRaises(FileExistsError): render(source, output=output)
            self.assertEqual(marker.read_text(), 'keep')
            self.assertEqual([path.name for path in output.iterdir()], ['important.txt'])

    def test_invalid_design_does_not_start_or_create_a_render_job(self):
        with TemporaryDirectory() as temporary:
            folder = Path(temporary); source = folder / 'broken.json'; source.write_text('{}')
            output = folder / 'new-job'
            with self.assertRaises(ValueError): render(source, output=output)
            self.assertFalse(output.exists())

    def test_missing_image_and_incomplete_status_never_report_success(self):
        with TemporaryDirectory() as temporary:
            folder = Path(temporary); (folder / 'scene.blend').write_bytes(b'fixture')
            (folder / 'result.json').write_text(json.dumps({'status': 'rendered', 'width': 854, 'height': 480}))
            with self.assertRaises(FileNotFoundError): verify_result(folder)
            (folder / 'result.json').write_text(json.dumps({'status': 'prepared'}))
            with self.assertRaises(RuntimeError): verify_result(folder)

    def test_invalid_png_is_not_accepted_as_a_finished_image(self):
        with TemporaryDirectory() as temporary:
            folder = Path(temporary); (folder / 'scene.blend').write_bytes(b'fixture')
            (folder / 'render.png').write_bytes(b'not a PNG')
            (folder / 'result.json').write_text(json.dumps({'status': 'rendered', 'width': 854, 'height': 480}))
            with self.assertRaises(RuntimeError): verify_result(folder)

    def test_png_must_have_complete_decodable_pixels_and_valid_chunks(self):
        with TemporaryDirectory() as temporary:
            folder = Path(temporary); (folder / 'scene.blend').write_bytes(b'fixture')
            (folder / 'result.json').write_text(json.dumps({'status': 'rendered', 'width': TEST['width'], 'height': TEST['height']}))
            image = valid_png()
            for broken in (image[:24], image[:-12], image[:-1], valid_png(b'invalid zlib'), valid_png(zlib.compress(b'\x00'))):
                with self.subTest(length=len(broken)):
                    (folder / 'render.png').write_bytes(broken)
                    with self.assertRaises(RuntimeError): verify_result(folder)
            corrupt = bytearray(image); corrupt[-1] ^= 1
            (folder / 'render.png').write_bytes(corrupt)
            with self.assertRaises(RuntimeError): verify_result(folder)
            (folder / 'render.png').write_bytes(image)
            self.assertEqual(verify_result(folder)['status'], 'rendered')

    def test_termination_signals_stop_the_owned_blender_process(self):
        for stop_signal in (signal.SIGTERM, signal.SIGHUP):
            with self.subTest(signal=stop_signal), TemporaryDirectory() as temporary:
                folder = Path(temporary); source = folder / 'design.json'; source.write_text(json.dumps(packet()))
                output = folder / 'job'; executable = folder / 'fake-blender'
                executable.write_text(f'#!{sys.executable}\n' + '''import os, signal, sys
from pathlib import Path
folder = Path(sys.argv[sys.argv.index('--output') + 1])
def stop(signum, frame):
    (folder / 'stopped').touch()
    sys.exit(0)
signal.signal(signal.SIGTERM, stop)
(folder / 'child-pid').write_text(str(os.getpid()))
while True: signal.pause()
''')
                executable.chmod(0o755)
                launcher = subprocess.Popen([sys.executable, str(Path(__file__).with_name('render.py')),
                                             str(source), '--output', str(output), '--blender', str(executable)],
                                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                child_pid = None
                try:
                    self.assertTrue(wait_for(lambda: (output / 'child-pid').exists(), TEST['ready_seconds']))
                    child_pid = int((output / 'child-pid').read_text())
                    launcher.send_signal(stop_signal); launcher.wait(timeout=TEST['exit_seconds'])
                    self.assertTrue(wait_for(lambda: (output / 'stopped').exists(), TEST['shutdown_seconds']),
                                    'The render launcher left its Blender process running.')
                    with self.assertRaises(ProcessLookupError): os.kill(child_pid, 0)
                    self.assertEqual(json.loads((output / 'failure.json').read_text())['status'], 'failed')
                finally:
                    if launcher.poll() is None: launcher.kill(); launcher.wait()
                    if child_pid is not None:
                        try: os.killpg(child_pid, signal.SIGKILL)
                        except ProcessLookupError: pass


if __name__ == '__main__': unittest.main()
