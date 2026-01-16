import type { ChordQualityDefinition, RuntimeChordShape } from '../types/music'
import { Fretboard } from './Fretboard'

interface Props {
  shape: RuntimeChordShape
  quality: ChordQualityDefinition
  onPlay: (shape: RuntimeChordShape) => void
}

function collectRootFrets(shape: RuntimeChordShape) {
  const frets = Object.values(shape.stringStates)
    .filter((state) => state.interval === 'R' && !state.isMuted && state.fret !== null)
    .map((state) => state.fret as number)
  return Array.from(new Set(frets)).sort((a, b) => a - b)
}

export function ShapeCard({ shape, quality, onPlay }: Props) {
  const rootFrets = collectRootFrets(shape)

  return (
    <article className="shape-card" style={{ borderColor: quality.accent }}>
      <header className="shape-card-header">
        <div>
          <p className="shape-tag">{quality.label}</p>
          <h3>{shape.displayName}</h3>
          <p className="shape-description">{shape.description}</p>
        </div>
        <button className="play-button" onClick={() => onPlay(shape)}>
          Play chord
        </button>
      </header>
      <div className="shape-visual">
        <Fretboard shape={shape} />
        {rootFrets.length > 0 && (
          <div className="root-fret-overlay local">
            <span className="root-label">Root</span>
            <div className="root-fret-pills">
              {rootFrets.map((fret) => (
                <span key={`${shape.instanceId}-root-${fret}`}>
                  {fret === 0 ? 'Open' : `Fret ${fret}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
