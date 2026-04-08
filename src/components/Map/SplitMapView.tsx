import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { BoundaryLayer } from './BoundaryLayer.tsx'
import { HubMarkerLayer } from './HubMarkerLayer.tsx'
import { EdgeLayer } from './EdgeLayer.tsx'
import { InfrastructureLayer } from './InfrastructureLayer.tsx'
import { SplitPanelProvider, useSplitPanelContext } from '@/contexts/SplitPanelContext.tsx'
import { useMapStore, type TileStyle } from '@/stores/mapStore.ts'
import { useNetworkStore } from '@/stores/networkStore.ts'
import type { Map as LeafletMap } from 'leaflet'
import type { HubTier } from '@/types/index.ts'
import 'leaflet/dist/leaflet.css'
import styles from './Map.module.css'

/**
 * Syncs the right map's center/zoom to match the left map.
 * Listens to moveend/zoomend on the left map reference.
 */
function SyncToLeft({ leftMapRef }: { leftMapRef: React.RefObject<LeafletMap | null> }) {
  const rightMap = useMap()
  const syncing = useRef(false)

  useEffect(() => {
    const leftMap = leftMapRef.current
    if (!leftMap) return

    const syncRight = () => {
      if (syncing.current) return
      syncing.current = true
      rightMap.setView(leftMap.getCenter(), leftMap.getZoom(), { animate: false })
      syncing.current = false
    }

    leftMap.on('move', syncRight)
    leftMap.on('zoom', syncRight)
    return () => {
      leftMap.off('move', syncRight)
      leftMap.off('zoom', syncRight)
    }
  }, [leftMapRef, rightMap])

  return null
}

function RightMapClickHandler() {
  const { setSelectedHubId } = useNetworkStore()
  useMapEvents({
    click: () => setSelectedHubId(null),
  })
  return null
}

const SPLIT_TILE_CONFIGS: Record<TileStyle, { url: string; attribution: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
  terrain: {
    url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png',
    attribution: '&copy; Stadia Maps &copy; Stamen Design',
  },
}

/** Tile layer for right side, using an independent tile style */
function RightTileLayer({ tileStyle }: { tileStyle: TileStyle }) {
  const config = SPLIT_TILE_CONFIGS[tileStyle]
  return <TileLayer key={tileStyle} url={config.url} attribution={config.attribution} />
}

const TIER_COLORS: Record<HubTier, string> = {
  global: '#F5A623',
  regional: '#EF5350',
  gateway: '#1FBAD6',
  local: '#AB47BC',
  access: '#66BB6A',
}

/** Compact layer toggles for the right split panel */
function RightPanelControls() {
  const ctx = useSplitPanelContext()
  if (!ctx) return null

  const tiers: { tier: HubTier; label: string }[] = [
    { tier: 'global', label: 'G' },
    { tier: 'regional', label: 'R' },
    { tier: 'gateway', label: 'Gw' },
  ]

  const boundaries: { key: 'regions' | 'areas' | 'counties'; label: string }[] = [
    { key: 'regions', label: 'Reg' },
    { key: 'areas', label: 'Area' },
    { key: 'counties', label: 'Cty' },
  ]

  return (
    <div className={styles.rightPanelControls}>
      <div className={styles.rightPanelGroup}>
        {tiers.map(({ tier, label }) => (
          <button
            key={tier}
            className={`${styles.rightPanelBtn} ${ctx.visibleTiers.has(tier) ? styles.rightPanelBtnActive : ''}`}
            onClick={() => ctx.toggleTier(tier)}
            title={`${tier} hubs`}
            style={{ borderColor: TIER_COLORS[tier] }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.rightPanelGroup}>
        {boundaries.map(({ key, label }) => (
          <button
            key={key}
            className={`${styles.rightPanelBtn} ${ctx.boundaryLayers[key] ? styles.rightPanelBtnActive : ''}`}
            onClick={() => ctx.toggleBoundaryLayer(key)}
            title={`${key} boundaries`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface SplitMapViewProps {
  leftMapRef: React.RefObject<LeafletMap | null>
  center: [number, number]
  zoom: number
}

export function SplitMapView({ leftMapRef, center, zoom }: SplitMapViewProps) {
  const rightMapRef = useRef<LeafletMap | null>(null)
  const [rightTileStyle, setRightTileStyle] = useState<TileStyle>('dark')
  const { splitViewEnabled } = useMapStore()
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 1024)

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleRightCreated = useCallback((map: LeafletMap) => {
    rightMapRef.current = map
    // Sync initial position from left map
    const leftMap = leftMapRef.current
    if (leftMap) {
      map.setView(leftMap.getCenter(), leftMap.getZoom(), { animate: false })
    }
  }, [leftMapRef])

  if (!splitViewEnabled) return null

  const tileOptions: { id: TileStyle; label: string }[] = [
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
    { id: 'satellite', label: 'Sat' },
    { id: 'terrain', label: 'Terrain' },
  ]

  return (
    <SplitPanelProvider>
      <div
        className={isNarrow ? styles.splitMapVertical : styles.splitMapRight}
        role="region"
        aria-label="Split view comparison map"
      >
        <MapContainer
          center={center}
          zoom={zoom}
          className={styles.map}
          zoomControl={true}
          ref={handleRightCreated}
        >
          <RightTileLayer tileStyle={rightTileStyle} />
          <BoundaryLayer />
          <EdgeLayer />
          <HubMarkerLayer />
          <InfrastructureLayer />
          <SyncToLeft leftMapRef={leftMapRef} />
          <RightMapClickHandler />
        </MapContainer>
        <RightPanelControls />
        <div className={styles.splitTilePicker}>
          {tileOptions.map((opt) => (
            <button
              key={opt.id}
              className={`${styles.splitTileBtn} ${rightTileStyle === opt.id ? styles.splitTileBtnActive : ''}`}
              onClick={() => setRightTileStyle(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </SplitPanelProvider>
  )
}
