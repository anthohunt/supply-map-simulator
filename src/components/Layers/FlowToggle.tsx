import { useFlowStore } from '@/stores/flowStore.ts'
import { useFlows } from '@/hooks/useFlows.ts'
import styles from '@/components/FlowAnalysis/FlowAnalysis.module.css'

export function FlowToggle() {
  const { flowsEnabled, setFlowsEnabled } = useFlowStore()
  const { flows } = useFlows()

  return (
    <button
      className={`${styles.flowToggle} ${flowsEnabled ? styles.flowToggleActive : ''}`}
      onClick={() => setFlowsEnabled(!flowsEnabled)}
      aria-pressed={flowsEnabled}
      aria-label={`${flowsEnabled ? 'Disable' : 'Enable'} flow visualization`}
    >
      <span className={styles.flowDot} />
      <span className={styles.flowLabel}>Freight Flows</span>
      <span className={styles.flowCount}>{flows.length}</span>
      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--accent)', width: 16, textAlign: 'center' as const }}>
        {flowsEnabled ? '\u2713' : ''}
      </span>
    </button>
  )
}
