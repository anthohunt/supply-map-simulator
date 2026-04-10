import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'
import { useMapStore } from '@/stores/mapStore.ts'
import type { HubTier } from '@/types/index.ts'
import styles from './Map.module.css'

const TILT_DEG = 45
const PERSPECTIVE_PX = 1200

const TIER_COLORS: Record<HubTier, string> = {
  global: '#F5A623',
  regional: '#EF5350',
  gateway: '#1FBAD6',
  local: '#AB47BC',
  access: '#66BB6A',
}

function hasGPU(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    )
  } catch {
    return false
  }
}

export function ThreeDProjection() {
  const { threeDEnabled } = useMapStore()
  const map = useMap()
  const [noGPU, setNoGPU] = useState(false)

  useEffect(() => {
    if (threeDEnabled && !hasGPU()) {
      setNoGPU(true)
    }
  }, [threeDEnabled])

  useEffect(() => {
    const container = map.getContainer()
    const wrapper = container.parentElement
    if (!wrapper) return

    if (threeDEnabled && !noGPU) {
      wrapper.style.perspective = `${PERSPECTIVE_PX}px`
      wrapper.style.perspectiveOrigin = '50% 50%'
      container.style.transform = `rotateX(${TILT_DEG}deg)`
      container.style.transformOrigin = 'center bottom'
      container.style.transition = 'transform 0.5s ease'
    } else {
      wrapper.style.perspective = ''
      wrapper.style.perspectiveOrigin = ''
      container.style.transform = ''
      container.style.transformOrigin = ''
      container.style.transition = 'transform 0.5s ease'
    }

    return () => {
      wrapper.style.perspective = ''
      wrapper.style.perspectiveOrigin = ''
      container.style.transform = ''
      container.style.transformOrigin = ''
      container.style.transition = ''
    }
  }, [threeDEnabled, noGPU, map])

  if (!threeDEnabled) return null

  if (noGPU) {
    return (
      <div className={styles.threeDFallback}>
        3D view requires GPU acceleration — your browser does not support it.
      </div>
    )
  }

  // Tier elevation labels pinned to the right edge
  const tiers: Array<[HubTier, string, number]> = [
    ['global', 'Global', 15],
    ['regional', 'Regional', 30],
    ['gateway', 'Gateway', 50],
    ['local', 'Local', 70],
    ['access', 'Access', 85],
  ]

  return (
    <div className={styles.threeDLabels}>
      {tiers.map(([tier, label, topPct]) => (
        <div
          key={tier}
          className={styles.threeDTierLabel}
          style={{ top: `${topPct}%`, color: TIER_COLORS[tier] }}
        >
          <span className={styles.threeDTierLine} style={{ background: TIER_COLORS[tier] }} />
          {label}
        </div>
      ))}
    </div>
  )
}
