"use client"

import { useCallback, useMemo, useState } from "react"
import useSWR from "swr"
import { Users, Trophy, Clock, Eye, Download, X } from "lucide-react"

const fetcher = (url) => fetch(url).then((r) => r.json())

const buttonBase =
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-3 py-2"
const buttonOutline = `${buttonBase} border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground`

export function GameHistory() {
  const { data, isLoading } = useSWR("/api/game/history", fetcher)
  const [selectedGameId, setSelectedGameId] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState("")
  const [detailData, setDetailData] = useState(null)

  const openGameDetails = useCallback(async (gameId) => {
    setSelectedGameId(gameId)
    setDetailError("")
    setDetailLoading(true)

    try {
      const response = await fetch(`/api/game/history/${gameId}`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load game details")
      }

      setDetailData(payload)
    } catch (error) {
      setDetailData(null)
      setDetailError(error?.message || "Failed to load game details")
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeGameDetails = useCallback(() => {
    setSelectedGameId(null)
    setDetailData(null)
    setDetailError("")
  }, [])

  const handleDownload = useCallback((gameId) => {
    const anchor = document.createElement("a")
    anchor.href = `/api/game/history/${gameId}?download=xlsx`
    anchor.download = ""
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }, [])

  const selectedQuizTitle = useMemo(() => {
    if (!detailData?.game?.quizTitle) return "Game Details"
    return detailData.game.quizTitle
  }, [detailData])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const history = data?.history || []

  if (history.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-foreground">Game History</h2>
        <div className="rounded-xl border bg-card text-card-foreground shadow py-12">
          <div className="p-6 pt-0 flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-muted p-4">
              <Clock className="size-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">No game history</h3>
              <p className="text-sm text-muted-foreground">
                Completed games will appear here
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-foreground">Game History</h2>
      <div className="flex flex-col gap-4">
        {history.map((entry) => (
          <div key={entry.game.id} className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="flex flex-col space-y-1.5 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold leading-none tracking-tight">
                    {entry.quiz?.title || "Unknown Quiz"}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {entry.playerCount} players
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(entry.game.createdAt).toLocaleDateString()}
                    </span>
                  </p>
                </div>
                <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                  PIN: {entry.game.pin}
                </span>
              </div>
            </div>
            {entry.topPlayer && (
              <div className="p-6 pt-0">
                <div className="flex items-center gap-2 text-sm">
                  <Trophy className="size-4 text-game-yellow" />
                  <span className="text-muted-foreground">Winner:</span>
                  <span className="font-medium text-foreground">{entry.topPlayer}</span>
                </div>
              </div>
            )}
            <div className="p-6 pt-0 pb-6 flex items-center gap-2">
              <button
                className={`${buttonOutline} gap-1.5`}
                onClick={() => openGameDetails(entry.game.id)}
              >
                <Eye className="size-4" />
                View
              </button>
              <button
                className={`${buttonOutline} gap-1.5`}
                onClick={() => handleDownload(entry.game.id)}
              >
                <Download className="size-4" />
                Download Excel
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedGameId && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center" onClick={closeGameDetails}>
          <div
            className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold leading-none tracking-tight">{selectedQuizTitle}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Student answers sorted by leaderboard rank
                </p>
              </div>
              <button className={buttonOutline} onClick={closeGameDetails}>
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 overflow-auto max-h-[72vh]">
              {detailLoading && (
                <div className="flex justify-center py-8">
                  <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}

              {!detailLoading && detailError && (
                <p className="text-sm text-destructive">{detailError}</p>
              )}

              {!detailLoading && !detailError && detailData?.rows?.length > 0 && (
                <div className="rounded-lg border overflow-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="text-left px-3 py-2">Rank</th>
                        <th className="text-left px-3 py-2">Name</th>
                        <th className="text-left px-3 py-2">Score</th>
                        <th className="text-left px-3 py-2">Correct</th>
                        {Array.from({ length: detailData.totalQuestions || 0 }, (_, index) => (
                          <th key={`h-${index + 1}`} className="text-left px-3 py-2">Q{index + 1} Answer</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.rows.map((row) => (
                        <tr key={`${row.rank}-${row.name}`} className="border-t align-top">
                          <td className="px-3 py-2 font-semibold">{row.rank}</td>
                          <td className="px-3 py-2 font-medium">{row.name}</td>
                          <td className="px-3 py-2">{row.totalScore}</td>
                          <td className="px-3 py-2">{row.correctCount}/{row.totalQuestions}</td>
                          {row.answers.map((answer) => (
                            <td key={`${row.name}-q-${answer.questionNumber}`} className="px-3 py-2 whitespace-nowrap">
                              {answer.submittedAnswer}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!detailLoading && !detailError && detailData?.rows?.length === 0 && (
                <p className="text-sm text-muted-foreground">No student answers available for this game.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
