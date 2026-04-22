import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { getTables } from '~/lib/api/tables'
import { formatPercentage, parseStandingsTable } from '~/lib/utils'
import { StreakBadge } from '~/components/features/FormIndicator'
import { ErrorFallback, StandingsTableSkeleton } from '~/components/ui'

// Simple in-memory cache with 5-minute TTL
let cachedStandings: any[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function fetchStandingsData() {
  const now = Date.now()
  if (cachedStandings && now - cacheTimestamp < CACHE_TTL) {
    console.log('Using cached standings data')
    return cachedStandings
  }

  console.log('Fetching fresh standings data from API...')
  const tables = await getTables()

  if (tables && tables.length > 0) {
    const parsedStandings = parseStandingsTable(tables[0])
    cachedStandings = parsedStandings
    cacheTimestamp = now
    console.log(`Cached ${parsedStandings.length} teams in standings`)
    return parsedStandings
  }

  return []
}

export const Route = createFileRoute('/')({
  loader: async () => {
    const standings = await fetchStandingsData()
    return { standings }
  },
  component: Home,
  pendingComponent: HomeLoading,
  errorComponent: ({ error }) => <ErrorFallback error={error} />,
})

function HomeLoading() {
  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
          Business Basketball League
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          The premier basketball league showcasing the best talent in business
          basketball
        </p>
      </div>
      <StandingsTableSkeleton rows={5} />
    </div>
  )
}

function Home() {
  const { standings } = Route.useLoaderData()
  const standingsPreview = React.useMemo(
    () => standings.slice(0, 5),
    [standings],
  )

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
          Business Basketball League
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          The premier basketball league showcasing the best talent in business
          basketball
        </p>
      </div>

      {/* Standings Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Current Standings
          </h2>
          <Link
            to="/standings"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm"
          >
            View Full Standings →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Team
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  W
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  L
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  PCT
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                  Streak
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {standingsPreview.map((team) => (
                <tr
                  key={team.pos}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">
                    {team.pos}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                    {team.team}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                    {team.w}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                    {team.l}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">
                    {formatPercentage(team.pct, 3)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm hidden md:table-cell">
                    {team.streak && <StreakBadge streak={team.streak} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/standings"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            League Standings
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            View current standings, team records, and playoff positions
          </p>
          <span className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            View Standings →
          </span>
        </Link>

        <Link
          to="/players"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Player Stats
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Explore player statistics, leaderboards, and performance metrics
          </p>
          <span className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            View Players →
          </span>
        </Link>

        <Link
          to="/schedule"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Match Schedule
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Check upcoming matches, results, and game schedules
          </p>
          <span className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            View Schedule →
          </span>
        </Link>
      </div>
    </div>
  )
}
