import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { useFlows } from '@/hooks/useFlows.ts'
import { formatTonnage, formatCount } from '@/utils/format.ts'
import { haversine } from '@/utils/geo.ts'
import type { HubTier } from '@/types/index.ts'
import styles from './FlowAnalysis.module.css'

const TIER_COLORS: Record<HubTier, string> = {
  global: '#F5A623',
  regional: '#EF5350',
  gateway: '#1FBAD6',
  local: '#AB47BC',
  access: '#66BB6A',
}

const TIER_LABELS: Record<HubTier, string> = {
  global: 'Global',
  regional: 'Regional',
  gateway: 'Gateway',
  local: 'Local',
  access: 'Access',
}

export function NetworkStatsPanel() {
  const { hubs, edges, networkStatus, counties } = useNetworkStore()
  const { flows } = useFlows()

  const stats = useMemo(() => {
    if (networkStatus !== 'complete' || hubs.length === 0) return null

    // Hub counts by tier
    const tierCounts: Record<string, number> = {}
    const tierThroughput: Record<string, number> = {}
    for (const hub of hubs) {
      tierCounts[hub.tier] = (tierCounts[hub.tier] ?? 0) + 1
      tierThroughput[hub.tier] = (tierThroughput[hub.tier] ?? 0) + (hub.throughputTons ?? 0)
    }

    // Bar chart data
    const tierData = (['global', 'regional', 'gateway'] as HubTier[])
      .filter((tier) => tierCounts[tier])
      .map((tier) => ({
        tier: TIER_LABELS[tier],
        count: tierCounts[tier] ?? 0,
        throughput: tierThroughput[tier] ?? 0,
        color: TIER_COLORS[tier],
      }))

    // Demand balance: variance of regional throughput
    const regionalHubs = hubs.filter((h) => h.tier === 'regional')
    let demandBalance = 100
    if (regionalHubs.length > 1) {
      const throughputs = regionalHubs.map((h) => h.throughputTons ?? 0)
      const mean = throughputs.reduce((a, b) => a + b, 0) / throughputs.length
      const variance = throughputs.reduce((sum, t) => sum + (t - mean) ** 2, 0) / throughputs.length
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0
      // Score: 100 = perfectly balanced, 0 = highly imbalanced
      demandBalance = Math.max(0, Math.round(100 * (1 - Math.min(cv, 1))))
    }

    // Coverage: % of counties within 100km of a hub
    let coverage = 0
    const THRESHOLD_KM = 100
    if (counties.length > 0) {
      let covered = 0
      for (const county of counties) {
        const nearest = hubs.reduce((best, hub) => {
          const dist = haversine(hub.position, county.centroid)
          return dist < best ? dist : best
        }, Infinity)
        if (nearest <= THRESHOLD_KM) covered++
      }
      coverage = Math.round((covered / counties.length) * 100)
    } else {
      coverage = -1 // unknown
    }

    // Average/max inter-hub distance
    let avgDist = 0
    let maxDist = 0
    if (edges.length > 0) {
      const totalDist = edges.reduce((sum, e) => sum + e.distanceKm, 0)
      avgDist = totalDist / edges.length
      maxDist = Math.max(...edges.map((e) => e.distanceKm))
    }

    return {
      totalHubs: hubs.length,
      totalEdges: edges.length,
      totalFlows: flows.length,
      tierData,
      demandBalance,
      coverage,
      avgDist,
      maxDist,
    }
  }, [hubs, edges, networkStatus, counties, flows])

  if (!stats) {
    return (
      <div className={styles.statsContainer}>
        <h3 className={styles.sectionTitle}>Network Stats</h3>
        <div className={styles.emptyMessage}>
          <span className={styles.naText}>N/A</span>
          <p>Generate a network to view statistics.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.statsContainer}>
      <h3 className={styles.sectionTitle}>Network Stats</h3>

      <div className={styles.statsSummary}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatCount(stats.totalHubs)}</div>
          <div className={styles.statLabel}>Hubs</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatCount(stats.totalEdges)}</div>
          <div className={styles.statLabel}>Edges</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatCount(stats.totalFlows)}</div>
          <div className={styles.statLabel}>Flows</div>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <div className={styles.chartTitle}>Hub Count by Tier</div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={stats.tierData} layout="vertical">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="tier" width={65} tick={{ fontSize: 11, fill: '#A0A7B4' }} />
            <Tooltip
              contentStyle={{ background: '#29323C', border: '1px solid #3A4552', borderRadius: 4 }}
              labelStyle={{ color: '#D3D8E0' }}
              itemStyle={{ color: '#D3D8E0' }}
              formatter={(value) => [formatCount(Number(value)), 'Hubs']}
            />
            <Bar dataKey="count" radius={[0, 2, 2, 0]}>
              {stats.tierData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.chartContainer}>
        <div className={styles.chartTitle}>Throughput by Tier</div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={stats.tierData} layout="vertical">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="tier" width={65} tick={{ fontSize: 11, fill: '#A0A7B4' }} />
            <Tooltip
              contentStyle={{ background: '#29323C', border: '1px solid #3A4552', borderRadius: 4 }}
              labelStyle={{ color: '#D3D8E0' }}
              itemStyle={{ color: '#D3D8E0' }}
              formatter={(value) => [formatTonnage(Number(value)), 'Throughput']}
            />
            <Bar dataKey="throughput" radius={[0, 2, 2, 0]}>
              {stats.tierData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={stats.demandBalance < 30 ? styles.metricWarning : styles.metricRow}>
        <div>
          {stats.demandBalance < 30 && <span className={styles.warningIcon}>!</span>}
          <span className={styles.metricLabel}>Demand Balance</span>
        </div>
        <span className={styles.metricValue}>{stats.demandBalance}/100</span>
      </div>
      {stats.demandBalance < 30 && (
        <div className={styles.warningHint}>
          Poor balance detected. Consider adjusting clustering parameters for more even demand distribution.
        </div>
      )}

      <div className={styles.metricRow}>
        <span className={styles.metricLabel}>Coverage</span>
        <span className={styles.metricValue}>
          {stats.coverage >= 0 ? `${stats.coverage}%` : <span className={styles.naText}>N/A</span>}
        </span>
      </div>

      <div className={styles.metricRow}>
        <span className={styles.metricLabel}>Avg Edge Distance</span>
        <span className={styles.metricValue}>{Math.round(stats.avgDist)} km</span>
      </div>

      <div className={styles.metricRow}>
        <span className={styles.metricLabel}>Max Edge Distance</span>
        <span className={styles.metricValue}>{Math.round(stats.maxDist)} km</span>
      </div>
    </div>
  )
}
