import * as React from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { NoData, ErrorFallback } from '~/components/ui'
import { getPlayer } from '~/lib/api/players'
import type { Player } from '~/lib/types/player'

// ------------------------------------------------------------------
// Cache for individual player data (adjust TTL as needed)
// ------------------------------------------------------------------
const playerCache = new Map<number, { data: Player; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes (300,000 ms)

export const Route = createFileRoute('/players/$playerId')({
  loader: async ({ params }) => {
    const playerId = Number(params.playerId)

    // Check cache
    const cached = playerCache.get(playerId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[Cache hit] Player ${playerId}`)
      return { player: cached.data }
    }

    // Fetch fresh
    console.log(`[Cache miss] Fetching player ${playerId}`)
    const player = await getPlayer(playerId)
    if (!player) throw notFound()

    // Store in cache
    playerCache.set(playerId, { data: player, timestamp: Date.now() })
    return { player }
  },
  component: PlayerDetailPage,
  pendingComponent: PlayerDetailLoading,
  errorComponent: ({ error }) => <ErrorFallback error={error} />,
})

// ------------------------------------------------------------------
// Loading skeleton
// ------------------------------------------------------------------
function PlayerDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------
function PlayerDetailPage() {
  const { player } = Route.useLoaderData()

  // Stats for league 69, season 239 (adjust to your actual IDs)
  const stats = player.statistics?.[69]?.[239]

  // Safely extract values – using the actual field names from your PlayerStats type
  const gamesPlayed = stats?.g ?? 0
  const pointsPerGame = stats?.ppg ?? 0
  const assistsPerGame = stats?.apg ?? 0
  const stealsPerGame = stats?.spg ?? 0
  const blocksPerGame = stats?.bpg ?? 0
  const threePointsPerGame = stats?.['3pm'] ?? 0   // note: '3pm' is the field name
  const offensiveRebPerGame = stats?.orpg ?? 0
  const defensiveRebPerGame = stats?.drpg ?? 0

  // Compute totals (if needed)
  const totalPoints = pointsPerGame * gamesPlayed
  const totalAssists = assistsPerGame * gamesPlayed
  const totalSteals = stealsPerGame * gamesPlayed
  const totalBlocks = blocksPerGame * gamesPlayed

  // Team name – you can resolve from player.current_teams if you have team data
  const teamName = 'Team TBD'

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          {player.title?.rendered || 'Unknown Player'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {teamName} • #{player.number || 'N/A'}
        </p>
      </div>

      {/* Per‑game stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Games Played" value={gamesPlayed} />
        <StatCard label="PPG" value={pointsPerGame.toFixed(1)} />
        <StatCard label="APG" value={assistsPerGame.toFixed(1)} />
        <StatCard label="SPG" value={stealsPerGame.toFixed(1)} />
        <StatCard label="BPG" value={blocksPerGame.toFixed(1)} />
        <StatCard label="3PM" value={threePointsPerGame.toFixed(1)} />
        <StatCard label="Off RPG" value={offensiveRebPerGame.toFixed(1)} />
        <StatCard label="Def RPG" value={defensiveRebPerGame.toFixed(1)} />
      </div>

      {/* Season totals */}
      {gamesPlayed > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Season Totals</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Points" value={Math.round(totalPoints)} />
            <StatCard label="Total Assists" value={Math.round(totalAssists)} />
            <StatCard label="Total Steals" value={Math.round(totalSteals)} />
            <StatCard label="Total Blocks" value={Math.round(totalBlocks)} />
          </div>
        </div>
      )}

      {gamesPlayed === 0 && (
        <NoData
          title="No statistics available"
          description="This player hasn't played any games this season."
        />
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Helper component
// ------------------------------------------------------------------
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
      <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  )
}
