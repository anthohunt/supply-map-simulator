import { useEffect, useRef, useCallback, useState } from 'react'
import { useMap } from 'react-leaflet'
import { useMapStore } from '@/stores/mapStore.ts'
import { useNetworkStore } from '@/stores/networkStore.ts'
import type { HubTier } from '@/types/index.ts'
import styles from './Map.module.css'

const TIER_ELEVATION: Record<HubTier, number> = {
  global: 0,
  regional: 60,
  gateway: 30,
  local: 15,
  access: 0,
}

const TIER_COLORS: Record<HubTier, string> = {
  global: '#F5A623',
  regional: '#EF5350',
  gateway: '#1FBAD6',
  local: '#AB47BC',
  access: '#66BB6A',
}

function hasWebGL(): boolean {
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
  const { hubs, edges, networkStatus, visibleTiers } = useNetworkStore()
  const map = useMap()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const [rotation, setRotation] = useState(0)
  const [noWebGL, setNoWebGL] = useState(false)
  const [fps, setFps] = useState(60)
  const lastFrameTime = useRef(performance.now())
  const fpsFrames = useRef(0)
  const fpsAccumulator = useRef(0)

  useEffect(() => {
    if (threeDEnabled && !hasWebGL()) {
      setNoWebGL(true)
    }
  }, [threeDEnabled])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !threeDEnabled || networkStatus !== 'complete') return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const now = performance.now()
    const delta = now - lastFrameTime.current
    lastFrameTime.current = now
    fpsFrames.current++
    fpsAccumulator.current += delta

    if (fpsAccumulator.current >= 1000) {
      setFps(Math.round((fpsFrames.current * 1000) / fpsAccumulator.current))
      fpsFrames.current = 0
      fpsAccumulator.current = 0
    }

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    const tiltAngle = 0.3
    const rotRad = (rotation * Math.PI) / 180

    const hubMap = new Map(hubs.map((h) => [h.id, h]))

    // Draw edges first
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.3
    for (const edge of edges) {
      const src = hubMap.get(edge.sourceHubId)
      const tgt = hubMap.get(edge.targetHubId)
      if (!src || !tgt) continue
      if (!visibleTiers.has(src.tier) && !visibleTiers.has(tgt.tier)) continue

      const srcPt = map.latLngToContainerPoint([src.position[1], src.position[0]])
      const tgtPt = map.latLngToContainerPoint([tgt.position[1], tgt.position[0]])

      const srcElev = TIER_ELEVATION[src.tier] * Math.cos(rotRad)
      const tgtElev = TIER_ELEVATION[tgt.tier] * Math.cos(rotRad)

      const srcY = srcPt.y * Math.cos(tiltAngle) - srcElev
      const tgtY = tgtPt.y * Math.cos(tiltAngle) - tgtElev

      ctx.strokeStyle = edge.color
      ctx.beginPath()
      ctx.moveTo(srcPt.x, srcY)
      ctx.lineTo(tgtPt.x, tgtY)
      ctx.stroke()
    }

    // Draw hubs
    ctx.globalAlpha = 0.9
    for (const hub of hubs) {
      if (!visibleTiers.has(hub.tier)) continue

      const pt = map.latLngToContainerPoint([hub.position[1], hub.position[0]])
      const elevation = TIER_ELEVATION[hub.tier] * Math.cos(rotRad)
      const y = pt.y * Math.cos(tiltAngle) - elevation

      const radius = hub.tier === 'global' ? 8 : hub.tier === 'regional' ? 6 : 5

      ctx.fillStyle = TIER_COLORS[hub.tier]
      ctx.beginPath()
      ctx.arc(pt.x, y, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    ctx.globalAlpha = 1

    animFrameRef.current = requestAnimationFrame(draw)
  }, [threeDEnabled, networkStatus, hubs, edges, visibleTiers, rotation, map])

  useEffect(() => {
    if (!threeDEnabled) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      return
    }

    const container = map.getContainer()
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }

    animFrameRef.current = requestAnimationFrame(draw)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [threeDEnabled, draw, map])

  // Resize canvas on map resize
  useEffect(() => {
    if (!threeDEnabled) return
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const container = map.getContainer()
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }
    map.on('resize', handleResize)
    map.on('move', () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = requestAnimationFrame(draw)
    })
    return () => {
      map.off('resize', handleResize)
    }
  }, [threeDEnabled, map, draw])

  // Keyboard rotation: left/right arrows when 3D is focused
  useEffect(() => {
    if (!threeDEnabled) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setRotation((r) => r - 5)
      if (e.key === 'ArrowRight') setRotation((r) => r + 5)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [threeDEnabled])

  if (!threeDEnabled) return null

  if (noWebGL) {
    return (
      <div className={styles.threeDFallback}>
        3D projection requires WebGL — your browser does not support it.
      </div>
    )
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.threeDCanvas}
      />
      {fps < 30 && (
        <div className={styles.threeDFpsWarning}>
          Low performance ({fps} FPS) — consider reducing visible layers
        </div>
      )}
    </>
  )
}
