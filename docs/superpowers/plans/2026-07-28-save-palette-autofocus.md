# Save Palette Autofocus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development while implementing and superpowers:verification-before-completion before committing.

**Goal:** Focus the palette-name input immediately when **Save Palette** opens.

**Architecture:** Keep focus ownership inside the existing Radix dialog. A
typed input ref is focused from `DialogContent.onOpenAutoFocus`, preventing the
default focus target without selecting input text.

**Tech Stack:** React 19, TypeScript 5.9, Radix Dialog, Next.js 16.

## Constraints

- Focus only; never select existing text.
- Do not change save, validation, mode, or Enter-key behavior.
- Preserve unrelated edits in `src/app/palette/page.tsx`.

### Task 1: Add and verify autofocus

**Files:**

- Modify: `src/app/palette/page.tsx`

**Interface:**

```ts
const paletteNameInputRef = useRef<HTMLInputElement>(null);
```

- [ ] Add the typed ref beside the save-dialog state.
- [ ] Pass the ref to the palette-name `Input`.
- [ ] Add `onOpenAutoFocus` to `DialogContent`, call
      `event.preventDefault()`, then `paletteNameInputRef.current?.focus()`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Open **Save Palette** in the browser and verify the input owns focus,
      typing works immediately, and no text is selected.
- [ ] Selectively stage only the focus hunk and commit with
      `fix(palette): focus name when saving`.
