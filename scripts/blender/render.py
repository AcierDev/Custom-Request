#!/usr/bin/env python3
"""Render a downloaded .everwood.json locally, then release Blender and its RAM."""
import argparse
import fcntl
import json
import os
import shutil
import signal
import struct
import subprocess
import sys
import time
import uuid
import zlib
from datetime import datetime, timezone
from pathlib import Path
from schema import CONFIG, CONFIG_PATH, load_package
from credits import write_credits

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent.parent
OUTPUT_ROOT = ROOT / 'output/blender-render'
PNG_SIGNATURE = b'\x89PNG\r\n\x1a\n'
PNG_CHUNK_HEADER_SIZE = 8
PNG_CRC_SIZE = 4
PNG_IHDR_SIZE = 13
PNG_RGB = 2
PNG_CHANNELS = 3
BITS_PER_BYTE = 8
PNG_FILTER_TYPES = range(5)
STOP_SIGNALS = (signal.SIGINT, signal.SIGTERM, signal.SIGHUP)
RESULT_READY = 'rendered'


def png_dimensions(path):
    """Validate complete, noninterlaced RGB PNGs produced by this renderer."""
    if path.stat().st_size > CONFIG['render']['max_png_bytes']:
        raise RuntimeError('The rendered PNG exceeds the supported size.')
    raw = path.read_bytes()
    if not raw.startswith(PNG_SIGNATURE): raise RuntimeError('The renderer did not produce a valid PNG image.')
    offset = len(PNG_SIGNATURE); header = None; compressed = bytearray(); ended = False
    while offset < len(raw):
        if len(raw) - offset < PNG_CHUNK_HEADER_SIZE + PNG_CRC_SIZE:
            raise RuntimeError('The rendered PNG is truncated.')
        length, kind = struct.unpack_from('>I4s', raw, offset)
        begin = offset + PNG_CHUNK_HEADER_SIZE; end = begin + length
        if end + PNG_CRC_SIZE > len(raw): raise RuntimeError('The rendered PNG is truncated.')
        data = raw[begin:end]; crc = struct.unpack_from('>I', raw, end)[0]
        if zlib.crc32(kind + data) != crc: raise RuntimeError('The rendered PNG has damaged image data.')
        offset = end + PNG_CRC_SIZE
        if header is None and kind != b'IHDR': raise RuntimeError('The rendered PNG has no image header.')
        if kind == b'IHDR':
            if header is not None or length != PNG_IHDR_SIZE: raise RuntimeError('Invalid PNG image header.')
            header = struct.unpack('>IIBBBBB', data)
        elif kind == b'IDAT': compressed.extend(data)
        elif kind == b'IEND':
            if length or offset != len(raw): raise RuntimeError('Invalid PNG image ending.')
            ended = True; break
    if header is None or not ended or not compressed: raise RuntimeError('The rendered PNG is incomplete.')
    width, height, depth, color, compression, filtering, interlace = header
    if (not width or not height or width * height > CONFIG['render']['max_png_pixels']
            or depth not in (BITS_PER_BYTE, BITS_PER_BYTE * 2) or color != PNG_RGB
            or compression or filtering or interlace):
        raise RuntimeError('Unsupported rendered PNG format or dimensions.')
    stride = width * PNG_CHANNELS * (depth // BITS_PER_BYTE) + 1
    expected = stride * height
    try:
        decoder = zlib.decompressobj(); pixels = decoder.decompress(compressed, expected + 1)
    except zlib.error as error: raise RuntimeError('The rendered PNG pixels cannot be decoded.') from error
    if (len(pixels) != expected or not decoder.eof or decoder.unused_data
            or any(pixels[row] not in PNG_FILTER_TYPES for row in range(0, expected, stride))):
        raise RuntimeError('The rendered PNG has incomplete or invalid pixels.')
    return width, height


def verify_result(folder, prepare_only=False):
    result = json.loads((folder / 'result.json').read_text())
    expected_status = 'prepared' if prepare_only else RESULT_READY
    if result.get('status') != expected_status or not (folder / 'scene.blend').is_file():
        raise RuntimeError('The render did not produce a complete scene and result.')
    if not prepare_only:
        width, height = png_dimensions(folder / 'render.png')
        if [width, height] != [result['width'], result['height']]:
            raise RuntimeError('The rendered image dimensions do not match the result.')
    return result


def run_owned_process(command, log):
    """Defer signal handling through cleanup, including signals received during spawn."""
    requested = []
    def cancel(signum, frame):
        if not requested: requested.append(signum)
    previous = {signum: signal.getsignal(signum) for signum in STOP_SIGNALS}
    process = None
    try:
        for signum in STOP_SIGNALS: signal.signal(signum, cancel)
        process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT,
                                   stdin=subprocess.DEVNULL, start_new_session=True)
        deadline = time.monotonic() + CONFIG['render']['timeout_seconds']
        while True:
            if requested: raise RuntimeError(f'Render cancelled by {signal.Signals(requested[0]).name}.')
            remaining = deadline - time.monotonic()
            if remaining <= 0: raise subprocess.TimeoutExpired(command, CONFIG['render']['timeout_seconds'])
            try:
                code = process.wait(timeout=min(remaining, CONFIG['render']['cancel_poll_seconds']))
            except subprocess.TimeoutExpired: continue
            if requested: raise RuntimeError(f'Render cancelled by {signal.Signals(requested[0]).name}.')
            return code
    finally:
        try:
            if process is not None and process.poll() is None:
                try: os.killpg(process.pid, signal.SIGTERM)
                except ProcessLookupError: pass
                try: process.wait(timeout=CONFIG['render']['cancel_grace_seconds'])
                except subprocess.TimeoutExpired:
                    try: os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError: pass
                    process.wait()
        finally:
            for signum, handler in previous.items(): signal.signal(signum, handler)


