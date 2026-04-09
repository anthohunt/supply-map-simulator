import { useState } from 'react'
import { HubTierToggles } from './HubTierToggles.tsx'
import { InfrastructureToggles } from './InfrastructureToggles.tsx'
import { BoundaryToggles } from './BoundaryToggles.tsx'
import { OpacitySliders } from './OpacitySliders.tsx'
import { FlowToggle } from './FlowToggle.tsx'
import { FlowFilters } from '@/components/FlowAnalysis/FlowFilters.tsx'
import { CorridorTable } from '@/components/FlowAnalysis/CorridorTable.tsx'
import { NetworkStatsPanel } from '@/components/FlowAnalysis/NetworkStatsPanel.tsx'
import styles from './Layers.module.css'
import flowStyles from '@/components/FlowAnalysis/FlowAnalysis.module.css'

type Tab = 'layers' | 'flows' | 'stats'

export function LayerControls() {
  const [activeTab, setActiveTab] = useState<Tab>('layers')

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Network Explorer</h2>
      <div className={flowStyles.tabSwitcher}>
        <button
          className={`${flowStyles.tab} ${activeTab === 'layers' ? flowStyles.tabActive : ''}`}
          onClick={() => setActiveTab('layers')}
        >
          Layers
        </button>
        <button
          className={`${flowStyles.tab} ${activeTab === 'flows' ? flowStyles.tabActive : ''}`}
          onClick={() => setActiveTab('flows')}
        >
          Flows
        </button>
        <button
          className={`${flowStyles.tab} ${activeTab === 'stats' ? flowStyles.tabActive : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
      </div>

      {activeTab === 'layers' && (
        <>
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
        </>
      )}

      {activeTab === 'flows' && (
        <>
          <FlowFilters />
          <CorridorTable />
        </>
      )}

      {activeTab === 'stats' && (
        <NetworkStatsPanel />
      )}
    </div>
  )
}
