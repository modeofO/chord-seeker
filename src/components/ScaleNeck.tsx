import { GUITAR_STRINGS, STRING_TUNINGS } from '../data/notes'
import type { GuitarString } from '../types/music'
import type { ScaleNote } from '../types/progression'

interface Props {
  scaleNotes: ScaleNote[]
  primaryColor: string
  accentColor: string
  scaleName: string
}

const fretGap = 44
const stringGap = 32
const margin = { left: 40, right: 32, top: 28, bottom: 32 }
const fretCount = 13 // Show frets 0-12

// String thickness based on actual guitar string gauges
const STRING_THICKNESS: Record<GuitarString, number> = {
  6: 3.0,
  5: 2.6,
  4: 2.2,
  3: 1.8,
  2: 1.5,
  1: 1.2
}

// Fret markers (standard guitar positions)
const FRET_MARKERS = [3, 5, 7, 9, 12]

export function ScaleNeck({ scaleNotes, primaryColor, accentColor, scaleName }: Props) {
  const width = margin.left + margin.right + fretCount * fretGap
  const height = margin.top + margin.bottom + (GUITAR_STRINGS.length - 1) * stringGap

  const positionForFret = (fret: number) => margin.left + (fret - 0.5) * fretGap

  const positionForString = (stringId: GuitarString) => {
    const index = GUITAR_STRINGS.indexOf(stringId)
    const flippedIndex = GUITAR_STRINGS.length - 1 - index
    return margin.top + flippedIndex * stringGap
  }

  // Group notes by position for rendering
  const notesToRender = scaleNotes.filter((note) => note.fret <= 12)

  return (
    <div className="scale-neck-container">
      <div className="scale-neck-header">
        <h3 className="scale-neck-title">{scaleName}</h3>
      </div>
      <div className="scale-neck-shell">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${scaleName} scale visualization`}
        >
          {/* Background */}
          <rect x={0} y={0} width={width} height={height} rx={12} className="scale-neck-bg" />

          {/* Frets */}
          {Array.from({ length: fretCount + 1 }).map((_, index) => {
            const x = margin.left + index * fretGap
            const isNut = index === 0
            return (
              <line
                key={`fret-${index}`}
                x1={x}
                x2={x}
                y1={margin.top - 10}
                y2={height - margin.bottom + 10}
                className={isNut ? 'scale-nut' : 'scale-fret'}
              />
            )
          })}

          {/* Strings with varying thickness */}
          {GUITAR_STRINGS.map((stringId) => (
            <line
              key={`string-${stringId}`}
              x1={margin.left}
              x2={width - margin.right}
              y1={positionForString(stringId)}
              y2={positionForString(stringId)}
              className="scale-string"
              strokeWidth={STRING_THICKNESS[stringId]}
            />
          ))}

          {/* Fret markers */}
          {FRET_MARKERS.map((fret) => {
            const x = margin.left + fret * fretGap - fretGap / 2
            const y = height / 2

            if (fret === 12) {
              // Double dots at 12th fret
              return (
                <g key={`marker-${fret}`}>
                  <circle cx={x} cy={y - 16} r={4} className="scale-fret-marker" />
                  <circle cx={x} cy={y + 16} r={4} className="scale-fret-marker" />
                </g>
              )
            }

            // Single dot for other positions
            return <circle key={`marker-${fret}`} cx={x} cy={y} r={4} className="scale-fret-marker" />
          })}

          {/* Scale notes */}
          {notesToRender.map((note, index) => {
            const isRoot = note.interval === 'R'
            const radius = isRoot ? 12 : 9
            const color = isRoot ? primaryColor : accentColor

            return (
              <g key={`${note.string}-${note.fret}-${index}`} className="scale-note-group">
                <circle
                  cx={positionForFret(note.fret)}
                  cy={positionForString(note.string as GuitarString)}
                  r={radius}
                  style={{ fill: color }}
                  className="scale-note-dot"
                />
                <text
                  x={positionForFret(note.fret)}
                  y={positionForString(note.string as GuitarString) + 4}
                  className="scale-note-label"
                >
                  {note.interval}
                </text>
              </g>
            )
          })}

          {/* String tuning labels */}
          {GUITAR_STRINGS.map((stringId) => (
            <text
              key={`tuning-${stringId}`}
              x={width - 12}
              y={positionForString(stringId) + 4}
              className="scale-string-label"
              textAnchor="end"
            >
              {STRING_TUNINGS[stringId].note}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}
