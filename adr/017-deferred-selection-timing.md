# ADR-017: Deferred Selection Timing for selectedItemId

**Status:** Accepted
**Date:** 2026-03-10

## Context

Raycast's `<List selectedItemId>` prop should select a specific item on open (e.g., "remember last opened project"). However, Raycast's native layer must register items before it can process a selection change. Setting `selectedItemId` in the same render cycle as items appear is unreliable — it works when the async operation is slow (file I/O blocks the main thread long enough) but fails when items resolve instantly (from cache).

## Problem

Multiple approaches were tried and failed:

1. **Setting selection before items** (same React batch): Raycast ignores it — items aren't registered yet.
2. **useEffect deferred selection** (set selection one render after items): Works with slow I/O, fails with fast cache — React processes the effect too quickly for Raycast's native layer.
3. **React key remounting** (`<List key={selection}>`): Raycast still ignores the selection on the new mount.
4. **Gating items** (don't render items until selection is set): Same render cycle, same problem.
5. **Two-phase rendering** (cache first, then replace with fresh): Replacing items resets Raycast's internal selection entirely.

## Decision

Use a 50ms `setTimeout` in the deferred selection `useEffect`:

```tsx
useEffect(() => {
  if (items.length > 0 && lastOpenedId) {
    setTimeout(() => setSelection(lastOpenedId), 50);
  }
}, [items.length, lastOpenedId]);
```

## Rationale

- 50ms is sufficient for Raycast's native layer to register items
- Imperceptible to the user (items appear, selection follows within one frame)
- Works consistently regardless of how fast items resolve
- `requestAnimationFrame` is not available in Raycast's Node.js runtime

## Key Insight

Raycast is not a browser. The `<List>` component bridges React state to a native AppKit UI. The native layer processes item registration asynchronously relative to React renders. Any approach that sets `selectedItemId` without giving the native layer time to register items will fail silently.

## Rules

- **Never replace the items array** after initial render — this resets Raycast's internal selection state
- **Always defer selection** with a small timeout after items appear
- **Background work** (cache updates, fresh config resolution) must not block the main thread during the 50ms selection window — use `setTimeout(fn, 500)` or longer
