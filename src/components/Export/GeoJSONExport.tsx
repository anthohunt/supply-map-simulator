import { useMemo } from 'react'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { buildGeoJSON, downloadFile } from '@/services/exportService.ts'
import { formatCount } from '@/utils/format.ts'
import styles from './Export.module.css'

const SIZE_WARNING_BYTES = 50 * 1024 * 1024 // 50MB

export function GeoJSONExport() {
  const { hubs, edges, regions } = useNetworkStore()

  const result = useMemo(
    () => buildGeoJSON(hubs, edges, regions),
    [hubs, edges, regions],
  )

  const previewText = useMemo(() => {
    const fc = result.geojson
    const lines = [
      `{`,
      `  "type": "FeatureCollection",`,
      `  "features": [  // ${formatCount(fc.features.length)} features`,
    ]
    // Show one feature per geometry type for a representative preview
    const shown = new Set<string>()
    const samples: GeoJSON.Feature[] = []
    for (const f of fc.features) {
      if (!shown.has(f.geometry.type)) {
        shown.add(f.geometry.type)
        samples.push(f)
      }
      if (samples.length >= 3) break
    }
    // If fewer than 3 types, pad with remaining features
    if (samples.length < 3) {
      for (const f of fc.features) {
        if (!samples.includes(f)) {
          samples.push(f)
          if (samples.length >= 3) break
        }
      }
    }
    for (const f of samples) {
      const props = f.properties as Record<string, unknown>
      lines.push(`    { "type": "Feature", "geometry": { "type": "${f.geometry.type}" }, "properties": { "featureType": "${props.featureType}", "id": "${props.id}" } },`)
    }
    if (fc.features.length > samples.length) {
      lines.push(`    ... ${fc.features.length - samples.length} more features`)
    }
    lines.push(`  ]`, `}`)
    return lines.join('\n')
  }, [result])

  const sizeLabel = useMemo(() => {
    const mb = result.sizeBytes / (1024 * 1024)
    if (mb >= 1) return `${mb.toFixed(1)} MB`
    const kb = result.sizeBytes / 1024
    return `${kb.toFixed(0)} KB`
  }, [result.sizeBytes])

  const hubCount = result.geojson.features.filter(
    (f) => (f.properties as Record<string, unknown>).featureType === 'hub',
  ).length
  const edgeCount = result.geojson.features.filter(
    (f) => (f.properties as Record<string, unknown>).featureType === 'edge',
  ).length
  const regionCount = result.geojson.features.filter(
    (f) => (f.properties as Record<string, unknown>).featureType === 'region',
  ).length

  const handleDownload = () => {
    const json = JSON.stringify(result.geojson, null, 2)
    downloadFile(json, 'supply-map-network.geojson', 'application/geo+json')
  }

  if (hubs.length === 0 && edges.length === 0 && regions.length === 0) {
    return (
      <div className={styles.emptyMessage}>
        No network data to export. Run the pipeline and generate a network first.
      </div>
    )
  }

  return (
    <div>
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Points (Hubs)</span>
          <span className={styles.statValue}>{hubCount}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>LineStrings (Edges)</span>
          <span className={styles.statValue}>{edgeCount}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Polygons (Regions)</span>
          <span className={styles.statValue}>{regionCount}</span>
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div className={styles.warningBox} role="alert">
          <span className={styles.warningText}>
            {result.warnings.length} feature(s) omitted: {result.warnings.join('; ')}
          </span>
        </div>
      )}

      {result.sizeBytes > SIZE_WARNING_BYTES && (
        <div className={styles.warningBox} role="alert">
          <span className={styles.warningText}>
            File size is {sizeLabel}. Consider filtering to specific tiers to reduce size.
          </span>
        </div>
      )}

      <div className={styles.info}>
        File size: {sizeLabel} &middot; {formatCount(result.geojson.features.length)} features
      </div>

      <div className={styles.preview} aria-label="GeoJSON preview">
        {previewText}
      </div>

      <button
        className={styles.downloadBtn}
        onClick={handleDownload}
        aria-label="Download GeoJSON"
      >
        Download GeoJSON
      </button>
    </div>
  )
}
