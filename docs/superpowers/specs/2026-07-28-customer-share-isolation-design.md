# Customer Share Isolation Design

## Goal

Keep a customer who opens a shared-art URL inside the standalone art viewer and present every shared-view size as a feet-wide choice.

## Behavior

- `/shared/<id>` continues to render without the editor navbar or mobile warning.
- The Everwood mark remains visible but is not a link.
- Remove every shared-page action that opens the editor, including loading/error states.
- Keep customer-only actions: copy link, save image, AR, details, pattern, lighting, and wall color.
- Show the current artwork size and every size-selector option as width only:
  - `16 x 10` → `4 ft wide`
  - `14 x 7` → `3.5 ft wide`
  - `40 x 16` → `10 ft wide`
- The shared selector does not show inch-pair labels or height-group inch labels.
- Editor size controls retain their existing labels and custom-size behavior.

## Architecture

Extract the pure physical-size label helpers from the JSX-bearing size-pill module into a testable TypeScript module, and reuse one named physical-size config from `utils.ts`. Give compact `SizeCard` an explicit label mode so the shared page can request feet-wide labels without changing editor callers. Remove outbound editor anchors from the shared page while preserving the existing standalone layout behavior.

## Verification

- Unit-test whole-foot, fractional-foot, and invalid size labels.
- Verify the shared source contains no editor URL or editor CTA.
- Type-check and run the full Node test suite.
- Open an inline shared preview and confirm there is no editor link and the size UI uses feet-wide labels.
