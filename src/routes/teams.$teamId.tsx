import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { getTeam } from '~/lib/api/teams'
import { ErrorFallback } from '~/components/ui'
import { getPlayers } from '~/lib/api/players'
import type { Team } from '~/lib/types/team'
import type { Player } from '~/lib/types/player'

// Cache for team data (5 minutes)
const teamCache = new Map<number, { data: Team; timestamp: number }>()
const rosterCache = new Map<number, { data: Player[]; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function fetchTeam(teamId: number): Promise<Team> {
  const now = Date.now()
  const cached = teamCache.get(teamId)

  if (cached && now - cached.timestamp < CACHE_TTL) {
    console.log(`Using cached data for team ${teamId}`)
    return cached.data
  }

  console.log(`Fetching fresh data for team ${teamId}`)
  const team = await getTeam(teamId)

  teamCache.set(teamId, { data: team, timestamp: now })

  return team
}

async function fetchTeamRoster(teamId: number): Promise<Player[]> {
  const now = Date.now()
  const cached = rosterCache.get(teamId)

  if (cached && now - cached.timestamp < CACHE_TTL) {
    console.log(`Using cached roster for team ${teamId}`)
    return cached.data
  }

  console.log(`Fetching fresh roster for team ${teamId}`)
  const players = await getPlayers({ team: teamId, per_page: 100 })

  // Filter for players with stats in current season (239) and league (69)
  const activePlayers = players.filter((player) => {
    const stats = player.statistics?.[69]?.[239]
    return stats && Number(stats.g) > 0
  })

  rosterCache.set(teamId, { data: activePlayers, timestamp: now })

  return activePlayers
}

export const Route = createFileRoute('/teams/$teamId')({
  loader: async ({ params }) => {
    const teamId = Number(params.teamId)
    const [team, roster] = await Promise.all([
      fetchTeam(teamId),
      fetchTeamRoster(teamId),
    ])
    return { team, roster }
  },
  component: TeamPage,
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

function TeamPage() {
  const { team, roster } = Route.useLoaderData()

  // Get team logo
  const logoUrl = team._embedded?.['wp:featuredmedia']?.[0]?.source_url

  // Strip HTML tags from content for display
  const description = React.useMemo(() => {
    const div = document.createElement('div')
    div.innerHTML = team.content?.rendered || ''
    return div.textContent || div.innerText || ''
  }, [team.content])

  // Calculate team stats from roster
  const teamStats = React.useMemo(() => {
    if (roster.length === 0) return null

    let totalPts = 0
    let totalAst = 0
    let totalReb = 0
    let totalGames = 0

    roster.forEach((player) => {
      const stats = player.statistics?.[69]?.[239]
      if (!stats) return

      const g = Number(stats.g) || 0
      totalPts += Number(stats.pts) || 0
      totalAst += Math.round((Number(stats.apg) || 0) * g)
      totalReb += Math.round((Number(stats.rpg) || 0) * g)
      totalGames += g
    })

    return {
      totalPoints: totalPts,
      totalAssists: totalAst,
      totalRebounds: totalReb,
      avgPointsPerGame: totalGames > 0 ? totalPts / totalGames : 0,
      playerCount: roster.length,
    }
  }, [roster])

  // Sort players by total points
  const sortedRoster = React.useMemo(() => {
    return [...roster].sort((a, b) => {
      const aPts = Number(a.statistics?.[69]?.[239]?.pts) || 0
      const bPts = Number(b.statistics?.[69]?.[239]?.pts) || 0
      return bPts - aPts
    })
  }, [roster])

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

      {/* Team Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          {/* Team Logo */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={team.title.rendered}
              className="w-32 h-32 md:w-40 md:h-40 rounded-lg object-contain border-4 border-gray-200 dark:border-gray-700 bg-white p-2"
              loading="lazy"
            />
          ) : (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg bg-gray-300 dark:bg-gray-700 flex items-center justify-center border-4 border-gray-200 dark:border-gray-700">
              <span className="text-6xl font-bold text-gray-600 dark:text-gray-400">
                {team.title.rendered.charAt(0)}
              </span>
            </div>
          )}

          {/* Team Info */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {team.title.rendered}
            </h1>
            {description && (
              <p className="text-gray-600 dark:text-gray-400 mt-4 line-clamp-3">
                {description}
              </p>
            )}
            {team.url && (
              <a
                href={team.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline"
              >
                Visit Website →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Team Stats */}
      {teamStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            2025/2026 Team Stats
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Players"
              value={teamStats.playerCount}
              highlight
            />
            <StatCard label="Total Points" value={teamStats.totalPoints} />
            <StatCard label="Total Assists" value={teamStats.totalAssists} />
            <StatCard label="Total Rebounds" value={teamStats.totalRebounds} />
          </div>
        </div>
      )}

      {/* Roster */}
      {sortedRoster.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Roster
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedRoster.map((player) => {
              const stats = player.statistics?.[69]?.[239]
              const photoUrl =
                player._embedded?.['wp:featuredmedia']?.[0]?.media_details
                  ?.sizes?.thumbnail?.source_url ||
                player._embedded?.['wp:featuredmedia']?.[0]?.source_url

              return (
                <Link
                  key={player.id}
                  to="/players/$playerId"
                  params={{ playerId: String(player.id) }}
                  className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={player.title.rendered}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                      <span className="text-xl font-bold text-gray-600 dark:text-gray-400">
                        {player.title.rendered.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {player.title.rendered}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      #{player.number || '-'}
                    </p>
                    {stats && (
                      <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-500">
                        <span>{stats.pts} PTS</span>
                        <span>{Math.round(Number(stats.apg) * Number(stats.g))} AST</span>
                        <span>{stats.g} G</span>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <p className="text-yellow-800 dark:text-yellow-200">
            No active players for this team in the current season.
          </p>
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  highlight?: boolean
}

function StatCard({ label, value, highlight }: StatCardProps) {
  return (
    <div
      className={`p-4 rounded-lg ${
        highlight
          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800'
          : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
      }`}
    >
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      <p
        className={`text-2xl font-bold ${
          highlight
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-gray-900 dark:text-white'
        }`}
      >
        {typeof value === 'number' ? Math.round(value) : value}
      </p>
    </div>
  )
}
