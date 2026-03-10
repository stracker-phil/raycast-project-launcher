# ADR-019: Smart Form Dropdowns (Tag and Icon)

**Status:** Accepted
**Date:** 2026-03-10

## Context

The add/edit project form used plain text fields for tag and a static dropdown for icon. This had usability issues:

- **Tags**: Users had to remember exact tag names (including spelling and casing). Typos created duplicate tag groups.
- **Icons**: If a project's config used an icon not in the curated `PROJECT_ICONS` list, the form couldn't represent it and would reset it on save.

Raycast doesn't provide a native combo box (dropdown + free text), so a workaround was needed.

## Decision

### Tag field

Replace the text field with a `Form.Dropdown` that shows:
1. "No Tag" (removes tag)
2. All existing tags from other projects (loaded from config files via `readAllTags()`)
3. "New Tag..." (reveals a text field for entering a custom tag name)

The dropdown uses `isLoading` while tags are being read from disk, and includes the current project's tag as a placeholder item during loading to prevent Raycast from resetting the selection.

### Icon field

Same pattern: the curated `PROJECT_ICONS` list is shown in a dropdown, plus a "Custom Icon..." option that reveals a text field for any Raycast `Icon` enum name. On edit, if the current icon isn't in the curated list, "Custom Icon..." is pre-selected with the icon name pre-filled.

### Form preservation

The form preserves config fields it doesn't manage (like `url`, `env`, `apps`, `scripts`) by spreading the existing config's `meta` before applying form values.

## Rationale

- Tag reuse is easy and typo-free via dropdown selection
- New tags can still be created inline without a separate settings UI
- Custom icons support power users who know the Raycast Icon enum
- No data loss on save -- unmapped fields are preserved

## Trade-offs

- Tag loading requires reading all project config files (acceptable since project counts are small)
- The "New Tag..." / "Custom Icon..." pattern is a workaround for the lack of a native combo box
- Loading race condition: the dropdown must have a matching item before Raycast evaluates the `value` prop, solved by rendering a placeholder item during loading
