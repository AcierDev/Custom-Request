"""Keep model attribution with each rendered image and its packed Blender scene."""
import json
from pathlib import Path
from schema import CONFIG

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'public/photo-room/manifest.json'
CREDITS_NAME = 'ASSET-CREDITS.md'
LICENSES = {'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
            'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/'}


def write_credits(folder):
    used = {Path(path).name for path in CONFIG['assets'].values()}
    records = [record for record in json.loads(MANIFEST.read_text()) if record['file'] in used]
    lines = ['# Room asset credits', '',
             'Keep these credits with publicly shared renders and Blender scenes. The artwork design belongs to its owner.', '',
             'Local Blender adaptation: models scaled and placed in an authored room; source lights/cameras removed; '
             'sofa material, leaf transmission, lighting and camera adjusted.', '']
    for record in records:
        license_name = record['license']; author = record.get('author', 'Poly Haven contributors')
        lines.append(f"- **{record['file']}** — {author}. [Source]({record['source']}); "
                     f"[{license_name}]({LICENSES[license_name]}). {record.get('adaptation', '')}")
    text = '\n'.join(lines) + '\n'
    (folder / CREDITS_NAME).write_text(text)
    (folder / 'asset-credits.json').write_text(json.dumps(records, indent=2))
    return text
