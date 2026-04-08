import { useTerritoryStore } from '@/stores/territoryStore.ts'
import { TerritoryInput } from '@/components/TerritoryInput/TerritoryInput.tsx'
import { DataPipelineDashboard } from '@/components/DataPipeline/DataPipelineDashboard.tsx'
import { PixelizationControls } from '@/components/Pixelization/PixelizationControls.tsx'
import { LayerControls } from '@/components/Layers/LayerControls.tsx'
import styles from './Sidebar.module.css'

interface SidebarProps {
  onHoverSite?: (siteId: string | null) => void
}

const STEPS = [
  { screen: 'territory-search', label: 'Territory' },
  { screen: 'data-pipeline', label: 'Data' },
  { screen: 'pixelization', label: 'Cluster' },
  { screen: 'network-map', label: 'Network' },
] as const

const SCREEN_ORDER: Record<string, number> = {
  'territory-search': 0,
  'data-pipeline': 1,
  'pixelization': 2,
  'network-map': 3,
}

export function Sidebar({ onHoverSite }: SidebarProps) {
  const { currentScreen } = useTerritoryStore()
  const currentIndex = SCREEN_ORDER[currentScreen] ?? 0

  return (
    <aside className={styles.sidebar} role="complementary" aria-label="Control sidebar">
      <div className={styles.header}>
        <h1 className={styles.logo}>Supply Map</h1>
      </div>
      <nav className={styles.stepper} aria-label="Workflow progress">
        {STEPS.map((step, i) => {
          const state = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'upcoming'
          return (
            <div
              key={step.screen}
              className={`${styles.stepperItem} ${styles[`stepperItem--${state}`]}`}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <span className={styles.stepperDot}>{state === 'done' ? '\u2713' : i + 1}</span>
              <span className={styles.stepperLabel}>{step.label}</span>
            </div>
          )
        })}
      </nav>
      <div className={styles.content}>
        {currentScreen === 'territory-search' && <TerritoryInput />}
        {currentScreen === 'data-pipeline' && <DataPipelineDashboard onHoverSite={onHoverSite} />}
        {currentScreen === 'pixelization' && <PixelizationControls />}
        {currentScreen === 'network-map' && <LayerControls />}
      </div>
    </aside>
  )
}
