import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { getEvent } from '~/lib/api/events'
import { getTeam } from '~/lib/api/teams'
import type { Match } from '~/lib/types/match'
import type { Team } from '~/lib/types/team'
import { formatDate, formatTime } from '~/lib/utils'
import { ErrorFallback } from '~/components/ui'

// Simple in-memory cache with 5-minute TTL
const matchCache = new Map<
  number,
  { data: Match; timestamp: number }
>()
const teamCache = new Map<
  number,
  { data: Team; timestamp: number }
>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function fetchMatch(matchId: number): Promise<Match> {
  const now = Date.now()
  const cached = matchCache.get(matchId)

  if (cached && now - cached.timestamp < CACHE_TTL) {
    console.log('Using cached match data')
    return cached.data
  }

  console.log('Fetching fresh match data from API...')
  const match = await getEvent(matchId)

  matchCache.set(matchId, { data: match, timestamp: now })
  return match
}

async function fetchTeam(teamId: number): Promise<Team> {
  const now = Date.now()
  const cached = teamCache.get(teamId)

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const team = await getTeam(teamId)
  teamCache.set(teamId, { data: team, timestamp: now })
  return team
}

export const Route = createFileRoute('/matches/$matchId')({
  loader: async ({ params }) => {
    const matchId = Number(params.matchId)
    const match = await fetchMatch(matchId)

    // Fetch team details for logos and names
    const teamPromises = (match.teams || []).map((teamId) => fetchTeam(teamId))
    const teams = await Promise.all(teamPromises)

    return { match, teams }
  },
  component: MatchDetailPage,
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

function MatchDetailPage() {
  const { match, teams } = Route.useLoaderData()

  const homeTeam = teams[0]
  const awayTeam = teams[1]

  const isCompleted = match.status === 'publish'
  const isUpcoming = match.status === 'future'

  // Get scores
  const homeScore = match.results?.[homeTeam?.id]?.points
  const awayScore = match.results?.[awayTeam?.id]?.points

  // Get quarter scores if available
  const homeQuarters = match.results?.[homeTeam?.id]
  const awayQuarters = match.results?.[awayTeam?.id]

  const quarters = ['one', 'two', 'three', 'four', 'ot'] as const

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/schedule"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-4"
        >
          ← Back to Schedule
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {match.title?.rendered || 'Match Details'}
          </h1>
          {isCompleted && (
            <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
              Final
            </span>
          )}
          {isUpcoming && (
            <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
              Upcoming
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
          <span>{formatDate(match.date)}</span>
          <span>•</span>
          <span>{formatTime(match.date)}</span>
          {match.venue && (
            <>
              <span>•</span>
              <span>{match.venue}</span>
            </>
          )}
        </div>
      </div>

      {/* Match Score Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-[1fr,auto,1fr] gap-8 items-center">
          {/* Home Team */}
          <div className="flex flex-col items-center text-center">
            {homeTeam?._embedded?.['wp:featuredmedia']?.[0]?.source_url ? (
              <img
                src={homeTeam._embedded['wp:featuredmedia'][0].source_url}
                alt={homeTeam.title.rendered}
                className="w-24 h-24 md:w-32 md:h-32 object-contain mb-4"
                loading="lazy"
              />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg bg-gray-300 dark:bg-gray-700 flex items-center justify-center mb-4">
                <span className="text-4xl font-bold text-gray-600 dark:text-gray-400">
                  {homeTeam?.title.rendered.charAt(0) || '?'}
                </span>
              </div>
            )}
            <Link
              to="/teams/$teamId"
              params={{ teamId: String(homeTeam?.id) }}
              className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {homeTeam?.title.rendered || 'TBD'}
            </Link>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center">
            {isCompleted ? (
              <div className="flex items-center gap-4">
                <span className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white">
                  {homeScore || '0'}
                </span>
                <span className="text-2xl text-gray-500 dark:text-gray-500">-</span>
                <span className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white">
                  {awayScore || '0'}
                </span>
              </div>
            ) : (
              <span className="text-2xl text-gray-500 dark:text-gray-500 font-medium">
                VS
              </span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center text-center">
            {awayTeam?._embedded?.['wp:featuredmedia']?.[0]?.source_url ? (
              <img
                src={awayTeam._embedded['wp:featuredmedia'][0].source_url}
                alt={awayTeam.title.rendered}
                className="w-24 h-24 md:w-32 md:h-32 object-contain mb-4"
                loading="lazy"
              />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg bg-gray-300 dark:bg-gray-700 flex items-center justify-center mb-4">
                <span className="text-4xl font-bold text-gray-600 dark:text-gray-400">
                  {awayTeam?.title.rendered.charAt(0) || '?'}
                </span>
              </div>
            )}
            <Link
              to="/teams/$teamId"
              params={{ teamId: String(awayTeam?.id) }}
              className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {awayTeam?.title.rendered || 'TBD'}
            </Link>
          </div>
        </div>
      </div>

      {/* Quarter-by-Quarter Scores */}
      {isCompleted && homeQuarters && awayQuarters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Quarter Scores
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Team
                  </th>
                  {quarters.map((quarter) => {
                    const hasQuarter =
                      homeQuarters[quarter] !== undefined ||
                      awayQuarters[quarter] !== undefined
                    if (!hasQuarter) return null

                    const label =
                      quarter === 'ot'
                        ? 'OT'
                        : `Q${quarters.indexOf(quarter) + 1}`

                    return (
                      <th
                        key={quarter}
                        className="text-center py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {label}
                      </th>
                    )
                  })}
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Home Team */}
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-4">
                    <Link
                      to="/teams/$teamId"
                      params={{ teamId: String(homeTeam?.id) }}
                      className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {homeTeam?.title.rendered}
                    </Link>
                  </td>
                  {quarters.map((quarter) => {
                    const hasQuarter =
                      homeQuarters[quarter] !== undefined ||
                      awayQuarters[quarter] !== undefined
                    if (!hasQuarter) return null

                    return (
                      <td
                        key={quarter}
                        className="text-center py-3 px-4 text-gray-900 dark:text-white"
                      >
                        {homeQuarters[quarter] || '0'}
                      </td>
                    )
                  })}
                  <td className="text-center py-3 px-4 font-bold text-gray-900 dark:text-white">
                    {homeScore || '0'}
                  </td>
                </tr>

                {/* Away Team */}
                <tr>
                  <td className="py-3 px-4">
                    <Link
                      to="/teams/$teamId"
                      params={{ teamId: String(awayTeam?.id) }}
                      className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {awayTeam?.title.rendered}
                    </Link>
                  </td>
                  {quarters.map((quarter) => {
                    const hasQuarter =
                      homeQuarters[quarter] !== undefined ||
                      awayQuarters[quarter] !== undefined
                    if (!hasQuarter) return null

                    return (
                      <td
                        key={quarter}
                        className="text-center py-3 px-4 text-gray-900 dark:text-white"
                      >
                        {awayQuarters[quarter] || '0'}
                      </td>
                    )
                  })}
                  <td className="text-center py-3 px-4 font-bold text-gray-900 dark:text-white">
                    {awayScore || '0'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
