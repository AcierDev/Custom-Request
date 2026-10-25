# Agent Design API

Lets a Claude chat build customer design previews from an exact spec, without
clicking through `/palette` or `/viewer`. Precision over convenience: every
field that changes the result is required, unknown fields are rejected, and the
response echoes exactly what was built.

- `POST /api/agent/designs` — create previews (always NEW records)
- `GET /api/agent/designs/{agentDesignId}/screenshot.png` — flat front elevation PNG
- `GET /api/agent/colors?code=SW6764[&brand=sherwin]` — paint code lookup

## Auth

Every endpoint needs `Authorization: Bearer <key>`. The server reads the key
from env `AGENT_API_KEY` (set in `.env.local`, gitignored). The local copy of
the key lives at `~/.config/everwood/agent-api-key` (mode 600).

| Situation | Status |
| --- | --- |
| `AGENT_API_KEY` unset on server | `503 {"error":"agent API disabled"}` |
| Missing / wrong token | `401 {"error":"unauthorized"}` |

```bash
KEY=$(cat ~/.config/everwood/agent-api-key)
```

## Spec (`POST /api/agent/designs` body)

| Field | Required | Values |
| --- | --- | --- |
| `squareSize` | yes | `"standard"` (3" squares) or `"mini"` (2.65") |
| `squareGapInches` | yes | `0`, `0.125`, `0.25`, `0.5`, `1` (gap between squares) |
| `panels` | yes | `[{id, widthSquares, heightSquares}]`, 1-24 panels, sides 1-100 |
| `layout` | yes | `{rows, cols, order, gapInches}` (see below) |
| `colors` | yes | 1-62 colors (see below) |
| `fill` | yes | `{scope, pattern}` or `{scope, patterns}` (see below) |
| `title` | no | label echoed back |
| `wallColor` | no | one color (`{brand?, code}` or `{hex, name?}`). Omitted → not written to the design; the viewer keeps its own wall color, and the response says so |
| `savePalette` | no | `{name}` — appends a NEW saved palette to env `AGENT_USER_ID`'s `savedPalettes` (never overwrites). Without `AGENT_USER_ID` (or without Mongo) the response has `savedPalette: null` + `savedPaletteReason` |

Panel `id` and color `id`: `[A-Za-z0-9_-]{1,32}`.

### Layout

- `order` is `rows` arrays of `cols` panel ids, top row first, left to right.
  Every cell holds exactly one panel and every panel appears exactly once.
- Panels in the same row must share `heightSquares`; panels in the same column
  must share `widthSquares`. This guarantees every gap is exactly `gapInches`.
- `gapInches`: 0-48 in 1/16" steps, the same between every adjacent panel
  (horizontal and vertical).

### Colors

Each entry is exactly one of:

- `{"brand": "sherwin", "code": "SW 6764"}` — official name + hex from
  `public/paints/<brand>/colors.json`. Brands: `sherwin`, `valspar`, `behr`,
  `benjamin_moore`, `hgtv_home`, `ppg` (PPG has no codes in the dataset).
  `"SW6764"`, `"SW 6764"` and (with brand) `"6764"` are equivalent. Without
  `brand`, a non-numeric code must match exactly one brand. Unknown codes → 400.
  `name` is not allowed with `code`.
- `{"hex": "#RRGGBB", "name": "optional"}`.

Optional `id` lets fills reference the color by id. A color ref anywhere in
`fill` is the 0-based index into `colors` or that color's `id`. The same hex
twice is rejected.

### Fill

`scope`:

- `"layout"` + `pattern` — one pattern over the whole layout treated as one
  canvas of `sum(column widths) × sum(row heights)` squares (gaps are not
  squares). Each panel gets its slice.
- `"panel"` + `patterns: {panelId: pattern}` — every panel needs its own
  pattern, coordinates are panel-local.

Patterns (`mode`):

