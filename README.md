# Clinical Trials Frontend

React + TypeScript single-page app for the clinical trial chatbot and interactive map. Patients type natural-language queries in a chat panel, and matching trial sites appear as colour-coded pins on a MapLibre GL map.

---

## UI Layout

```
┌────────────────────┬─────────────────────────────────────────────────┐
│                    │                                                 │
│   CHAT PANEL       │   MAP PANEL (MapLibre GL / MapTiler)            │
│   (left, 400 px)   │                                                 │
│                    │  ┌──────────────────┐   ┌──────────────────┐    │
│  User types query  │  │  Filter Panel    │   │  Legend          │    │
│  → assistant reply │  │  (top-left)      │   │  (top-right)     │    │
│  → map updates     │  └──────────────────┘   └──────────────────┘    │
│                    │                                                 │
│                    │   ● Recruiting (green)                          │
│                    │   ● Not Yet Recruiting (amber)                  │
│                    │   ● Completed (gray)  …                         │
│                    │                                                 │
│                    ├─────────────────────────────────────────────────┤
│                    │  SUMMARY PANEL  (bottom-right overlay)          │
│                    │  Appears when a map pin is clicked              │
└────────────────────┴─────────────────────────────────────────────────┘
```

---

## Stack

| Tool | Version | Purpose |
|------|---------|---------|
| React | 18 | UI framework |
| TypeScript | 5.5 | Type safety |
| Vite | 5 | Dev server & bundler |
| Tailwind CSS | 3.4 | Utility-class styling |
| MapLibre GL JS | 4.4 | WebGL map rendering |
| MapTiler | — | Map tile basemap & geocoding |
| Axios | 1.6 | HTTP client for backend API |
| Lucide React | 0.400 | Icon set |

---

## Project Structure

```
frontend/
├── index.html                  # SPA shell
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── src/
    ├── main.tsx                # React root mount
    ├── index.css               # Tailwind base imports
    └── App.tsx                 # Root component — state & layout
    └── components/
        ├── ChatPanel.tsx       # Conversational chat UI
        ├── MapPanel.tsx        # MapLibre GL map + filter panel + legend
        └── SummaryPanel.tsx    # Trial detail card (overlay on pin click)
```

---

## Components

### `App.tsx`

Root component. Owns all shared state and wires the panels together.

| State | Type | Description |
|-------|------|-------------|
| `geoJson` | GeoJSON FeatureCollection | Trial data currently displayed on the map |
| `selectedPin` | feature properties or `null` | The pin the user last clicked |
| `mapCenter` | `[lon, lat]` | Drives `flyTo` in MapPanel |
| `activeLocation` | string | Label for the currently loaded location |

On mount, fetches all trials from `GET /api/trials` to populate the initial map.

### `ChatPanel.tsx`

Left-side conversational interface.

- Maintains a local message history (`Message[]`).
- On send, `POST /api/chat` → receives `{ reply, geojson }`.
- Calls `onGeoJsonUpdate(geojson)` which triggers a map update and `flyTo` in the parent.
- Renders a lightweight inline bold formatter (`**text**` → `<strong>`).
- Shows an animated `"Searching trials…"` indicator while waiting.

### `MapPanel.tsx`

Full-height MapLibre GL map panel.

**Map layers (added on load):**

| Layer | Description |
|-------|-------------|
| `clusters` | Blue circle bubbles for grouped points; size/shade scales with count |
| `cluster-count` | White label showing the point count inside a cluster |
| `trials-layer` | Individual pins colour-coded by trial status |

**Status colours:**

| Status | Colour |
|--------|--------|
| Recruiting | Green `#10B981` |
| Enrolling by Invitation | Light green `#34D399` |
| Not Yet Recruiting | Amber `#F59E0B` |
| Active, Not Recruiting | Blue `#3B82F6` |
| Completed | Gray `#6B7280` |
| Terminated | Red `#EF4444` |
| Suspended | Orange `#F97316` |
| Withdrawn | Purple `#8B5CF6` |

**Filter panel (top-left overlay):**

All filters are applied client-side on the already-loaded GeoJSON — no extra API calls.

| Filter | Options |
|--------|---------|
| Max Distance | 25 / 50 / 100 / 200 / 500 km (only shown when a location is active) |
| Status | Derived from loaded features |
| Province | Derived from loaded features |
| Cancer Type | Derived from loaded features (pipe-separated values split automatically) |

Filters reset automatically whenever new GeoJSON data arrives (e.g. after a new chat query).

**Interactions:**
- Click a cluster → zoom in to expand it.
- Click an individual pin → fires `onPinClick` → opens `SummaryPanel`.
- `flyTo` is triggered whenever `mapCenter` prop changes (driven by chat).

### `SummaryPanel.tsx`

Bottom-right overlay card, shown when a pin is clicked.

Displays: Trial ID, Cancer Type, Status, Facility, City, distance (if available), Principal Investigator, and an external link to the full trial details. Header colour matches the trial's status colour. Closed by clicking ✕ or clicking another part of the map.

---

## Setup

### Prerequisites

- Node.js 20+
- npm (or pnpm / yarn)

### Install

```powershell
cd frontend
npm install
```

### Run (development)

Make sure the backend is running on predefined updated url, then:

```powershell
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build (production)

```powershell
npm run build   # outputs to dist/
npm run preview # preview the production build locally
```

---

## Data Flow

```
User types message
       │
       ▼
ChatPanel → POST /api/chat
       │
       ▼
Backend returns { reply, geojson }
       │
       ├── reply   → rendered in ChatPanel message list
       └── geojson → App state → MapPanel re-renders pins
                              → flyTo new user_center
                              → Filter panel options regenerated from new features
                              → Previous filter selections reset
```
