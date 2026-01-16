import { useEffect, useState } from 'react'
import type { ChordQuality, NoteId } from '../types/music'
import type { ScaleDefinition } from '../types/progression'
import { QUALITY_MAP } from '../data/chordQualities'
import { getScalesForQuality } from '../data/scales'
import { generateScaleNotes } from '../utils/scaleUtils'
import { ScaleNeck } from './ScaleNeck'

interface Props {
  root: NoteId
  quality: ChordQuality
  // For syncing with progression viewer
  syncedRoot?: NoteId
  syncedQuality?: ChordQuality
}

export function ScaleExplorer({ root, quality, syncedRoot, syncedQuality }: Props) {
  const [selectedScale, setSelectedScale] = useState<ScaleDefinition | null>(null)

  // Use synced values if provided, otherwise use the main root/quality
  const displayRoot = syncedRoot || root
  const displayQuality = syncedQuality || quality

  const qualityDef = QUALITY_MAP[displayQuality]
  const compatibleScales = getScalesForQuality(displayQuality)

  // Set default scale when quality changes
  useEffect(() => {
    if (compatibleScales.length > 0) {
      // Try to keep the same scale if it's still compatible
      if (selectedScale && compatibleScales.some((s) => s.id === selectedScale.id)) {
        return
      }
      setSelectedScale(compatibleScales[0])
    }
  }, [displayQuality, compatibleScales, selectedScale])

  if (compatibleScales.length === 0) {
    return (
      <section className="scale-explorer">
        <h2 className="scale-title">Scale Explorer</h2>
        <p className="scale-empty">No scales available for this chord quality</p>
      </section>
    )
  }

  const scaleNotes = selectedScale ? generateScaleNotes(displayRoot, selectedScale, 15) : []

  const handleScaleChange = (scaleId: string) => {
    const scale = compatibleScales.find((s) => s.id === scaleId)
    if (scale) {
      setSelectedScale(scale)
    }
  }

  return (
    <section className="scale-explorer">
      <h2 className="scale-title">Scale Explorer</h2>
      <p className="scale-subtitle">
        {syncedRoot && syncedQuality
          ? `Scales for ${syncedRoot} ${syncedQuality} (from progression)`
          : `Scales for ${displayRoot} ${displayQuality}`}
      </p>

      {/* Scale Selector */}
      <div className="scale-selector">
        <label className="scale-label">Select Scale:</label>
        <select
          className="scale-select"
          value={selectedScale?.id || ''}
          onChange={(e) => handleScaleChange(e.target.value)}
        >
          {compatibleScales.map((scale) => (
            <option key={scale.id} value={scale.id}>
              {scale.displayName} - {scale.description}
            </option>
          ))}
        </select>
      </div>

      {/* Scale Visualization */}
      {selectedScale && (
        <ScaleNeck
          scaleNotes={scaleNotes}
          primaryColor={qualityDef.color}
          accentColor={qualityDef.accent}
          scaleName={`${displayRoot} ${selectedScale.displayName}`}
        />
      )}

      {/* Scale Info */}
      {selectedScale && (
        <div className="scale-info">
          <div className="scale-info-section">
            <h4 className="scale-info-title">Scale Formula</h4>
            <div className="scale-intervals">
              {selectedScale.intervals.map((interval, index) => (
                <span key={index} className="scale-interval-badge">
                  {interval}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