| mode | fields | notes |
| --- | --- | --- |
| `palette` | `colors`, `flow`, `blend` (0-100, step 5), `extraPercent?` | The site's palette fade (`generateColorMap` "fade") — matches `/palette`. `extraPercent` (one int ≥0 per listed color) weights square counts, like the site |
| `gradient` | `colors`, `flow` | Site "gradient" (hard bands by position) |
| `center-fade` | `colors`, `axis` (`horizontal`/`vertical`), `edges` (`first`/`last`), `extraPercent?` | Site center-fade: colors mirror out from the center. `edges` = which end of the list sits at both outer edges |
| `solid` | `color` | Whole canvas one color |
| `solid-blocks` | `colors`, `flow` | Contiguous equal bands along `flow`; the band count must divide the axis length, else 400 |
| `explicit` + `by: "column"` | `columns` | One ref per column, left → right; length = width |
| `explicit` + `by: "row"` | `rows` | One ref per row, top → bottom; length = height |
| `explicit` + `by: "block"` | `blocks: [{x, y, width, height, color}]` | Origin top-left, in squares; blocks must tile the canvas exactly (no overlap, no holes) |
| `explicit` + `by: "square"` | `squares` | `height` rows (top first) of `width` refs |

### Flow direction vs canvas orientation

- **Canvas orientation** is physical: it is whatever `widthSquares ×
  heightSquares` (and the layout) describe. A 4×9 panel is portrait. There is
  no rotate flag; to get landscape, give wider-than-tall panels.
- **Color flow** (`flow`) is where the first listed color starts and which way
  the list progresses across that canvas: `left-to-right`, `right-to-left`,
  `top-to-bottom`, `bottom-to-top`. It never changes the canvas shape.
  (`center-fade` uses `axis` because it is symmetric.)

The viewer fields `orientation` / `isReversed` / `colorPattern` written into
each design are informational; the explicit `drawnPatternGrid` is authoritative.

## What gets created

Every call inserts new records only:

1. **One shared design per panel** — `activeCustomMode: "pattern"` with an
   explicit `drawnPatternGrid`, so `/shared/{id}` shows exactly the computed
   squares (mini squares are not inflated), `useMini` per `squareSize`.
2. **Combined design** (single row only) — one grid with `panelCount` and
   `panelSpacingInches`, so the viewer shows the real multi-panel piece.
   Only when the row has ≤10 panels, `gapInches` is 0-12 in 0.5" steps, and
   the widths match a viewer column split (all equal, or remainder in the
   center/right panels). Otherwise `combinedDesign: null` with a reason.
3. **Design set** (layouts with more than one row) — a shared design set
   grouping the panel designs, labeled `Panel r,c` (1-based).
4. An `agentDesigns` record (Mongo, or in-memory in local dev without
   `MONGODB_URI`) holding the resolved spec + grids so the screenshot works later.

Fixed viewer fields (not tunable): `selectedDesign "Custom"`,
`shippingSpeed "standard"`, `style "geometric"`, `isRotated false`,
`backboardColor null`, pattern override maps empty.

## Response

```jsonc
{
  "agentDesignId": "…",
  "panels": [{
    "id": "A", "label": "Panel 1,1", "position": {"row": 1, "col": 1},
    "squares": {"width": 4, "height": 9, "total": 36},
    "inches": {"width": 10.6, "height": 23.85},
    "offsetInches": {"x": 0, "y": 0},           // from layout top-left, gaps included
    "shareId": "…", "shareUrl": "http://localhost:3000/shared/…",
    "rows": ["0000", "…"]                        // one char per square = colors[i].key
  }],
  "combinedDesign": null, "combinedDesignReason": "…",
  "designSet": {"setId": "…", "setUrl": "…", "breakdownUrl": "…"},
  "screenshot": {"url": "…/screenshot.png", "roomUrl": "…?room=1", …},
  "savedPalette": null, "savedPaletteReason": "savePalette not requested",
  "resolved": {
    "squareSize": "mini", "squareEdgeInches": 2.65, "squareGapInches": 0,
    "layout": {"rows": 2, "cols": 3, "order": [["A","B","C"],["D","E","F"]],
               "gapInches": 3, "overallInches": {"width": 37.8, "height": 50.7},
               "canvasSquares": {"width": 12, "height": 18}},
    "fill": { /* normalized fill, color refs as indexes */ },
    "colors": [{"index": 0, "key": "0", "brand": "Sherwin-Williams",
                "code": "SW 6764", "name": "…", "hex": "#…", "squareCount": 36,
                "positions": [{"panel": "A", "squareCount": 36,
                               "bbox": {"left": 0, "top": 0, "right": 2, "bottom": 8}}]}],
    "wallColor": null, "wallColorNote": "wallColor not given; omitted …",
    "fixedDesignFields": { … }
  },
  "warnings": []
}
```

