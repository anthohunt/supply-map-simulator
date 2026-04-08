declare module 'skmeans' {
  interface SKMeansResult {
    it: number
    k: number
    idxs: number[]
    centroids: number[][]
  }

  function skmeans(
    data: number[][],
    k: number,
    init?: 'kmpp' | 'kmrand' | number[][] | null,
    maxIterations?: number
  ): SKMeansResult

  export default skmeans
}
