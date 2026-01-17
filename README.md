# Chord Seeker

A React application for exploring guitar chord shapes, voicings, and music theory. Built with React 19, TypeScript, and Web Audio API.

## Features

### Chord Shape Explorer
- Select any root note and chord quality (major, minor, 7th, etc.)
- View all available chord voicings organized by CAGED system families
- Interactive SVG fretboard diagrams showing finger positions, barres, and open/muted strings
- Audio playback with realistic strum effect

### Triad Explorer
- Visualize triad inversions across the fretboard
- Understand root position, first inversion, and second inversion shapes

### Progression Viewer
- Browse common chord progressions (I-IV-V-I, ii-V-I, etc.)
- Animated playback with tempo control
- Click any chord in the progression to see its shapes

### Song Builder
- Generate guitar riffs based on chord progressions
- Multiple riff styles: Melodic, Arpeggiated, Bass-Driven, Complex
- Interactive tab editor - click to add/remove notes
- Multi-track layering with solo/mute/volume controls
- Export to MIDI or ASCII tab format

### Scale Explorer
- View scale patterns that fit the current chord
- Syncs with progression viewer for contextual scale suggestions

### Circle of Fifths
- Interactive circle of fifths visualization
- Click to change root note and explore key relationships

### Chord Analyzer
- Input chord names to analyze their intervals and structure
- Understand chord construction and naming conventions

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (recommended) or Node.js 18+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd chord-seeker

# Install dependencies
bun install

# Start development server
bun run dev
```

### Build

```bash
# Production build
bun run build

# Preview production build
bun run preview
```

## Project Structure

```
src/
├── audio/
│   ├── engine.ts        # Chord playback audio engine
│   └── songEngine.ts    # Song builder multi-track audio engine
├── components/
│   ├── ChordControls.tsx    # Root/quality selector
│   ├── ChordAnalyzer.tsx    # Chord name analyzer
│   ├── CircleOfFifths.tsx   # Interactive circle of fifths
│   ├── Fretboard.tsx        # SVG chord diagram renderer
│   ├── ProgressionViewer.tsx # Chord progression player
│   ├── ScaleExplorer.tsx    # Scale pattern viewer
│   ├── ShapeCard.tsx        # Chord shape card with play button
│   ├── SongBuilderPanel.tsx # Riff generator and track mixer
│   ├── TabDisplay.tsx       # Guitar tab renderer
│   └── TriadExplorer.tsx    # Triad inversion explorer
├── data/
│   ├── chordQualities.ts    # Chord quality definitions
│   ├── chordShapes.ts       # CAGED shape templates
│   ├── notes.ts             # Note definitions and tunings
│   └── progressions.ts      # Common chord progressions
├── types/
│   ├── music.ts             # Core music types
│   ├── progression.ts       # Progression types
│   └── songBuilder.ts       # Song builder types
├── utils/
│   ├── chordUtils.ts        # Chord shape building logic
│   ├── midiExport.ts        # MIDI file export
│   ├── riffGenerator.ts     # Algorithmic riff generation
│   ├── tabExport.ts         # ASCII tab export
│   └── tabFormatter.ts      # Tab formatting utilities
├── App.tsx
├── main.tsx
└── main.css
```

## Key Concepts

### CAGED System
Chord shapes are organized by the CAGED system - five fundamental open chord shapes (C, A, G, E, D) that can be moved up the neck to play any chord:

- **E-family**: Barre chords based on the open E shape
- **A-family**: Barre chords based on the open A shape
- **C-family**: Shapes based on the open C shape
- **D-family**: Shapes based on the open D shape
- **Custom**: Open position chords and special voicings

### Chord Shape Templates
Each chord shape is defined as a template with:
- Finger positions (string, fret, finger number)
- Barre specifications (which fret, which strings)
- Open and muted string indicators
- Whether the shape is movable (transposes with root changes)

### Audio Engine
Uses Web Audio API with:
- Triangle wave oscillators for warm tone
- Staggered note timing (35ms between strings) for realistic strum
- 2-second decay envelope
- Master gain control

### Song Builder Audio
Multi-track audio engine supporting:
- Dynamic track gain nodes
- Master gain bus
- Solo/mute logic
- Synchronized playback across tracks

## Technologies

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Web Audio API** - Audio synthesis and playback
- **SVG** - Fretboard and diagram rendering

## License

MIT
