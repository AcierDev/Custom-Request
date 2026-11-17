# Preview tools (customer previews without hacking saved state)

Build and capture customer previews without editing `localStorage`, scrolling
to zoom, hiding buttons by script or cropping slivers. One implementation:
a short "shorthand" spec expands to the strict agent spec
([agent-design-api.md](agent-design-api.md)), so squares, inches, colors and
prices always agree across the viewer, the PNG endpoints and the quote.
Nothing here is sent to customers, and nothing changes what visitors see unless
a URL parameter below is used.

Last verified: 2026-11-17 (local dev). Tests: `npm run test:preview-tools`.

| Need | Tool |
| --- | --- |
| Preview from a pasted hex list / JSON, or a swatch photo | `/import` page |
| Preview from a URL or script | `?spec=` on `/shared/preview` or `/viewer` |
| Never touch the visitor's saved data | `?sandbox=1` |
| Clean screenshot of the 3D art | `?capture=1` (+ ready flag) |
| Flat straight-on PNG | `GET /api/preview/screenshot.png` |
| Before/after in one PNG | `GET /api/preview/compare.png` |
| Share link for a customer | `POST /api/preview/share` |
| Block counts (no storage) | `POST /api/preview/compile` |
| Price from live listing prices | `POST /api/preview/quote` |

## Shorthand spec

One panel, a color list, a fill. Unknown fields are rejected (400 with the
field name). A full agent spec (anything with `panels`) is accepted as-is.

| Field | Default | Meaning |
| --- | --- | --- |
| `width`, `height` | required | squares (1-100 each) |
| `colors` | required | `"#RRGGBB"`, `"#RRGGBB Name"`, `{hex,name?}`, `{brand,code}`, or `{between:["#A","#B"],steps:1-10}` (inserts evenly spaced OKLab steps: smooths a hue/lightness jump between neighbors). A hex can only be listed once |
| `size` | `standard` | `standard` (3") or `mini` (2.65") |
| `gap` | `0` | square gap inches (0, 0.125, 0.25, 0.5, 1) |
| `pattern` | `palette` | `palette`, `center-fade`, `gradient`, `solid-blocks`, `solid` |
| `flow` | `left-to-right` | palette/gradient/solid-blocks: `left-to-right`, `right-to-left`, `top-to-bottom`, `bottom-to-top` |
| `blend` | site default | palette only, 0-100 in steps of 5 |
| `axis`, `edges` | `vertical`, `first` | center-fade: `axis` horizontal/vertical; `edges` = which end of `order` sits at both outer edges |
| `order` | all colors in order | color indexes (0-based, after `between` expansion); repeats allowed, e.g. `[0,1,2,1,0]` |
| `extraPercent` | none | one int per `order` entry, weights square counts |
| `wall` | none | wall color for `room=1` renders |
| `title` | none | label |

```json
{"title":"Linda","width":40,"height":12,
 "colors":["#4F3426 Saddle","#715243 Tobacco Brown","#D9CDC3 Wafer"],
 "pattern":"center-fade","axis":"vertical","edges":"first"}
```

### The `spec` URL param

`spec=<base64url(JSON)>` (raw URL-encoded JSON also works), max 24,000 chars.

```bash
SPEC=$(python3 -c "import base64,sys;print(base64.urlsafe_b64encode(sys.stdin.buffer.read()).decode().rstrip('='))" < spec.json)
```

## Pages and URL modes

`/shared/preview?...` is public (no sign-in). `/viewer` and `/import` need a
signed-in or guest session like the rest of the app.

| URL | Result |
| --- | --- |
| `/shared/preview?spec=<SPEC>` | Read-only shared viewer showing the spec (`preview` is a placeholder id) |
| `/viewer?spec=<SPEC>` | Full viewer with the spec loaded, in sandbox |
| `?sandbox=1` | Never reads or writes saved data (guest localStorage / account). `?capture=1` and `?spec=` imply it. Sticks for the browser tab (sessionStorage); `?sandbox=0` clears it. Suppresses the first-visit tutorial on `/viewer`. Save buttons do nothing in a sandbox tab |
| `?capture=1` | Art only: no controls (eye button included), no idle sway, no room, camera fitted to the measured art (3% margin). Same on `/viewer` and `/shared/…` |
| `&room=1` | Keep the furnished room behind the art |
| `&bg=RRGGBB` / `&bg=transparent` | Page color behind the art (default white on `/viewer`; `transparent` is only clean on `/shared`) |
| `&wall=RRGGBB` | Wall color when `room=1` |

