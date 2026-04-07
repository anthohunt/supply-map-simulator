export interface FreightFlow {
  id: string
  originHubId: string
  destinationHubId: string
  commodity: string
  volumeTons: number
  routeHubIds: string[] // ordered hub sequence
}

export interface FAFRecord {
  originFips: string
  destFips: string
  commodity: string
  annualTons: number
  mode: string
}
