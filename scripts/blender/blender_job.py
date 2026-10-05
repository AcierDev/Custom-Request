"""Entry point run only by background Blender. Never opens a listener."""
import argparse
import hashlib
import json
import shutil
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import bpy
from schema import CONFIG, load_package
from room import build_room, set_lighting, fit_camera
from artwork import import_artwork
from credits import CREDITS_NAME

ROOT = SCRIPT_DIR.parent.parent
ASSET_ROOT = ROOT / 'public'
TEMPLATE_PATH = ROOT / 'output/blender-render/room.blend'
FINGERPRINT_FILES = ('config.json', 'room.py', 'materials.py', 'scene_tools.py', 'schema.py', 'blender_job.py', 'credits.py')


def template_fingerprint():
    digest = hashlib.sha256()
    for name in FINGERPRINT_FILES: digest.update((SCRIPT_DIR / name).read_bytes())
    for relative in CONFIG['assets'].values():
        asset = ASSET_ROOT / relative
        stat = asset.stat()
        digest.update(f'{relative}:{stat.st_size}:{stat.st_mtime_ns}'.encode())
    return digest.hexdigest()


def embed_credits(text):
    block = bpy.data.texts.get(CREDITS_NAME) or bpy.data.texts.new(CREDITS_NAME)
    block.clear(); block.write(text)


def prepare_template(credits):
    fingerprint = template_fingerprint()
    if TEMPLATE_PATH.exists():
        bpy.ops.wm.open_mainfile(filepath=str(TEMPLATE_PATH))
        if bpy.context.scene.get('everwood_template') == fingerprint: return True
        backup = TEMPLATE_PATH.with_name(f'room-before-update-{time.time_ns()}.blend')
        shutil.copy2(TEMPLATE_PATH, backup)
    print('EVERWOOD: Building the reusable room', flush=True)
    build_room(ASSET_ROOT)
    bpy.context.scene['everwood_template'] = fingerprint
    embed_credits(credits)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    bpy.ops.file.pack_all()
    TEMPLATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(TEMPLATE_PATH))
    return False


def configure_render(quality):
    scene = bpy.context.scene; preset = CONFIG['render'][quality]; render = CONFIG['render']
    scene.render.engine = 'CYCLES'
    devices = []
    try:
        preferences = bpy.context.preferences.addons['cycles'].preferences
        preferences.compute_device_type = 'METAL'; preferences.get_devices()
        for device in preferences.devices:
            device.use = device.type == 'METAL'
            if device.use: devices.append(device.name)
    except (TypeError, RuntimeError): pass
    scene.cycles.device = 'GPU' if devices else 'CPU'
    print('EVERWOOD: Device: ' + (', '.join(devices) if devices else 'CPU fallback (no Metal GPU available)'), flush=True)
    scene.cycles.samples = preset['samples']; scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = preset['noise_threshold']
    scene.cycles.use_denoising = True; scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    scene.cycles.max_bounces = render['bounces']; scene.cycles.diffuse_bounces = render['diffuse_bounces']
    scene.cycles.glossy_bounces = render['glossy_bounces']; scene.cycles.transmission_bounces = render['transmission_bounces']
    scene.cycles.transparent_max_bounces = render['transparent_bounces']; scene.cycles.seed = render['seed']
    scene.render.use_persistent_data = False
    scene.render.resolution_x = preset['width']; scene.render.resolution_y = preset['height']
    scene.render.resolution_percentage = render['resolution_percentage']
    scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.color_depth = render['png_depth']; scene.render.image_settings.compression = render['png_compression']
    scene.render.film_transparent = False
    scene.view_settings.view_transform = render['view_transform']; scene.view_settings.look = render['look']
    scene.view_settings.exposure = render['exposure']
    scene.render.use_simplify = True; scene.cycles.texture_limit = render['texture_limit']
    return devices


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True, type=Path); parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--quality', choices=('preview', 'final'), default='preview')
    parser.add_argument('--prepare-only', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    started = time.monotonic(); packet = load_package(args.input)
    credits = (args.output / CREDITS_NAME).read_text()
    reused_template = prepare_template(credits)
    art = import_artwork(packet, ASSET_ROOT)
    width = max(CONFIG['room']['width'], art['width_m'] + CONFIG['room']['art_width_padding'])
    height = max(CONFIG['room']['height'], art['max'].z + CONFIG['room']['art_ceiling_clearance'])
    if width > bpy.context.scene['room_width'] or height > bpy.context.scene['room_height']:
        build_room(ASSET_ROOT, width, height); art = import_artwork(packet, ASSET_ROOT)
        reused_template = False
    set_lighting(packet['room'], width)
    devices = configure_render(args.quality)
    camera = fit_camera(art)
    embed_credits(credits)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.file.pack_all()
    scene_path, image_path = args.output / 'scene.blend', args.output / 'render.png'
    bpy.context.scene.render.filepath = str(image_path)
    bpy.ops.wm.save_as_mainfile(filepath=str(scene_path))
    render_started = time.monotonic()
    if not args.prepare_only:
        print('EVERWOOD: Rendering your artwork', flush=True)
        bpy.ops.render.render(write_still=True)
        if not image_path.is_file(): raise RuntimeError('Blender did not save the image.')
    result = {'status': 'prepared' if args.prepare_only else 'rendered', 'quality': args.quality,
              'width': bpy.context.scene.render.resolution_x, 'height': bpy.context.scene.render.resolution_y,
              'blender_version': bpy.app.version_string, 'devices': devices or ['CPU'],
              'room_template_reused': reused_template,
              'render_seconds': time.monotonic() - render_started if not args.prepare_only else None,
              'total_seconds': time.monotonic() - started, 'tile_count': art['tile_count'],
              'artwork_meters': {'width': art['width_m'], 'height': art['height_m'], 'depth': art['depth_m']},
              'camera': {'location': list(camera.location), 'lens_mm': camera.data.lens},
              'image': str(image_path) if not args.prepare_only else None, 'scene': str(scene_path),
              'input_sha256': hashlib.sha256(args.input.read_bytes()).hexdigest(), 'room': packet['room']}
    (args.output / 'result.json').write_text(json.dumps(result, indent=2))
    print('EVERWOOD_RESULT ' + json.dumps(result), flush=True)


if __name__ == '__main__': main()
