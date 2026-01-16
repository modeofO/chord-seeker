import type { AnimationSpeed, AnimationState } from '../types/triad'

interface Props {
  currentIndex: number
  totalPositions: number
  animationState: AnimationState
  speed: AnimationSpeed
  enableAudio: boolean
  onPrevious: () => void
  onNext: () => void
  onPlayPause: () => void
  onSpeedChange: (speed: AnimationSpeed) => void
  onAudioToggle: (enabled: boolean) => void
}

export function TriadControls({
  currentIndex,
  totalPositions,
  animationState,
  speed,
  enableAudio,
  onPrevious,
  onNext,
  onPlayPause,
  onSpeedChange,
  onAudioToggle
}: Props) {
  const progress = totalPositions > 0 ? ((currentIndex + 1) / totalPositions) * 100 : 0
  const hasPositions = totalPositions > 0
  const hasSinglePosition = totalPositions === 1

  return (
    <div className="triad-controls">
      {/* Position indicator and progress bar */}
      <div className="triad-progress-section">
        <div className="triad-position-indicator">
          Position {currentIndex + 1} of {totalPositions}
        </div>
        <div className="triad-progress-bar">
          <div
            className="triad-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Navigation and playback controls */}
      <div className="btn-group" style={{ justifyContent: 'center' }}>
        <button
          className="btn btn-secondary"
          onClick={onPrevious}
          disabled={!hasPositions || currentIndex === 0}
          aria-label="Previous position"
        >
          Previous
        </button>

        <button
          className="btn btn-primary"
          onClick={onPlayPause}
          disabled={!hasPositions || hasSinglePosition}
          aria-label={animationState === 'playing' ? 'Pause' : 'Play'}
        >
          {animationState === 'playing' ? 'Pause' : 'Play'}
        </button>

        <button
          className="btn btn-secondary"
          onClick={onNext}
          disabled={!hasPositions || currentIndex === totalPositions - 1}
          aria-label="Next position"
        >
          Next
        </button>

        <button
          className={`btn btn-icon ${enableAudio ? 'active' : ''}`}
          onClick={() => onAudioToggle(!enableAudio)}
          disabled={!hasPositions}
          title={enableAudio ? 'Mute audio' : 'Enable audio'}
          aria-label={enableAudio ? 'Mute audio' : 'Enable audio'}
        >
          <span className="audio-icon">{enableAudio ? '🔊' : '🔇'}</span>
        </button>
      </div>

      {/* Speed selector */}
      <div className="speed-section">
        <label className="speed-label">Speed:</label>
        <div className="btn-group btn-group-tight">
          <button
            className={`btn btn-secondary btn-sm ${speed === 'slow' ? 'active' : ''}`}
            onClick={() => onSpeedChange('slow')}
            disabled={!hasPositions}
          >
            Slow
          </button>
          <button
            className={`btn btn-secondary btn-sm ${speed === 'medium' ? 'active' : ''}`}
            onClick={() => onSpeedChange('medium')}
            disabled={!hasPositions}
          >
            Medium
          </button>
          <button
            className={`btn btn-secondary btn-sm ${speed === 'fast' ? 'active' : ''}`}
            onClick={() => onSpeedChange('fast')}
            disabled={!hasPositions}
          >
            Fast
          </button>
        </div>
      </div>
    </div>
  )
}
