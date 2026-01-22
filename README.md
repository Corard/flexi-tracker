# Flexi Tracker

A modern, privacy-focused flexible working hours tracker with peer-to-peer device sync. Track your work hours, manage flexi-time balances, and seamlessly sync across devices without any server or account required.

**Live at [flexi.corard.tech](https://flexi.corard.tech)**

## Features

### Time Tracking

- **Daily time entry** with start/end times and break minutes
- **Live tracking** with real-time balance updates and pulsing indicator
- **Quick presets** for common scenarios:
  - Normal working day
  - Sick leave (full/half day)
  - Holiday (full/half day)
  - Flexi day (full/half day)
  - Copy previous day's times

### Balance Management

- **Weekly summaries** showing hours worked vs expected
- **Overall flexi balance** tracking across all time
- **Manual adjustments** with notes for credits/debits
- **Color-coded indicators** (green = positive, red = negative)

### Flexible Settings

- Configurable working days (default Mon-Fri)
- Customizable expected hours per day (default 7.5h)
- Week start day selection (Monday/Sunday)
- Non-working day overtime multiplier
- Multiple display modes for non-working days

### P2P Device Sync

- **Serverless sync** via WebRTC - your data never touches a third-party server
- **QR code pairing** for quick device connections
- **Manual peer code** fallback for text-based pairing
- **Conflict resolution UI** when data differs between devices
- **Settings sync** including adjustments and preferences

### Data Management

- Automatic local storage persistence
- JSON export/import for backups
- Merge imports with existing data
- Clear all data option

## Tech Stack

- **React 19** with TypeScript (strict mode)
- **Vite 7** for fast development and optimized builds
- **Tailwind CSS 4** for styling
- **shadcn/ui** component library
- **PeerJS** for WebRTC peer-to-peer connections
- **html5-qrcode** for QR code scanning

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js 18+)

### Installation

```bash
# Clone the repository
git clone https://github.com/Corard/flexi-tracker.git
cd flexi-tracker

# Install dependencies
bun install
```

### Development

```bash
bun dev
```

Opens at `http://localhost:5173` with hot module replacement.

### Build

```bash
bun run build
```

Creates an optimized production build in the `dist/` directory.

### Preview Production Build

```bash
bun run preview
```

## Keyboard Shortcuts

| Key | Action        |
| --- | ------------- |
| `←` | Previous week |
| `→` | Next week     |
| `T` | Jump to today |

## Project Structure

```
src/
├── components/
│   ├── flexi-tracker/     # Main application components
│   │   ├── FlexiTracker.tsx    # Root component & state
│   │   ├── DayCard.tsx         # Individual day entry
│   │   ├── WeekNav.tsx         # Week navigation
│   │   ├── SettingsPanel.tsx   # Settings & data management
│   │   ├── AdjustmentsPanel.tsx # Manual balance adjustments
│   │   └── SyncPanel.tsx       # P2P sync interface
│   └── ui/                # shadcn/ui components
├── hooks/
│   ├── use-storage.ts     # Local storage persistence
│   └── use-p2p-sync.ts    # P2P sync state management
├── lib/
│   ├── flexi-tracker-utils.ts  # Time calculations
│   └── sync/              # P2P sync logic
│       ├── peer-connection.ts  # WebRTC connection manager
│       ├── sync-protocol.ts    # Message protocol
│       └── merge-strategy.ts   # Conflict resolution
└── types/
    └── flexi-tracker.ts   # TypeScript definitions
```

## Deployment

The project includes Cloudflare Workers configuration for static asset deployment:

```bash
npx wrangler deploy
```

## Privacy

Flexi Tracker is designed with privacy in mind:

- **No accounts** - No sign-up or login required
- **Local-first** - All data stored in your browser's localStorage
- **P2P sync** - Device sync uses direct WebRTC connections; no data passes through servers
- **No tracking** - No analytics, cookies, or third-party services

## Scripts

| Command            | Description               |
| ------------------ | ------------------------- |
| `bun dev`          | Start development server  |
| `bun run build`    | Build for production      |
| `bun run preview`  | Preview production build  |
| `bun lint`         | Run ESLint                |
| `bun format`       | Format code with Prettier |
| `bun format:check` | Check code formatting     |
