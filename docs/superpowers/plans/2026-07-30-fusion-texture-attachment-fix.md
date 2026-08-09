# Fusion Texture Attachment Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the generated Fusion script apply every packaged wood texture instead of reporting `Could not attach texture` for every STEP body.

**Architecture:** Execute the real generated Python script against a controlled Fusion API boundary that reproduces the failure. Update the script to create a neutral image-capable appearance through the current Fusion API, verify the attachment, and use the existing connected-texture route only when that API is unavailable.

**Tech Stack:** TypeScript 5.9, Node test runner, Python 3, Autodesk Fusion Python API

## Global Constraints

- Do not change STEP geometry, scale, component names, or placement.
- Keep the generated texture files and component mapping unchanged.
- Do not commit or push without an explicit user instruction.

---

### Task 1: Execute the packaged appearance script in a Fusion API fixture

**Files:**
- Create: `src/lib/fusion/fusionAppearanceScript.test.mjs`
- Modify: `src/lib/fusion/fusionAppearanceScript.ts`
- Modify: `src/lib/fusion/fusionPackageConfig.ts`

**Interfaces:**
- Consumes: `FUSION_APPEARANCE_SCRIPT: string`
- Produces: a script that uses `Appearances.add(name)` and
  `Appearance.colorTexture` when available

- [x] **Step 1: Write the failing executable regression test**

Create a temporary `EverwoodAppearance.py`, `design-manifest.json`, and texture
file. Run the generated script through Python with an `adsk` fixture that:

```python
class FlatTexture:
    def changeTextureImage(self, image_path):
        return False

class FlatAppearance:
    # Models the imported STEP appearance that caused the screenshot failure.
    appearanceProperties = Properties([ColorProperty(FlatTexture())])

class TextureAppearance:
    @property
    def colorTexture(self):
        return self._texture_path

    @colorTexture.setter
    def colorTexture(self, image_path):
        if not Path(image_path).is_file():
            raise RuntimeError("Texture path does not exist")
        self._texture_path = image_path

class Appearances:
    def addByCopy(self, source, name):
        self.add_by_copy_calls += 1
        return FlatAppearance(name)

    def add(self, name):
        self.add_calls += 1
        return TextureAppearance(name)
```

Use one `Backboard` body and assert the script applies one appearance, assigns
the absolute packaged texture path, reports success, calls `add` once, and does
not call `addByCopy`.

- [x] **Step 2: Run the focused test and verify RED**

```bash
node --no-warnings --test src/lib/fusion/fusionAppearanceScript.test.mjs
```

Expected: FAIL because the current script calls `addByCopy`, whose flat
appearance rejects `changeTextureImage`, leaving zero applied bodies.

- [x] **Step 3: Implement the minimal texture-capable path**

Add generated Python helpers equivalent to:

```python
def attach_current_texture(appearance, texture_path):
    if not hasattr(appearance, "colorTexture"):
        return False
    try:
        appearance.colorTexture = str(texture_path)
        return bool(appearance.colorTexture)
    except Exception:
        return False


def delete_unused_appearance(appearance):
    try:
        if appearance and not appearance.isUsed:
            appearance.deleteMe()
    except Exception:
        pass
```

In `ensure_textured_appearance`:

1. Reuse a named appearance only if `attach_current_texture` succeeds.
2. Delete an unused incompatible named appearance.
3. If `design.appearances.add` is callable, create a neutral appearance and
   attach through `colorTexture`.
4. If unavailable, use the existing `addByCopy` and connected-texture path.
5. Raise the existing concise error when neither route succeeds.

Bump the packaged script patch version from `1.0.0` to `1.0.1`.

- [x] **Step 4: Run focused verification**

```bash
node --no-warnings --test src/lib/fusion/*.test.mjs
```

Expected: all Fusion tests pass, including Python syntax and executable
appearance behavior.

- [x] **Step 5: Run repository verification**

```bash
npx tsc --noEmit
rg --files -g '*.test.mjs' | sort | xargs node --no-warnings --test
npm run build
git diff --check
```

Expected: all commands exit successfully. A final Fusion desktop smoke test
uses a newly downloaded package because already-downloaded ZIPs contain the old
script.
