import { AppShell } from '@/components/AppShell/AppShell.tsx'
import { useTerritoryStore } from '@/stores/territoryStore.ts'
import { usePipelineStore } from '@/stores/pipelineStore.ts'
import { useNetworkStore } from '@/stores/networkStore.ts'

// Expose stores on window in dev mode for Playwright testing
if (import.meta.env.DEV) {
  Object.assign(window, {
    __stores: {
      territory: useTerritoryStore,
      pipeline: usePipelineStore,
      network: useNetworkStore,
    },
  })
}

function App() {
  return <AppShell />
}

export default App
