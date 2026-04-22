import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { LeagueTable } from "~/components/features/LeagueTable";
import { APIError, NoData, StandingsTableSkeleton } from "~/components/ui";
import { useStandings } from "~/lib/hooks";
import { parseStandingsTable } from "~/lib/utils";

export const Route = createFileRoute("/standings")({
  component: StandingsPage,
});

function StandingsPage() {
  const [viewMode, setViewMode] = React.useState<"table" | "cards">("table");
  const [isMobile, setIsMobile] = React.useState(false);

  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto-switch to cards on mobile
      if (window.innerWidth < 768) {
        setViewMode("cards");
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch latest season standings (no season parameter = latest)
  const { data, isLoading, error, refetch } = useStandings();

  // Parse API data (don't use mock data, show empty state if no data)
  const standingsData = React.useMemo(() => {
    if (data && data.length > 0) {
      // Parse real API data
      return parseStandingsTable(data[0]);
    }
    // Return empty array if no data - will show appropriate empty state
    return [];
  }, [data]);

  // Get current season name from API data
  const currentSeasonName = React.useMemo(() => {
    if (data && data.length > 0 && data[0].title?.rendered) {
      return data[0].title.rendered;
    }
    return "Current Season";
  }, [data]);

  return (
    <div>
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          League Standings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {currentSeasonName}
        </p>

        {/* Controls */}
        <div className="flex justify-end">
          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("table")}
              className={`touch-target px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
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
              onClick={() => setViewMode("cards")}
              className={`touch-target px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === "cards"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
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

      {/* Loading State */}
      {isLoading && <StandingsTableSkeleton />}

      {/* Error State */}
      {error && <APIError error={error as Error} onRetry={() => refetch()} />}

      {/* Empty State */}
      {!isLoading && !error && standingsData.length === 0 && (
        <NoData
          title="No standings available"
          description="League standings will be available once the season starts."
        />
      )}

      {/* Standings Table */}
      {!isLoading && !error && standingsData.length > 0 && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Live Data:</strong> Showing real standings from BBL API.
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>

          {/* Table/Cards */}
          <LeagueTable
            standings={standingsData}
            showMobileView={viewMode === "cards"}
          />

          {/* Legend */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Legend
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <strong>W:</strong> Wins
              </div>
              <div>
                <strong>L:</strong> Losses
              </div>
              <div>
                <strong>PCT:</strong> Win Percentage
              </div>
              <div>
                <strong>GB:</strong> Games Behind
              </div>
              <div>
                <strong>PF:</strong> Points For
              </div>
              <div>
                <strong>PA:</strong> Points Against
              </div>
              <div>
                <strong>DIFF:</strong> Point Differential
              </div>
              <div>
                <strong>Form:</strong> Last 5 Games
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
