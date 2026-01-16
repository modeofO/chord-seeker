import { GUITAR_STRINGS } from '../data/notes'
import type { GuitarString, RuntimeChordShape } from '../types/music'

interface Props {
  shapes: RuntimeChordShape[]
  accentColor: string
}

export function GuitarScene({ shapes, accentColor }: Props) {
  const heroShapes = shapes.slice(0, 2)

  if (!heroShapes.length) {
    return <div className="guitar-scene hero" />
  }

  return (
    <div className="guitar-scene hero">
      {heroShapes.map((shape) => (
        <HeroBoard key={shape.instanceId} shape={shape} accentColor={accentColor} />
      ))}
    </div>
  )
}

function collectRootFrets(shape: RuntimeChordShape) {
  const frets = Object.values(shape.stringStates)
    .filter((state) => state.interval === 'R' && !state.isMuted && state.fret !== null)
    .map((state) => state.fret as number)
  return Array.from(new Set(frets)).sort((a, b) => a - b)
}

function HeroBoard({ shape, accentColor }: { shape: RuntimeChordShape; accentColor: string }) {
  const width = 420
  const height = 230
  const marginX = 40
  const marginY = 30
  const rangeStart = Math.max(0, shape.fretWindow.start - 1)
  const rangeEnd = Math.max(rangeStart + 4, shape.fretWindow.end + 1)
  const fretCount = rangeEnd - rangeStart
  const availableWidth = width - marginX * 2
  const availableHeight = height - marginY * 2
  const fretSpacing = availableWidth / fretCount
  const stringSpacing = availableHeight / (GUITAR_STRINGS.length - 1)

  const stringY = (stringId: GuitarString) => marginY + GUITAR_STRINGS.indexOf(stringId) * stringSpacing
  const fretX = (fret: number) => marginX + (fret - rangeStart) * fretSpacing
  const fingerX = (fret: number) => fretX(fret) + fretSpacing / 2
  const rootFrets = collectRootFrets(shape)
  const highlightFret = Math.min(Math.max(rootFrets[0] ?? shape.fretWindow.start, rangeStart), rangeEnd)

  const openIndicators = GUITAR_STRINGS.filter((stringId) => {
    const state = shape.stringStates[stringId]
    return state && !state.isMuted && state.fret === 0
  })

  const mutedStrings = GUITAR_STRINGS.filter((stringId) => shape.stringStates[stringId]?.isMuted)

  return (
    <div className="hero-board">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={shape.displayName}>
        <defs>
          <linearGradient id={`hero-neck-${shape.instanceId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#080313" />
            <stop offset="100%" stopColor="#190426" />
          </linearGradient>
          <linearGradient id={`hero-highlight-${shape.instanceId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.55" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <rect
          x={marginX - 20}
          y={marginY - 24}
          width={availableWidth + 40}
          height={availableHeight + 48}
          rx={24}
          fill={`url(#hero-neck-${shape.instanceId})`}
          stroke="rgba(255,255,255,0.08)"
        />
        <rect
          x={fingerX(highlightFret) - fretSpacing * 0.6}
          y={marginY - 10}
          width={fretSpacing * 1.2}
          height={availableHeight + 20}
          rx={16}
          fill={`url(#hero-highlight-${shape.instanceId})`}
        />
        {GUITAR_STRINGS.map((stringId, index) => (
          <line
            key={`string-${shape.instanceId}-${stringId}`}
            x1={marginX - 4}
            x2={marginX + availableWidth + 4}
            y1={stringY(stringId)}
            y2={stringY(stringId)}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={index * 0.35 + 1.2}
          />
        ))}
        {Array.from({ length: fretCount + 1 }).map((_, index) => (
          <line
            key={`fret-${shape.instanceId}-${index}`}
            x1={fretX(rangeStart + index)}
            x2={fretX(rangeStart + index)}
            y1={marginY - 14}
            y2={marginY + availableHeight + 14}
            stroke={index === 0 && rangeStart === 0 ? '#fdf8ff' : 'rgba(255,255,255,0.25)'}
            strokeWidth={index === 0 && rangeStart === 0 ? 5 : 2}
          />
        ))}
        {shape.barre && shape.barre.fret >= rangeStart && shape.barre.fret <= rangeEnd && (() => {
          const fromIndex = GUITAR_STRINGS.indexOf(shape.barre.fromString)
          const toIndex = GUITAR_STRINGS.indexOf(shape.barre.toString)
          const topIndex = Math.min(fromIndex, toIndex)
          const bottomIndex = Math.max(fromIndex, toIndex)
          const topY = marginY + topIndex * stringSpacing - 10
          const heightRect = (bottomIndex - topIndex) * stringSpacing + 20
          return (
            <rect
              x={fingerX(shape.barre.fret) - fretSpacing * 0.35}
              y={topY}
              width={fretSpacing * 0.7}
              height={heightRect}
              rx={10}
              fill={accentColor}
              fillOpacity={0.45}
            />
          )
        })()}
        {shape.fingerPlacements.map((placement) => (
          <g key={`${shape.instanceId}-finger-${placement.string}-${placement.fret}`}>
            <circle
              cx={fingerX(placement.fret)}
              cy={stringY(placement.string)}
              r={placement.isRoot ? 11 : 9}
              fill={placement.isRoot ? accentColor : '#f7e6ff'}
              fillOpacity={placement.isRoot ? 0.95 : 0.8}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={placement.isRoot ? 2 : 1}
            />
            {placement.interval && (
              <text
                x={fingerX(placement.fret)}
                y={stringY(placement.string) + 4}
                textAnchor="middle"
                fontSize="10"
                fill="#060210"
                fontWeight="600"
              >
                {placement.interval}
              </text>
            )}
          </g>
        ))}
        {openIndicators.map((stringId) => (
          <text
            key={`${shape.instanceId}-open-${stringId}`}
            x={marginX - 18}
            y={stringY(stringId) + 4}
            fill="#fefefe"
            fontSize="12"
            fontWeight="600"
          >
            O
          </text>
        ))}
        {mutedStrings.map((stringId) => (
          <text
            key={`${shape.instanceId}-mute-${stringId}`}
            x={marginX - 18}
            y={stringY(stringId) + 4}
            fill="#f57e7e"
            fontSize="12"
            fontWeight="700"
          >
            ×
          </text>
        ))}
      </svg>
      <div className="hero-board-footer">
        <span className="hero-board-title">{shape.displayName}</span>
        {rootFrets.length > 0 && (
          <div className="root-fret-pills">
            {rootFrets.map((fret) => (
              <span key={`${shape.instanceId}-hero-root-${fret}`}>{fret === 0 ? 'Open' : `Fret ${fret}`}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