def render(input_path, output=None, quality='preview', prepare_only=False, blender=None):
    input_path = Path(input_path).expanduser().resolve()
    packet = load_package(input_path)
    executable = blender or os.environ.get('BLENDER_BIN') or CONFIG['blender']
    executable = shutil.which(executable) or executable
    if not Path(executable).is_file(): raise ValueError('Blender was not found. Set BLENDER_BIN to your Blender executable.')
    for name, relative in CONFIG['assets'].items():
        path = ROOT / 'public' / relative
        if not path.is_file(): raise ValueError(f'Missing local {name} asset: {path}')
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    with (OUTPUT_ROOT / '.render.lock').open('a') as lock:
        try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError: raise RuntimeError('Another local render is already running. Let it finish first.')
        name = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S') + '-' + uuid.uuid4().hex[:8]
        folder = Path(output).expanduser().resolve() if output else OUTPUT_ROOT / 'jobs' / name
        folder.mkdir(parents=True, exist_ok=False)
        source = folder / 'design.everwood.json'; source.write_text(json.dumps(packet))
        shutil.copy2(CONFIG_PATH, folder / 'config.json')
        write_credits(folder)
        command = [str(executable), '--background', '--factory-startup', '--disable-autoexec', '--python-exit-code', '1',
                   '--python', str(SCRIPT_DIR / 'blender_job.py'), '--', '--input', str(source),
                   '--output', str(folder), '--quality', quality]
        if prepare_only: command.append('--prepare-only')
        print(f'Local render output: {folder}', flush=True)
        started = time.monotonic()
        with (folder / 'render.log').open('w') as log:
            try:
                code = run_owned_process(command, log)
                if code: raise RuntimeError(f'Blender stopped with exit code {code}. See {folder / "render.log"}')
                result = verify_result(folder, prepare_only)
            except BaseException as error:
                (folder / 'failure.json').write_text(json.dumps({'status': 'failed', 'error': str(error)}, indent=2))
                raise
        result['elapsed_seconds'] = time.monotonic() - started
        (folder / 'result.json').write_text(json.dumps(result, indent=2))
        print(json.dumps(result, indent=2))
        return folder


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('design', type=Path, help='Render file downloaded from either viewer')
    parser.add_argument('--quality', choices=('preview', 'final'), default='preview', help='preview is 480p; final is 1440p')
    parser.add_argument('--output', type=Path, help='New output directory (existing folders are never overwritten)')
    parser.add_argument('--prepare-only', action='store_true', help='Save the imported Blender scene without rendering')
    parser.add_argument('--blender', help='Override the local Blender executable')
    args = parser.parse_args()
    try: render(args.design, args.output, args.quality, args.prepare_only, args.blender)
    except (ValueError, RuntimeError, OSError, subprocess.TimeoutExpired) as error:
        parser.exit(1, f'Render failed: {error}\n')


if __name__ == '__main__': main()