When capturing, the page sets `window.__everwoodCaptureReady = true` and
`<html data-capture-ready="1">` once the art is framed and painted (fallback
after 30 s). Wait for that, then screenshot the viewport at the size you want
(the viewport aspect decides the framing). The frame needs a visible, focused
browser tab: a hidden tab does not paint, so the flag waits for the fallback.

### `/import`

Paste hex colors (one per line, optional name) or JSON, pick size/direction/
pattern/blend, then **Open preview** (new tab) or **Copy link**. "Add color from
image" appends the median color of a swatch photo as a new line. JSON:
`{"colors":["#1F3A5F",{"hex":"#9DC3E6","name":"Sea Glass"}],"width":28,"height":12,"squareSize":"standard|mini","direction":"left-to-right|right-to-left|top-to-bottom|bottom-to-top","pattern":"fade|gradient|center-fade","blend":25}`
(defaults 28 x 12, standard, left-to-right, fade, 25). It builds a
`/shared/preview?spec=…&sandbox=1&capture=1` link; for a link customers can
open, use `POST /api/preview/share`.

## Endpoints

No key needed, with caps of 4,000 squares and 3,000 px wide. Send
`Authorization: Bearer <agent key>` to lift the caps and to reference agent
design ids. Errors are `{"error","field"}`.

| Endpoint | Does |
| --- | --- |
| `POST /api/preview/compile` (or `GET ?spec=`) | Compiles, stores nothing. Returns `designData`, `squares`, `inches`, per-color `squareCount` + `percent` (block counts), `rows` (one char per square), `links` |
| `POST /api/preview/share` | Creates a normal `/shared/<id>` link (same record as `POST /api/shared-designs`). Returns `shareUrl`, colors with counts, `links` |
| `GET /api/preview/screenshot.png?spec=…&width=1600&room=0\|1&gaps=0\|1&margin=4` | Flat straight-on art PNG. `margin` = whole percent of the longer side around the art (0-20); `0` = edge to edge. Ignored with `room=1` |
| `GET /api/preview/compare.png?a=<spec>&b=<spec>&captionA=Before&captionB=After&width=&room=&gaps=&margin=` | Two designs stacked (A on top), each under a caption bar. `a`/`b` may be agent design ids with the key. Caption font is a system sans: confirm it renders on the host |
| `POST /api/preview/quote` | Price from live listing prices, below |

Multi-panel / multi-row specs: the viewer and share link show panel `A` only (a
`warnings` entry says so); the PNG endpoints always draw the full layout.

### Quote

`{"spec":{…} | "agentDesignId":"…", "widthInches":120?, "heightInches":36?, "listings":[{"widthInches":36,"heightInches":96,"priceUsd":1625}], "customColors":2}`

Size comes from the design's layout unless given (`widthInches` is horizontal).
`listings` are the LIVE Etsy prices the caller just read; nothing is stored.
Method (SOP): the exact listing size as listed; else the nearest same-height
listing scaled by area and rounded to the nearest $5; else the nearest
same-width listing the same way. Custom colors add $12 each (`customColors` is a
count; a per-customer waiver is not applied). The response lists the `steps`,
the `basis` listing, `basePriceUsd`, `totalUsd` and, with a design, `blocks`
(counts per color). `method: "none"` means no listing shares a width or height:
ask the owner.

## Also in this change

- Viewer pattern-editor swatches show `# · Name · #HEX` on hover/focus (the
  shared viewer's palette chips already show the hex).
- Agent/preview designs always carry `orientation: "horizontal"`. The viewer
  rotates the whole art 90° for `"vertical"`, which turned landscape agent
  designs portrait in 3D; the grid is authoritative. Old share links made with
  a vertical flow stay rotated.
- Agent screenshot gained `margin` (same meaning as above).
