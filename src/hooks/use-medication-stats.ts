import { useMedicationStats as useMedicationStatsQuery } from '#/lib/api/hooks'

export function useMedicationStats() {
    return useMedicationStatsQuery()
}