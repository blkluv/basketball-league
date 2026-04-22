import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { getPlayer } from '~/lib/api/players'
import { ErrorFallback } from '~/components/ui'
import type { Player } from '~/lib/types/player'
import { formatHeight, formatNumber } from '~/lib/utils'

// Cache for individual player data (5 minutes)
const playerCache = new Map<
  number,
  { data: Player; timestamp: number }
>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function fetchPlayer(playerId: number): Promise<Player> {
  const now = Date.now()
  const cached = playerCache.get(playerId)

  if (cached && now - cached.timestamp < CACHE_TTL) {
    console.log(`Using cached data for player ${playerId}`)
    return cached.data
  }

  console.log(`Fetching fresh data for player ${playerId}`)
  const player = await getPlayer(playerId)

  // Cache the result
  playerCache.set(playerId, { data: player, timestamp: now })

  return player
}

export const Route = createFileRoute('/players/$playerId')({
  loader: async ({ params }) => {
    const player = await fetchPlayer(Number(params.playerId))
    return { player }
  },
  component: PlayerPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
        <div className="w-12 h-12 rounded-full border-4 border-blue-600 dark:border-blue-400 border-t-transparent animate-spin absolute top-0 left-0"></div>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => <ErrorFallback error={error} />,
})

function PlayerPage() {
  const { player } = Route.useLoaderData()

  // Get player photo
  const photoUrl = player._embedded?.['wp:featuredmedia']?.[0]?.source_url

  // Get current season stats (season 239, league 69)
  const currentStats = player.statistics?.[69]?.[239]
  const hasCurrentStats = !!currentStats

  // Calculate career totals across all seasons for league 69
  const careerStats = React.useMemo(() => {
    if (!player.statistics?.[69]) return null

    let totalGames = 0
    let totalPts = 0
    let totalAst = 0
    let totalReb = 0
    let totalStl = 0
    let totalBlk = 0
    let total3pm = 0

    Object.entries(player.statistics[69]).forEach(([seasonId, stats]: [string, any]) => {
      // Skip the header row (key "0") and total row (key "-1")
      if (seasonId === '0' || seasonId === '-1') return

      const g = Number(stats.g) || 0
      if (g === 0) return

      totalGames += g
      totalPts += Number(stats.pts) || 0
      totalAst += Number(stats.ast) || 0
      totalStl += Number(stats.stl) || 0
      totalBlk += Number(stats.blk) || 0
      total3pm += Number(stats.threepm || stats['3pm']) || 0

      // Calculate total rebounds from per-game average
      const rpg = Number(stats.rpg) || 0
      totalReb += Math.round(rpg * g)
    })

    if (totalGames === 0) return null

    return {
      games: totalGames,
      pts: totalPts,
      ast: totalAst,
      reb: totalReb,
      stl: totalStl,
      blk: totalBlk,
      threepm: total3pm,
      ppg: totalPts / totalGames,
      apg: totalAst / totalGames,
      rpg: totalReb / totalGames,
      spg: totalStl / totalGames,
      bpg: totalBlk / totalGames,
    }
  }, [player])

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to="/players"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Leaderboard
        </Link>
      </div>

      {/* Player Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          {/* Player Photo */}
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={player.title.rendered}
              className="w-32 h-32 md:w-40 md:h-40 rounded-lg object-cover border-4 border-gray-200 dark:border-gray-700"
              loading="lazy"
            />
          ) : (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg bg-gray-300 dark:bg-gray-700 flex items-center justify-center border-4 border-gray-200 dark:border-gray-700">
              <span className="text-6xl font-bold text-gray-600 dark:text-gray-400">
                {player.title.rendered.charAt(0)}
              </span>
            </div>
          )}

          {/* Player Info */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {player.title.rendered}
            </h1>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Number
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  #{player.number || '-'}
                </p>
              </div>
              {player.metrics?.height && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Height
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatHeight(player.metrics.height)}
                  </p>
                </div>
              )}
              {currentStats && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Current Team
                  </p>
                  <p
                    className="text-lg font-semibold text-gray-900 dark:text-white"
                    dangerouslySetInnerHTML={{ __html: currentStats.team }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Current Season Stats */}
      {hasCurrentStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            2025/2026 Season Stats
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatCard
              label="Games Played"
              value={currentStats.g}
              abbr="G"
            />
            <StatCard
              label="Total Points"
              value={currentStats.pts}
              abbr="PTS"
              highlight
            />
            <StatCard
              label="Points Per Game"
              value={formatNumber(currentStats.ppg, 1)}
              abbr="PPG"
            />
            <StatCard
              label="Assists"
              value={Math.round(Number(currentStats.apg) * Number(currentStats.g))}
              abbr="AST"
            />
            <StatCard
              label="Assists Per Game"
              value={formatNumber(currentStats.apg, 1)}
              abbr="APG"
            />
            <StatCard
              label="Rebounds Per Game"
              value={formatNumber(currentStats.rpg, 1)}
              abbr="RPG"
            />
            <StatCard
              label="Steals"
              value={currentStats.stl}
              abbr="STL"
            />
            <StatCard
              label="Blocks"
              value={currentStats.blk}
              abbr="BLK"
            />
            <StatCard
              label="3-Pointers Made"
              value={currentStats.threepm || currentStats['3pm'] || 0}
              abbr="3PM"
            />
            <StatCard
              label="Offensive Rebounds"
              value={currentStats.off}
              abbr="OFF"
            />
            <StatCard
              label="Defensive Rebounds"
              value={currentStats.def}
              abbr="DEF"
            />
            <StatCard
              label="Personal Fouls"
              value={currentStats.pf}
              abbr="PF"
            />
          </div>
        </div>
      )}

      {/* Career Stats */}
      {careerStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Career Stats (BBL)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatCard
              label="Total Games"
              value={careerStats.games}
              abbr="G"
            />
            <StatCard
              label="Total Points"
              value={careerStats.pts}
              abbr="PTS"
              highlight
            />
            <StatCard
              label="Career PPG"
              value={formatNumber(careerStats.ppg, 1)}
              abbr="PPG"
            />
            <StatCard
              label="Total Assists"
              value={careerStats.ast}
              abbr="AST"
            />
            <StatCard
              label="Career APG"
              value={formatNumber(careerStats.apg, 1)}
              abbr="APG"
            />
            <StatCard
              label="Total Rebounds"
              value={careerStats.reb}
              abbr="REB"
            />
            <StatCard
              label="Career RPG"
              value={formatNumber(careerStats.rpg, 1)}
              abbr="RPG"
            />
            <StatCard
              label="Total Steals"
              value={careerStats.stl}
              abbr="STL"
            />
            <StatCard
              label="Total Blocks"
              value={careerStats.blk}
              abbr="BLK"
            />
            <StatCard
              label="Total 3PM"
              value={careerStats.threepm}
              abbr="3PM"
            />
          </div>
        </div>
      )}

      {/* Season History */}
      {player.statistics?.[69] && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Season History
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Season
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    G
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    PTS
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    PPG
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    APG
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    RPG
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    3PM
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(player.statistics[69])
                  .filter(([key]) => key !== '0' && key !== '-1')
                  .reverse()
                  .map(([seasonId, stats]: [string, any]) => {
                    const g = Number(stats.g) || 0
                    if (g === 0) return null

                    return (
                      <tr
                        key={seasonId}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {stats.name}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                          {g}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">
                          {stats.pts}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                          {formatNumber(stats.ppg, 1)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                          {formatNumber(stats.apg, 1)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                          {formatNumber(stats.rpg, 1)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                          {stats.threepm || stats['3pm'] || 0}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasCurrentStats && !careerStats && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <p className="text-yellow-800 dark:text-yellow-200">
            No statistics available for this player.
          </p>
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  abbr: string
  highlight?: boolean
}

function StatCard({ label, value, abbr, highlight }: StatCardProps) {
  return (
    <div
      className={`p-4 rounded-lg ${
        highlight
          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800'
          : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
      }`}
    >
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p
          className={`text-2xl font-bold ${
            highlight
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {value}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">{abbr}</p>
      </div>
    </div>
  )
}
