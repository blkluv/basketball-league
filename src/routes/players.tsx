import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useDebounce } from '~/lib/hooks'
import { NoData, SearchBar, Select, NoSearchResults, PlayerCardSkeleton, ErrorFallback } from '~/components/ui'
import { PlayerLeaderboard } from '~/components/features/PlayerLeaderboard'
import { getPlayers } from '~/lib/api/players'
import type { Player } from '~/lib/types/player'

// Simple in-memory cache with 5-minute TTL
let cachedPlayers: Player[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Server-side data fetching - fetch all players at build/request time
async function fetchAllPlayers(): Promise<Player[]> {
  // Check cache first
  const now = Date.now()
  if (cachedPlayers && now - cacheTimestamp < CACHE_TTL) {
    console.log('Using cached player data')
    return cachedPlayers
  }

  console.log('Fetching fresh player data from API...')
  const allPlayers: Player[] = []

  // Fetch pages in parallel for better performance
  const pagePromises = [1, 2, 3, 4, 5, 6, 7, 8].map((page) =>
    getPlayers({ per_page: 100, page })
  )

  const results = await Promise.all(pagePromises)

  for (const players of results) {
    if (players && players.length > 0) {
      allPlayers.push(...players)
    }
  }

  // Update cache
  cachedPlayers = allPlayers
  cacheTimestamp = now
  console.log(`Cached ${allPlayers.length} players`)

  return allPlayers
}

export const Route = createFileRoute('/players')({
  loader: async () => {
    const players = await fetchAllPlayers()
    return { players }
  },
  component: PlayersPage,
  pendingComponent: PlayersPageLoading,
  errorComponent: ({ error }) => <ErrorFallback error={error} />,
})

function PlayersPageLoading() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Players
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          2025/2026 Season
        </p>
      </div>

      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <PlayerCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function PlayersPage() {
  // Get pre-fetched data from server-side loader
  const { players: data } = Route.useLoaderData()

  const [searchQuery, setSearchQuery] = React.useState('')
  const [viewMode, setViewMode] = React.useState<'table' | 'cards'>('table')
  const [isMobile, setIsMobile] = React.useState(false)
  const [minGames, setMinGames] = React.useState<number>(0)

  // Debounce search query for better performance
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      // Auto-switch to cards on mobile
      if (window.innerWidth < 768) {
        setViewMode('cards')
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Filter players based on search and minimum games
  const filteredPlayers = React.useMemo(() => {
    if (!data) return []

    return data.filter((player) => {
      // Only include players with stats for current season (239) and league (69)
      const stats = player.statistics?.[69]?.[239]
      if (!stats) return false

      // Must have played at least 1 game
      const gamesPlayed = Number(stats.g) || 0
      if (gamesPlayed === 0) return false

      // Search filter
      if (debouncedSearch) {
        const playerName = player.title?.rendered?.toLowerCase() || ''
        if (!playerName.includes(debouncedSearch.toLowerCase())) {
          return false
        }
      }

      // Minimum games filter
      if (minGames > 0) {
        if (gamesPlayed < minGames) {
          return false
        }
      }

      return true
    })
  }, [data, debouncedSearch, minGames])

  const minGamesOptions = [
    { value: 0, label: 'All Players' },
    { value: 1, label: '1+ Games' },
    { value: 3, label: '3+ Games' },
    { value: 5, label: '5+ Games' },
  ]

  return (
    <div>
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Player Leaderboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Current Season Statistics
        </p>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 mb-4">
          {/* Search Bar */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search players..."
            className="w-full"
          />

          {/* Filters and View Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Min Games Filter */}
            <Select
              options={minGamesOptions}
              value={minGames}
              onChange={(value) => setMinGames(Number(value))}
              label="Minimum Games"
              className="w-full sm:w-auto"
            />

            {/* View Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`touch-target px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                aria-label="Table view"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`touch-target px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                aria-label="Card view"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* No Results from Search */}
      {data &&
        data.length > 0 &&
        filteredPlayers.length === 0 &&
        searchQuery && <NoSearchResults searchTerm={searchQuery} />}

      {/* Empty State */}
      {(!data || data.length === 0) && (
        <NoData
          title="No players available"
          description="Player data will be available once the season starts."
        />
      )}

      {/* Player Leaderboard */}
      {filteredPlayers.length > 0 && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              Showing {filteredPlayers.length} players
              {data && ` (from ${data.length} total)`}
            </p>
          </div>

          {/* Leaderboard Table/Cards */}
          <PlayerLeaderboard
            players={filteredPlayers}
            showMobileView={viewMode === 'cards'}
          />

          {/* Legend */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Legend
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <strong>PTS:</strong> Total Points
              </div>
              <div>
                <strong>AST:</strong> Total Assists
              </div>
              <div>
                <strong>STL:</strong> Total Steals
              </div>
              <div>
                <strong>BLK:</strong> Total Blocks
              </div>
              <div>
                <strong>3PM:</strong> 3-Pointers Made
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
