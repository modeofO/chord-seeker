import { NOTE_TO_INDEX, INDEX_TO_NOTE } from '../data/notes'
import type { GuitarString, NoteId } from '../types/music'
import type { StringState, TuningDefinition } from '../types/analyzer'

interface Props {
  tuning: TuningDefinition
  stringStates: Record<GuitarString, StringState>
  onStringStateChange: (string: GuitarString, state: StringState) => void
}

const STRINGS: GuitarString[] = [6, 5, 4, 3, 2, 1]
const FRETS = 12
const fretGap = 50
const stringGap = 36
const margin = { left: 60, right: 40, top: 40, bottom: 40 }

// String thickness
const STRING_THICKNESS: Record<GuitarString, number> = {
  6: 3.0,
  5: 2.6,
  4: 2.2,
  3: 1.8,
  2: 1.5,
  1: 1.2
}

// Fret markers
const FRET_MARKERS = [3, 5, 7, 9, 12]

export function InteractiveFretboard({ tuning, stringStates, onStringStateChange }: Props) {
  const width = margin.left + margin.right + FRETS * fretGap
  const height = margin.top + margin.bottom + (STRINGS.length - 1) * stringGap

  const getNoteAtFret = (stringNum: GuitarString, fret: number): NoteId => {
    const stringIndex = STRINGS.indexOf(stringNum)
    const openNote = tuning.notes[stringIndex]
    const openSemitone = NOTE_TO_INDEX[openNote]
    const targetSemitone = (openSemitone + fret) % 12
    return INDEX_TO_NOTE[targetSemitone]
  }

  const positionForFret = (fret: number) => {
    if (fret === 0) return margin.left - 15 // Open string position
    return margin.left + (fret - 0.5) * fretGap
  }

  const positionForString = (stringId: GuitarString) => {
    const index = STRINGS.indexOf(stringId)
    const flippedIndex = STRINGS.length - 1 - index
    return margin.top + flippedIndex * stringGap
  }

  const handleFretClick = (stringNum: GuitarString, fret: number) => {
    const currentState = stringStates[stringNum]

    if (fret === 0) {
      // Clicking on open string position - cycle: muted → open → muted
      if (currentState === 'open') {
        onStringStateChange(stringNum, 'muted')
      } else {
        onStringStateChange(stringNum, 'open')
      }
    } else {
      // Clicking on a fret - cycle: muted → fret → muted
      if (currentState === fret) {
        onStringStateChange(stringNum, 'muted')
      } else {
        onStringStateChange(stringNum, fret)
      }
    }
  }

  return (
    <div className="interactive-fretboard-shell">
      <svg viewBox={`0 0 ${width} ${height}`} className="interactive-fretboard-svg">
        {/* Background */}
        <rect x={0} y={0} width={width} height={height} rx={12} className="interactive-fretboard-bg" />

        {/* Frets */}
        {Array.from({ length: FRETS + 1 }).map((_, index) => {
          const x = margin.left + index * fretGap
          const isNut = index === 0
          return (
            <line
              key={`fret-${index}`}
              x1={x}
              x2={x}
              y1={margin.top - 10}
              y2={height - margin.bottom + 10}
              className={isNut ? 'interactive-nut' : 'interactive-fret'}
            />
          )
        })}

        {/* Strings */}
        {STRINGS.map((stringId) => (
          <line
            key={`string-${stringId}`}
            x1={margin.left - 20}
            x2={width - margin.right}
            y1={positionForString(stringId)}
            y2={positionForString(stringId)}
            className="interactive-string"
            strokeWidth={STRING_THICKNESS[stringId]}
          />
        ))}

        {/* Fret markers */}
        {FRET_MARKERS.map((fret) => {
          const x = margin.left + fret * fretGap - fretGap / 2
          const y = height / 2

          if (fret === 12) {
            return (
              <g key={`marker-${fret}`}>
                <circle cx={x} cy={y - 20} r={5} className="interactive-fret-marker" />
                <circle cx={x} cy={y + 20} r={5} className="interactive-fret-marker" />
              </g>
            )
          }

          return <circle key={`marker-${fret}`} cx={x} cy={y} r={5} className="interactive-fret-marker" />
        })}

        {/* Clickable areas and indicators */}
        {STRINGS.map((stringId) => {
          const stringY = positionForString(stringId)
          const state = stringStates[stringId]

          return (
            <g key={`string-${stringId}-notes`}>
              {/* Open string area and indicator */}
              <g>
                <circle
                  cx={positionForFret(0)}
                  cy={stringY}
                  r={16}
                  className="interactive-click-area"
                  onClick={() => handleFretClick(stringId, 0)}
                />
                {state === 'open' && (
                  <g pointerEvents="none">
                    <circle
                      cx={positionForFret(0)}
                      cy={stringY}
                      r={14}
                      className="interactive-note-active"
                    />
                    <text
                      x={positionForFret(0)}
                      y={stringY + 5}
                      className="interactive-note-label"
                    >
                      O
                    </text>
                  </g>
                )}
                {state === 'muted' && (
                  <text
                    x={positionForFret(0)}
                    y={stringY + 6}
                    className="interactive-muted-label"
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    X
                  </text>
                )}
              </g>

              {/* Fretted notes */}
              {Array.from({ length: FRETS }).map((_, fretIndex) => {
                const fret = fretIndex + 1
                const x = positionForFret(fret)
                const isActive = state === fret
                const note = getNoteAtFret(stringId, fret)

                return (
                  <g key={`${stringId}-${fret}`}>
                    <circle
                      cx={x}
                      cy={stringY}
                      r={16}
                      className="interactive-click-area"
                      onClick={() => handleFretClick(stringId, fret)}
                    />
                    {isActive && (
                      <g pointerEvents="none">
                        <circle cx={x} cy={stringY} r={14} className="interactive-note-active" />
                        <text x={x} y={stringY + 5} className="interactive-note-label">
                          {note}
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* String labels (tuning) on left */}
        {STRINGS.map((stringId, index) => {
          const note = tuning.notes[index]
          const y = positionForString(stringId)
          return (
            <text
              key={`tuning-${stringId}`}
              x={20}
              y={y + 5}
              className="interactive-string-label"
              textAnchor="start"
            >
              {note}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
