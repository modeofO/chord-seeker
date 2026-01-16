import { useRef, useEffect } from 'react'
import type { GuitarString } from '../types/music'
import type { TabSheet, Technique, TabPosition } from '../types/songBuilder'

interface Props {
  tabSheet: TabSheet
  currentMeasure: number
  currentSubdivision: number
  onNoteClick?: (measureIndex: number, subdivisionIndex: number, stringId: GuitarString) => void
  highlightColor?: string
}

const STRING_LABELS: Record<GuitarString, string> = {
  1: 'e',
  2: 'B',
  3: 'G',
  4: 'D',
  5: 'A',
  6: 'E'
}

// Display order: high strings at top
const DISPLAY_ORDER: GuitarString[] = [1, 2, 3, 4, 5, 6]

// Layout constants
const MARGIN = { left: 30, right: 20, top: 30, bottom: 20 }
const STRING_GAP = 20
const SUBDIVISION_WIDTH = 36 // Wider to fit technique suffixes
const MEASURE_GAP = 20

// Technique symbols for display
const TECHNIQUE_SYMBOLS: Record<Technique, string> = {
  'normal': '',
  'hammer-on': 'h',
  'pull-off': 'p',
  'slide-up': '/',
  'slide-down': '\\',
  'bend': 'b',
  'harmonic': '<>',
  'muted': 'x'
}

// Get display text for a tab position
function getTabDisplayText(position: TabPosition): { main: string; suffix: string } {
  if (position.fret === null) {
    return { main: '-', suffix: '' }
  }

  const technique = position.technique || 'normal'

  if (technique === 'muted') {
    return { main: 'x', suffix: '' }
  }

  if (technique === 'harmonic') {
    return { main: `<${position.fret}>`, suffix: '' }
  }

  const symbol = TECHNIQUE_SYMBOLS[technique]
  let suffix = ''

  if (position.targetFret !== undefined) {
    if (technique === 'slide-up' || technique === 'slide-down') {
      suffix = `${symbol}${position.targetFret}`
    } else if (technique === 'bend') {
      suffix = 'b'
    }
  } else if (symbol && technique !== 'normal') {
    suffix = symbol
  }

  return { main: String(position.fret), suffix }
}

