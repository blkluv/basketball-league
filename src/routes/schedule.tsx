import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { getEvents } from '~/lib/api/events'
import { getTeams } from '~/lib/api/teams'
import type { Match } from '~/lib/types/match'
import type { Team } from '~/lib/types/team'
import { formatDate, formatTime } from '~/lib/utils'
import { NoData, Select, MatchCardSkeleton, ErrorFallback } from '~/components/ui'

// Simple in-memory cache with 5-minute TTL
let cachedMatches: Match[] | null = null
let cachedTeams: Team[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function fetchScheduleData(): Promise<{
  matches: Match[]
  teams: Team[]
}> {
  const now = Date.now()
  if (cachedMatches && cachedTeams && now - cacheTimestamp < CACHE_TTL) {
    console.log('Using cached schedule data')
    return { matches: cachedMatches, teams: cachedTeams }
  }

  console.log('Fetching fresh schedule data from API...')

  const [matches, teams] = await Promise.all([
    getEvents({ league: 69, season: 239, per_page: 100 }),
    getTeams({ league: 69, season: 239, per_page: 100, _embed: true }),
  ])

  cachedMatches = matches
  cachedTeams = teams
  cacheTimestamp = now
  console.log(`Cached ${matches.length} matches and ${teams.length} teams`)

  return { matches, teams }
}

export const Route = createFileRoute('/schedule')({
  loader: async () => {
    const data = await fetchScheduleData()
    return data
  },
  component: SchedulePage,
  pendingComponent: SchedulePageLoading,
  errorComponent: ({ error }) => <ErrorFallback error={error} />,
})

function SchedulePageLoading() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Schedule
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          2025/2026 Season
        </p>
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function SchedulePage() {
  const { matches: allMatches, teams: allTeams } = Route.useLoaderData()

  const [filterTeam, setFilterTeam] = React.useState<number>(0)
  const [filterStatus, setFilterStatus] = React.useState<string>('all')

  // Create team lookup map
  const teamMap = React.useMemo(() => {
    const map = new Map<number, Team>()
    allTeams.forEach((team) => map.set(team.id, team))
    return map
  }, [allTeams])

  // Filter and sort matches
  const filteredMatches = React.useMemo(() => {
    let filtered = [...allMatches]

    // Filter by team
    if (filterTeam > 0) {
      filtered = filtered.filter(
        (match) => match.teams && match.teams.includes(filterTeam)
      )
    }

    // Filter by status
    if (filterStatus === 'upcoming') {
      filtered = filtered.filter((match) => match.status === 'future')
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter((match) => match.status === 'publish')
    }

    // Sort by date (upcoming first for future, recent first for completed)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()

      if (filterStatus === 'completed') {
        return dateB - dateA // Most recent first
      }
      return dateA - dateB // Soonest first
    })

    return filtered
  }, [allMatches, filterTeam, filterStatus])

  // Split into upcoming and completed
  const upcomingMatches = filteredMatches.filter(
    (match) => match.status === 'future'
  )
  const completedMatches = filteredMatches.filter(
    (match) => match.status === 'publish'
  )

  const teamOptions = [
    { value: 0, label: 'All Teams' },
    ...allTeams.map((team) => ({
      value: team.id,
      label: team.title.rendered,
    })),
  ]

  const statusOptions = [
    { value: 'all', label: 'All Matches' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'completed', label: 'Completed' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Schedule
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          2025/2026 Season
        </p>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select
            options={statusOptions}
            value={filterStatus}
            onChange={(value) => setFilterStatus(String(value))}
            label="Filter by Status"
            className="w-full sm:w-auto"
          />
          <Select
            options={teamOptions}
            value={filterTeam}
            onChange={(value) => setFilterTeam(Number(value))}
            label="Filter by Team"
            className="w-full sm:w-auto"
          />
        </div>
      </div>

      {filteredMatches.length === 0 && (
        <NoData
          title="No matches found"
          description="Try adjusting your filters"
        />
      )}

      {/* Upcoming Matches */}
      {(filterStatus === 'all' || filterStatus === 'upcoming') &&
        upcomingMatches.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Upcoming Matches ({upcomingMatches.length})
            </h2>
            <div className="space-y-3">
              {upcomingMatches.map((match) => (
                <MatchCard key={match.id} match={match} teamMap={teamMap} />
              ))}
            </div>
          </div>
        )}

      {/* Completed Matches */}
      {(filterStatus === 'all' || filterStatus === 'completed') &&
        completedMatches.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Completed Matches ({completedMatches.length})
            </h2>
            <div className="space-y-3">
              {completedMatches.map((match) => (
                <MatchCard key={match.id} match={match} teamMap={teamMap} />
              ))}
            </div>
          </div>
        )}
    </div>
  )
}

interface MatchCardProps {
  match: Match
  teamMap: Map<number, Team>
}

function MatchCard({ match, teamMap }: MatchCardProps) {
  const homeTeam = match.teams?.[0] ? teamMap.get(match.teams[0]) : null
  const awayTeam = match.teams?.[1] ? teamMap.get(match.teams[1]) : null

  const matchDate = new Date(match.date)
  const isUpcoming = match.status === 'future'

  // Get scores if available
  const homeScore = match.results?.[match.teams?.[0]]?.points || '-'
  const awayScore = match.results?.[match.teams?.[1]]?.points || '-'

  return (
    <Link
      to="/matches/$matchId"
      params={{ matchId: String(match.id) }}
      className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Date & Time */}
        <div className="flex-shrink-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDate(match.date)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            {formatTime(match.date)}
          </div>
        </div>

        {/* Teams */}
        <div className="flex-1 flex items-center justify-center gap-6">
          {/* Home Team */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            {homeTeam?._embedded?.['wp:featuredmedia']?.[0]?.source_url ? (
              <img
                src={homeTeam._embedded['wp:featuredmedia'][0].source_url}
                alt={homeTeam.title.rendered}
                className="w-10 h-10 object-contain"
                loading="lazy"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-gray-300 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-gray-600 dark:text-gray-400">
                  {homeTeam?.title.rendered.charAt(0) || '?'}
                </span>
              </div>
            )}
            <div className="font-semibold text-gray-900 dark:text-white">
              {homeTeam?.title.rendered || 'TBD'}
            </div>
          </div>

          {/* Score or VS */}
          <div className="flex items-center justify-center min-w-[80px] flex-shrink-0">
            {isUpcoming ? (
              <span className="text-sm text-gray-500 dark:text-gray-500 font-medium">
                VS
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {homeScore}
                </span>
                <span className="text-gray-500 dark:text-gray-500">-</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {awayScore}
                </span>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-3 flex-1">
            <div className="font-semibold text-gray-900 dark:text-white">
              {awayTeam?.title.rendered || 'TBD'}
            </div>
            {awayTeam?._embedded?.['wp:featuredmedia']?.[0]?.source_url ? (
              <img
                src={awayTeam._embedded['wp:featuredmedia'][0].source_url}
                alt={awayTeam.title.rendered}
                className="w-10 h-10 object-contain"
                loading="lazy"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-gray-300 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-gray-600 dark:text-gray-400">
                  {awayTeam?.title.rendered.charAt(0) || '?'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          {isUpcoming ? (
            <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
              Upcoming
            </span>
          ) : (
            <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
              Final
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
