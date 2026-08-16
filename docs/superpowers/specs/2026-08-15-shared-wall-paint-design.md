# Shared Wall Paint Design

## Goal

Give `/viewer` the same searchable named-paint picker as `/shared/[id]`, and preserve the selected wall color whenever a design is shared.

## Design

- Render the existing `PaintColorPicker` beneath `WallColorPicker` in the main viewer, using the same divider and callback as the shared viewer.
- Add an optional `wallColor` field to `ShareableState` for backward compatibility with existing shares.
- Include `viewSettings.wallColor` in snapshots used by database-backed shares, regular share URLs, compact share URLs, and lightweight share data.
- Restore the shared wall color into main-viewer share loads and into the shared page's local environment state. Keep recipient wall-color experiments local and keep shared-page autosave disabled.
- Default missing legacy values to `DEFAULT_WALL_COLOR`.

## Error Handling

Existing paint-catalog loading and error behavior remains unchanged. A share without `wallColor` uses the current default.

## Testing

- Prove the store snapshot captures the selected wall color and restores it from share data.
- Prove compact URLs round-trip wall color under a compact key.
- Run the relevant Node tests and a production Next.js build.
- Verify `/viewer` and `/shared/[id]` in the browser.
