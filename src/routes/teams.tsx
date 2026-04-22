import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { getTeams } from '~/lib/api/teams'
import type { Team } from '~/lib/types/team'
import { NoData, CardSkeleton, ErrorFallback } from '~/components/ui'

// Simple in-memory cache with 5-minute TTL
let cachedTeams: Team[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Server-side data fetching
async function fetchAllTeams(): Promise<Team[]> {
  // Check cache first
  const now = Date.now()
  if (cachedTeams && now - cacheTimestamp < CACHE_TTL) {
    console.log('Using cached teams data')
    return cachedTeams
  }

  console.log('Fetching fresh teams data from API...')

  // Fetch teams with embedded media for logos
  const teams = await getTeams({ per_page: 100, _embed: true })

  // Update cache
  cachedTeams = teams
  cacheTimestamp = now
  console.log(`Cached ${teams.length} teams`)

  return teams
}

export const Route = createFileRoute('/teams')({
  loader: async () => {
    const teams = await fetchAllTeams()
    return { teams }
  },
  component: TeamsPage,
  pendingComponent: TeamsPageLoading,
  errorComponent: ({ error }) => <ErrorFallback error={error} />,
})

function TeamsPageLoading() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Teams
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          2025/2026 Season
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function TeamsPage() {
  const { teams: data } = Route.useLoaderData()

  // Filter for teams in current league (69) and season (239)
  const currentTeams = React.useMemo(() => {
    return data.filter(
      (team) =>
        team.leagues.includes(69) && team.seasons.includes(239)
    )
  }, [data])

  return (
    <div>
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Teams
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          2025/2026 Season
        </p>
      </div>

      {/* Empty State */}
      {currentTeams.length === 0 && (
        <NoData
          title="No teams available"
          description="Team data will be available once the season starts."
        />
      )}

      {/* Teams Grid */}
      {currentTeams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentTeams.map((team) => {
            const logoUrl =
              team._embedded?.['wp:featuredmedia']?.[0]?.source_url

            return (
              <Link
                key={team.id}
                to="/teams/$teamId"
                params={{ teamId: String(team.id) }}
                className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 p-6 transition-all hover:shadow-lg"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Team Logo */}
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={team.title.rendered}
                      className="w-32 h-32 object-contain mb-4"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-gray-300 dark:bg-gray-700 flex items-center justify-center mb-4">
                      <span className="text-5xl font-bold text-gray-600 dark:text-gray-400">
                        {team.title.rendered.charAt(0)}
                      </span>
                    </div>
                  )}

                  {/* Team Name */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {team.title.rendered}
                  </h3>

                  {/* Abbreviation */}
                  {team.abbreviation && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                      {team.abbreviation}
                    </p>
                  )}

                  {/* View Team Button */}
                  <span className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium">
                    View Team →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
