# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
bun run dev      # Start Vite dev server with hot reload
bun run build    # TypeScript check + production build
bun run preview  # Preview production build locally
```

This project uses Bun as the package manager.

## Architecture

Chord Seeker is a React 19 + TypeScript application for visualizing guitar chord shapes. Users select a root note and chord quality, and the app displays all matching chord shape voicings with SVG fretboard diagrams and Web Audio playback.

### Core Data Flow

1. **App.tsx** maintains state for selected root note and chord quality
2. **buildChordShapes()** in `src/utils/chordUtils.ts` generates `RuntimeChordShape` instances by:
   - Filtering templates from `src/data/chordShapes.ts` that match the quality
   - Transposing movable shapes based on the root note offset
   - Calculating finger placements, string states, and fret windows
3. **Components** render the shapes with interactive controls and audio playback

### Key Types (src/types/music.ts)

- **ChordShapeTemplate**: Static shape definition with positions, barre specs, open/muted strings
- **RuntimeChordShape**: Calculated shape instance with resolved finger placements, string states, display name, and audio note data
- **FingerPosition**: Fret/string/finger number with interval label (R, b3, 5, etc.)
- **BarreSpec**: Defines barre chord spanning multiple strings

### Shape Families

Chord shapes are organized by CAGED system families in `src/data/chordShapes.ts`:
- E-family, A-family, C-family, D-family (movable barre shapes)
- Custom (open position and special voicings)

Each template specifies `isMovable: true/false` to determine if it transposes with root note changes.

### Audio Engine (src/audio/engine.ts)

`ChordAudioEngine` uses Web Audio API with:
- Triangle wave oscillators
- Staggered note timing (35ms between strings for strum effect)
- 2-second decay envelope
- `orderNotesForStrum()` orders notes from low to high string

### Components

- **GuitarScene**: Hero display showing up to 2 featured chord diagrams
- **Fretboard**: SVG chord diagram with finger dots, barre indicators, open/muted markers
- **ShapeCard**: Card wrapper with chord name, description, play button
- **ChordControls**: Root note and quality selectors