export function TabDisplay({
  tabSheet,
  currentMeasure,
  currentSubdivision,
  onNoteClick,
  highlightColor = '#fbbf24'
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate dimensions
  const subdivisions = tabSheet.measures[0]?.subdivisions || 8
  const measureWidth = subdivisions * SUBDIVISION_WIDTH + MEASURE_GAP
  const totalWidth = MARGIN.left + MARGIN.right + tabSheet.measures.length * measureWidth
  const totalHeight = MARGIN.top + MARGIN.bottom + (DISPLAY_ORDER.length - 1) * STRING_GAP

  // Auto-scroll to keep current measure visible
  useEffect(() => {
    if (containerRef.current) {
      const measureX = MARGIN.left + currentMeasure * measureWidth
      const containerWidth = containerRef.current.clientWidth
      const scrollLeft = measureX - containerWidth / 2 + measureWidth / 2

      containerRef.current.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth'
      })
    }
  }, [currentMeasure, measureWidth])

  const getStringY = (stringId: GuitarString) => {
    const index = DISPLAY_ORDER.indexOf(stringId)
    return MARGIN.top + index * STRING_GAP
  }

  const getSubdivisionX = (measureIndex: number, subdivisionIndex: number) => {
    return MARGIN.left + measureIndex * measureWidth + subdivisionIndex * SUBDIVISION_WIDTH + SUBDIVISION_WIDTH / 2
  }

  const handleClick = (measureIndex: number, subdivisionIndex: number, stringId: GuitarString) => {
    if (onNoteClick) {
      onNoteClick(measureIndex, subdivisionIndex, stringId)
    }
  }

  return (
    <div className="tab-display-container" ref={containerRef}>
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="tab-display-svg"
        style={{ width: totalWidth, height: totalHeight, minWidth: '100%' }}
      >
        {/* Background */}
        <rect
          x={0}
          y={0}
          width={totalWidth}
          height={totalHeight}
          className="tab-display-bg"
        />

        {/* String labels on left */}
        {DISPLAY_ORDER.map((stringId) => (
          <text
            key={`label-${stringId}`}
            x={12}
            y={getStringY(stringId) + 4}
            className="tab-string-label"
          >
            {STRING_LABELS[stringId]}
          </text>
        ))}

        {/* Draw each measure */}
        {tabSheet.measures.map((measure, measureIndex) => {
          const measureStartX = MARGIN.left + measureIndex * measureWidth

          return (
            <g key={`measure-${measureIndex}`}>
              {/* Measure start bar line */}
              <line
                x1={measureStartX}
                y1={MARGIN.top - 5}
                x2={measureStartX}
                y2={MARGIN.top + (DISPLAY_ORDER.length - 1) * STRING_GAP + 5}
                className="tab-bar-line"
              />

              {/* Measure end bar line */}
              <line
                x1={measureStartX + subdivisions * SUBDIVISION_WIDTH}
                y1={MARGIN.top - 5}
                x2={measureStartX + subdivisions * SUBDIVISION_WIDTH}
                y2={MARGIN.top + (DISPLAY_ORDER.length - 1) * STRING_GAP + 5}
                className="tab-bar-line"
              />

              {/* Horizontal lines for strings */}
              {DISPLAY_ORDER.map((stringId) => (
                <line
                  key={`string-line-${measureIndex}-${stringId}`}
                  x1={measureStartX}
                  y1={getStringY(stringId)}
                  x2={measureStartX + subdivisions * SUBDIVISION_WIDTH}
                  y2={getStringY(stringId)}
                  className="tab-string-line"
                />
              ))}

              {/* Current position highlight */}
              {measureIndex === currentMeasure && (
                <rect
                  x={getSubdivisionX(measureIndex, currentSubdivision) - SUBDIVISION_WIDTH / 2}
                  y={MARGIN.top - 8}
                  width={SUBDIVISION_WIDTH}
                  height={(DISPLAY_ORDER.length - 1) * STRING_GAP + 16}
                  fill={highlightColor}
                  opacity={0.2}
                  rx={4}
                />
              )}

              {/* Fret numbers / notes */}
              {DISPLAY_ORDER.map((stringId) => (
                <g key={`notes-${measureIndex}-${stringId}`}>
                  {measure.positions[stringId].map((fret, subdivisionIndex) => {
                    const x = getSubdivisionX(measureIndex, subdivisionIndex)
                    const y = getStringY(stringId)
                    const isCurrentBeat =
                      measureIndex === currentMeasure && subdivisionIndex === currentSubdivision

                    // Get technique info if available
                    const tabPosition = measure.positionsWithTechnique?.[stringId]?.[subdivisionIndex] || { fret }
                    const displayInfo = tabPosition.fret !== null
                      ? getTabDisplayText(tabPosition)
                      : { main: '-', suffix: '' }
                    const technique = tabPosition.technique || 'normal'

                    return (
                      <g
                        key={`note-${measureIndex}-${stringId}-${subdivisionIndex}`}
                        onClick={() => handleClick(measureIndex, subdivisionIndex, stringId)}
                        className={`tab-note-group ${technique !== 'normal' ? `technique-${technique}` : ''}`}
                        style={{ cursor: onNoteClick ? 'pointer' : 'default' }}
                      >
                        {/* Clickable area */}
                        <rect
                          x={x - SUBDIVISION_WIDTH / 2}
                          y={y - STRING_GAP / 2}
                          width={SUBDIVISION_WIDTH}
                          height={STRING_GAP}
                          fill="transparent"
                        />

                        {fret !== null ? (
                          <>
                            {/* Background for note */}
                            <rect
                              x={x - 12}
                              y={y - 9}
                              width={displayInfo.suffix ? 32 : 24}
                              height={18}
                              rx={4}
                              className={`tab-note-bg ${isCurrentBeat ? 'active' : ''} ${technique !== 'normal' ? `technique-${technique}` : ''}`}
                              style={isCurrentBeat ? { fill: highlightColor } : undefined}
                            />
                            {/* Fret number with technique */}
                            <text
                              x={x - (displayInfo.suffix ? 4 : 0)}
                              y={y + 4}
                              className={`tab-fret-number ${isCurrentBeat ? 'active' : ''}`}
                            >
                              {displayInfo.main}
                            </text>
                            {/* Technique suffix */}
                            {displayInfo.suffix && (
                              <text
                                x={x + 6}
                                y={y + 4}
                                className={`tab-technique-suffix ${technique}`}
                              >
                                {displayInfo.suffix}
                              </text>
                            )}
                          </>
                        ) : (
                          /* Dash for empty position */
                          <text x={x} y={y + 4} className="tab-dash">
                            -
                          </text>
                        )}
                      </g>
                    )
                  })}
                </g>
              ))}

              {/* Chord name below measure */}
              <text
                x={measureStartX + (subdivisions * SUBDIVISION_WIDTH) / 2}
                y={MARGIN.top + (DISPLAY_ORDER.length - 1) * STRING_GAP + 18}
                className="tab-chord-name"
              >
                {measure.chordName}
              </text>

              {/* Degree above measure */}
              <text
                x={measureStartX + (subdivisions * SUBDIVISION_WIDTH) / 2}
                y={MARGIN.top - 12}
                className="tab-chord-degree"
              >
                {measure.chordDegree}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
