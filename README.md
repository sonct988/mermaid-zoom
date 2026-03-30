# 🔍 Mermaid Zoom

> **Obsidian Plugin** — Zoom, pan, and navigate Mermaid diagrams in a full-screen popup.

---
## Features

| Feature | Description |
|---|---|
| **Full-screen popup** | Open the diagram in an overlay that can be zoomed and panned freely |
| **Multiple zoom levels** | Scroll with mouse or press `+` / `−`, from 20% to 500% |
| **Zoom persistence** | Zoom level does not reset when panning — state is always preserved |
| **Drag to pan** | Hold left mouse button and drag to move the diagram |
| **Fit to window** | Automatically scales to fit the screen when opening the popup |
| **Dark / Light mode** | Automatically syncs with the current Obsidian theme, with a quick toggle button inside the popup |
| **Default `max-width: 100%`** | Small and medium diagrams display nicely inside the note without breaking layout |
| **Touch support** | Pinch-to-zoom and one-finger drag on mobile / tablet |

---
## Demo

![demo](https://i.imgur.com/x1xFYFY.gif)
---

## Installation

The plugin is not yet available in Community Plugins — install manually:

### Step 1 — Copy files into your vault

```
<vault>/.obsidian/plugins/mermaid-zoom/
├── main.js
├── styles.css
└── manifest.json
```


### Step 2 — Enable the plugin

Obsidian → **Settings** → **Community Plugins** → turn off **Restricted Mode** if not already → find **Mermaid Zoom** → **Enable**

---

## How to use

### Open the popup

Hover over any Mermaid diagram — the **⤢ Zoom** button will appear below the diagram.

Alternatively, use the keyboard shortcut: **`Ctrl + Click`** on the diagram.

### Controls inside the popup

#### Mouse / trackpad

| Action | Result |
|---|---|
| **Scroll** | Zoom in/out at cursor position |
| **Hold left mouse + drag** | Pan the view |
| Click outside the popup | Close the popup |

#### Keyboard shortcuts

| Key | Action |
|---|---|
| `+` or `=` | Zoom in |
| `-` or `_` | Zoom out |
| `0` | Reset to 100% and original position |
| `F` | Fit to window |
| `T` | Toggle Dark / Light mode |
| `Esc` | Close popup |

#### Toolbar buttons

```
[ − ] [100%] [ + ]  |  [ ⟳ Reset ] [ ⊡ Fit ]  |  [ ☀️/🌙 ] [Dark]  [ ✕ ]
```


| Button | Function |
|---|---|
| `−` / `+` | Zoom out / Zoom in by 20% steps |
| `100%` | Shows current zoom level |
| `⟳` | Reset zoom to 100% and original position |
| `⊡` | Fit diagram to popup window |
| `☀️` / `🌙` | Toggle between Dark / Light mode |
| `Dark` / `Light` | Badge indicating current theme |
| `✕` | Close popup |

#### On mobile / tablet

| Action | Result |
|---|---|
| **Two-finger pinch** | Zoom in / out |
| **One-finger drag** | Pan the diagram |

---

## Dark / Light Mode

The plugin automatically syncs with the current Obsidian theme when opening the popup:

- **Obsidian uses Dark** → popup dark background, light text
- **Obsidian uses Light** → popup light background, dark text

The `☀️/🌙` button in the toolbar allows you to switch themes directly inside the popup without leaving it.  
This change also applies to Obsidian globally (two-way sync).

---

## Zoom limits

| Parameter | Value |
|---|---|
| Minimum zoom | 20% |
| Maximum zoom | 500% |
| Zoom step | 20% |

