import { Keyboard } from "@raycast/api";

/**
 * Parse a shortcut string like "cmd+t" or "cmd+shift+k" into a Raycast Keyboard.Shortcut.
 * Returns undefined if the string is not provided.
 */
export function parseShortcut(shortcut?: string): Keyboard.Shortcut | undefined {
  if (!shortcut) return undefined;
  const parts = shortcut.toLowerCase().split("+");
  const key = parts.pop() as Keyboard.KeyEquivalent;
  const modifiers = parts.map((m) => {
    if (m === "cmd") return "cmd" as Keyboard.KeyModifier;
    if (m === "ctrl") return "ctrl" as Keyboard.KeyModifier;
    if (m === "opt" || m === "alt") return "opt" as Keyboard.KeyModifier;
    if (m === "shift") return "shift" as Keyboard.KeyModifier;
    return m as Keyboard.KeyModifier;
  });
  return { modifiers, key };
}

const MODIFIER_SYMBOLS: Record<string, string> = {
  cmd: "⌘",
  ctrl: "⌃",
  opt: "⌥",
  alt: "⌥",
  shift: "⇧",
};

/**
 * Render a shortcut string like "cmd+shift+e" into a display string like "⌘ ⇧ E".
 */
export function renderShortcut(shortcut?: string): string | undefined {
  if (!shortcut) return undefined;
  const parts = shortcut.toLowerCase().split("+");
  const key = parts.pop()!;
  const modifiers = parts.map((m) => MODIFIER_SYMBOLS[m] ?? m);
  return [...modifiers, key.toUpperCase()].join(" ");
}
