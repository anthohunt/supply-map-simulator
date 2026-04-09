import { useState, useCallback } from 'react'
import { useMapStore } from '@/stores/mapStore.ts'
import { captureMapAsPNG, downloadFile } from '@/services/exportService.ts'
import styles from './Export.module.css'

export function PNGExport() {
  const { tileStyle } = useMapStore()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSatellite = tileStyle === 'satellite'

  const generatePreview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const mapEl = document.querySelector('.leaflet-container') as HTMLElement | null
      if (!mapEl) {
        setError('Map not found — ensure the map is visible')
        return
      }
      const blob = await captureMapAsPNG(mapEl)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture map')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDownload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const mapEl = document.querySelector('.leaflet-container') as HTMLElement | null
      if (!mapEl) {
        setError('Map not found')
        return
      }
      const blob = await captureMapAsPNG(mapEl)
      downloadFile(blob, 'supply-map-export.png', 'image/png')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PNG')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div>
      {isSatellite && (
        <div className={styles.warningBox} role="alert">
          <span className={styles.warningText}>
            Satellite tiles cannot be exported due to CORS restrictions. Switch to Dark or Light tiles for PNG export.
          </span>
        </div>
      )}

      <div className={styles.info}>
        Export the current map view as a PNG image with all active layers rendered.
        Animated flows will appear as static lines.
      </div>

      {!previewUrl && !loading && (
        <button
          className={styles.downloadBtn}
          onClick={generatePreview}
          disabled={isSatellite}
          aria-label="Generate PNG preview"
        >
          Generate Preview
        </button>
      )}

      {loading && (
        <div className={styles.loading} role="status" aria-label="Generating PNG">
          <div className={styles.spinner} />
          Rendering map...
        </div>
      )}

      {error && (
        <div className={styles.warningBox} role="alert">
          <span className={styles.warningText}>{error}</span>
        </div>
      )}

      {previewUrl && (
        <>
          <div className={styles.preview}>
            <img
              src={previewUrl}
              alt="Map export preview"
              className={styles.previewImage}
            />
          </div>
          <button
            className={styles.downloadBtn}
            onClick={handleDownload}
            disabled={loading}
            aria-label="Download PNG"
          >
            Download PNG
          </button>
        </>
      )}
    </div>
  )
}
