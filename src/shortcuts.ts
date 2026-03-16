import { Keyboard } from "@raycast/api";
import { ResolvedApp } from "./types";

const CLI_APP_NAMES: Record<string, string> = {
  phpstorm: "PhpStorm",
  smerge: "Sublime Merge",
  repo: "Sublime Merge",
  edit: "Edit",
};

const URL_PROTOCOL_NAMES: Record<string, string> = {
  "http:": "Browser",
  "https:": "Browser",
  "obsidian:": "Obsidian",
};

/**
 * Map a CLI binary string to its human-readable product name.
 * Falls back to the raw value if no mapping exists.
 */
export function friendlyCliName(binary: string): string {
  const base = binary.trim().split(/\s+/)[0];
  return CLI_APP_NAMES[base] ?? binary;
}

/**
 * Map a URL to a human-readable app name based on its protocol.
 * Falls back to the raw URL if no mapping exists.
 */
export function friendlyUrlName(url: string): string {
  try {
    const protocol = new URL(url).protocol;
    return URL_PROTOCOL_NAMES[protocol] ?? url;
  } catch {
    return url;
  }
}

/**
 * Return a human-readable display name for an app entry.
 * - Maps known CLI binaries to their product names.
 * - Maps URL protocols to their app names when no `app` field is set.
 * - Falls back to "Terminal" for command-only entries.
 */
export function friendlyAppName(app: ResolvedApp): string {
  if (app.app) return friendlyCliName(app.app);
  if (app.url) return friendlyUrlName(app.url);
  if (app.command) return "Terminal";
  return "";
}

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