Inches are square spans: `count × edge + (count − 1) × squareGapInches`
(backboard lip not included). Overall inches add `gapInches` between panels.

Errors: `400 {"error": "<field>: <message>", "field": "<field>"}`.

## Screenshot

`GET /api/agent/designs/{agentDesignId}/screenshot.png`

| Param | Default | Values |
| --- | --- | --- |
| `width` | `1600` | integer 200-4000 (px); height follows the layout aspect |
| `room` | `0` | `1` = wall-color background with proportional margins, baseboard and floor line; `0` = transparent background |
| `gaps` | `1` | `0` = draw panels and squares touching (color study) |

Straight-on, no perspective, every square at true relative scale with subtle
deterministic shading. `room=1` without a spec `wallColor` uses a neutral wall
(`#ece8e1`); header `X-Wall-Color-Source` says `spec` or `default`.

## Examples

Lori: six 4×9 mini panels, 2 rows of 3, 3" gaps, whole-layout palette fade:

```bash
curl -s -X POST http://localhost:3000/api/agent/designs \
  -H "Authorization: Bearer $(cat ~/.config/everwood/agent-api-key)" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Lori - 6 mini panels",
    "squareSize": "mini",
    "squareGapInches": 0,
    "panels": [
      {"id":"A","widthSquares":4,"heightSquares":9},{"id":"B","widthSquares":4,"heightSquares":9},
      {"id":"C","widthSquares":4,"heightSquares":9},{"id":"D","widthSquares":4,"heightSquares":9},
      {"id":"E","widthSquares":4,"heightSquares":9},{"id":"F","widthSquares":4,"heightSquares":9}
    ],
    "layout": {"rows":2,"cols":3,"order":[["A","B","C"],["D","E","F"]],"gapInches":3},
    "colors": [
      {"brand":"sherwin","code":"SW 6764"},{"brand":"sherwin","code":"SW 6662"},
      {"brand":"sherwin","code":"SW 6883"},{"brand":"sherwin","code":"SW 6774"},
      {"brand":"sherwin","code":"SW 6496"},{"brand":"sherwin","code":"SW 6244"}
    ],
    "fill": {"scope":"layout","pattern":{"mode":"palette","colors":[0,1,2,3,4,5],"flow":"left-to-right","blend":25}}
  }'
```

Same panels, one solid color per panel in listed order — replace `fill` with:

```json
{"scope":"panel","patterns":{
  "A":{"mode":"solid","color":0},"B":{"mode":"solid","color":1},"C":{"mode":"solid","color":2},
  "D":{"mode":"solid","color":3},"E":{"mode":"solid","color":4},"F":{"mode":"solid","color":5}}}
```

Screenshot and color lookup:

```bash
curl -s -o lori.png -H "Authorization: Bearer $(cat ~/.config/everwood/agent-api-key)" \
  "http://localhost:3000/api/agent/designs/<agentDesignId>/screenshot.png?width=1600&room=1"

curl -s -H "Authorization: Bearer $(cat ~/.config/everwood/agent-api-key)" \
  "http://localhost:3000/api/agent/colors?code=SW6764"
# {"brand":"sherwin","brandLabel":"Sherwin-Williams","code":"SW 6764","name":"…","hex":"#…"}
```

Verify a created design without a browser:

```bash
curl -s "http://localhost:3000/api/shared-designs?id=<shareId>&poll=1"
```

## Limitations

- The `/shared` viewer shows one grid; it can only render multi-panel pieces as
  a single row of equal-height panels. Grid layouts (rows > 1) are delivered as
  per-panel designs + a design set; use the screenshot for the true layout.
- Design set links point at `viewer.everwoodus.com`; in local dev (no
  `MONGODB_URI`) sets, shared designs and agent records live in server memory
  and vanish on restart.
- `savePalette` writes through Mongo with `$push`; an open browser session for
  that user may later overwrite `storeData` from its own stale copy.
- Tests: `npm run test:agent-design`.
