import { useState, lazy, Suspense } from 'react'
import { HubTierToggles } from './HubTierToggles.tsx'
import { InfrastructureToggles } from './InfrastructureToggles.tsx'
import { BoundaryToggles } from './BoundaryToggles.tsx'
import { OpacitySliders } from './OpacitySliders.tsx'
import { FlowToggle } from './FlowToggle.tsx'
import { FlowFilters } from '@/components/FlowAnalysis/FlowFilters.tsx'
import { CorridorTable } from '@/components/FlowAnalysis/CorridorTable.tsx'
import styles from './Layers.module.css'
import flowStyles from '@/components/FlowAnalysis/FlowAnalysis.module.css'

const NetworkStatsPanel = lazy(() =>
  import('@/components/FlowAnalysis/NetworkStatsPanel.tsx').then((m) => ({
    default: m.NetworkStatsPanel,
  }))
)

type Tab = 'layers' | 'flows' | 'stats'

interface LayerControlsProps {
  onExportClick?: () => void
}

export function LayerControls({ onExportClick }: LayerControlsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('layers')

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Network Explorer</h2>
      <div className={flowStyles.tabSwitcher} role="tablist" aria-label="Network explorer tabs">
        <button
          role="tab"
          aria-selected={activeTab === 'layers'}
          aria-controls="panel-layers"
          className={`${flowStyles.tab} ${activeTab === 'layers' ? flowStyles.tabActive : ''}`}
          onClick={() => setActiveTab('layers')}
        >
          Layers
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'flows'}
          aria-controls="panel-flows"
          className={`${flowStyles.tab} ${activeTab === 'flows' ? flowStyles.tabActive : ''}`}
          onClick={() => setActiveTab('flows')}
        >
          Flows
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'stats'}
          aria-controls="panel-stats"
          className={`${flowStyles.tab} ${activeTab === 'stats' ? flowStyles.tabActive : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
      </div>

      {activeTab === 'layers' && (
        <div id="panel-layers" role="tabpanel" aria-labelledby="tab-layers">
          <p className={styles.explorerHint}>
            Click any hub on the map to see its connections and freight details.
            Toggle tiers below to filter the view.
          </p>
          <div className={styles.divider} />
          <HubTierToggles />
          <div className={styles.divider} />
          <FlowToggle />
          <div className={styles.divider} />
          <InfrastructureToggles />
          <div className={styles.divider} />
          <BoundaryToggles />
          <div className={styles.divider} />
          <OpacitySliders />
          <div className={styles.divider} />
          {onExportClick && (
            <button
              className={styles.exportBtn}
              onClick={onExportClick}
              aria-label="Export network data"
            >
              Export Data
            </button>
          )}
        </div>
      )}

      {activeTab === 'flows' && (
        <div id="panel-flows" role="tabpanel" aria-labelledby="tab-flows">
          <FlowFilters />
          <CorridorTable />
        </div>
      )}

      {activeTab === 'stats' && (
        <div id="panel-stats" role="tabpanel" aria-labelledby="tab-stats">
          <Suspense fallback={<div className={styles.loading}>Loading stats...</div>}>
            <NetworkStatsPanel />
          </Suspense>
        </div>
      )}
    </div>
  )
}
