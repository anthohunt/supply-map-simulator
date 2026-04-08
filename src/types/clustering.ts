export interface ClusteringParams {
  targetRegions: number
  demandBalanceWeight: number // 0-1
  contiguityWeight: number // 0-1
  compactnessWeight: number // 0-1
  maxIterations: number
}
