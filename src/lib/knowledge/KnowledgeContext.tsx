"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

interface AnalysisStats {
  model: string
  requests: number
  type: string
}

interface LogEntry {
  time: string
  msg: string
  type: "log" | "progress" | "error" | "done"
}

interface KnowledgeContextType {
  isTraining: boolean
  isDone: boolean
  isMinimized: boolean
  trainingFile: string | null
  foundCount: number
  progressPercent: number
  logs: LogEntry[]
  analysisStats: AnalysisStats | null
  sessionResults: Record<string, unknown> | null
  selectedModelId: string | null
  isApproved: boolean
  tempApiKey: string
  isValidatingKey: boolean
  validationResult: {
    success?: boolean
    recommended?: string
    availableModels?: Array<string | { id: string }>
    message?: string
  } | null
  setSelectedModelId: (val: string | null) => void
  setIsApproved: (val: boolean) => void
  setTempApiKey: (val: string) => void
  setValidationResult: (
    val: KnowledgeContextType["validationResult"]
  ) => void
  setIsValidatingKey: (val: boolean) => void
  setSessionResults: (val: Record<string, unknown> | null) => void
  setIsMinimized: (val: boolean) => void
  setTrainingFile: (file: string | null) => void
  startTraining: (
    filename: string,
    apiKey?: string,
    modelId?: string,
    availableModels?: Array<string | { id: string }>
  ) => void
  stopTraining: () => void
  resetState: () => void
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(
  undefined
)

export function KnowledgeProvider({ children }: { children: React.ReactNode }) {
  const [isTraining, setIsTraining] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [trainingFile, setTrainingFile] = useState<string | null>(null)
  const [foundCount, setFoundCount] = useState(0)
  const [progressPercent, setProgressPercent] = useState(0)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [analysisStats, setAnalysisStats] = useState<AnalysisStats | null>(null)
  const [sessionResults, setSessionResults] =
    useState<Record<string, unknown> | null>(null)
  const [tempApiKey, setTempApiKey] = useState("")
  const [isValidatingKey, setIsValidatingKey] = useState(false)
  const [validationResult, setValidationResult] =
    useState<KnowledgeContextType["validationResult"]>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [isApproved, setIsApproved] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem("celtronics_ai_training")
    if (!saved) return

    try {
      const parsed = JSON.parse(saved)
      setIsDone(Boolean(parsed.isDone))
      setTrainingFile(parsed.trainingFile || null)
      setFoundCount(Number(parsed.foundCount || 0))
      setProgressPercent(Number(parsed.progressPercent || 0))
      setLogs(Array.isArray(parsed.logs) ? parsed.logs : [])
      setAnalysisStats(parsed.analysisStats || null)
      setValidationResult(parsed.validationResult || null)
      setIsMinimized(Boolean(parsed.isMinimized))
      // API keys are intentionally never restored from browser storage.
    } catch {
      sessionStorage.removeItem("celtronics_ai_training")
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem(
      "celtronics_ai_training",
      JSON.stringify({
        isDone,
        trainingFile,
        foundCount,
        progressPercent,
        logs,
        analysisStats,
        validationResult,
        isMinimized,
      })
    )
  }, [
    isDone,
    trainingFile,
    foundCount,
    progressPercent,
    logs,
    analysisStats,
    validationResult,
    isMinimized,
  ])

  const stopTraining = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setLogs((previous) => [
      ...previous.slice(-100),
      {
        time: new Date().toLocaleTimeString("pl-PL"),
        msg: "Przerwano operację przez użytkownika.",
        type: "error",
      },
    ])
    setIsTraining(false)
    setIsDone(false)
    setIsMinimized(false)
    setProgressPercent(0)
  }, [])

  const resetState = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsTraining(false)
    setIsDone(false)
    setIsMinimized(false)
    setTrainingFile(null)
    setFoundCount(0)
    setProgressPercent(0)
    setLogs([])
    setAnalysisStats(null)
    setSessionResults(null)
    setValidationResult(null)
    setSelectedModelId(null)
    setTempApiKey("")
    sessionStorage.removeItem("celtronics_ai_training")
  }, [])

  const startTraining = useCallback(
    (
      filename: string,
      apiKey = "",
      modelId = "internal-v9",
      availableModels: Array<string | { id: string }> = []
    ) => {
      if (abortControllerRef.current) return

      const controller = new AbortController()
      abortControllerRef.current = controller

      setIsTraining(true)
      setIsDone(false)
      setIsMinimized(false)
      setTrainingFile(filename)
      setLogs([
        {
          time: new Date().toLocaleTimeString("pl-PL"),
          msg: "Inicjalizacja analizy…",
          type: "log",
        },
      ])
      setProgressPercent(0)
      setFoundCount(0)
      setAnalysisStats(null)
      setSessionResults(null)

      void (async () => {
        try {
          const response = await fetch("/api/knowledge/train/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename,
              apiKey,
              modelId,
              availableModels: availableModels.map((model) =>
                typeof model === "string" ? model : model.id
              ),
            }),
            signal: controller.signal,
          })

          if (!response.ok || !response.body) {
            const payload = await response.json().catch(() => ({}))
            throw new Error(payload.error || "Nie udało się rozpocząć analizy.")
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ""

          while (true) {
            const { value, done } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const frames = buffer.split("\n\n")
            buffer = frames.pop() || ""

            for (const frame of frames) {
              const line = frame
                .split("\n")
                .find((entry) => entry.startsWith("data: "))
              if (!line) continue

              const data = JSON.parse(line.slice(6))
              const timestamp =
                data.timestamp || new Date().toLocaleTimeString("pl-PL")

              if (data.type === "log") {
                setLogs((previous) => [
                  ...previous.slice(-100),
                  { time: timestamp, msg: data.message, type: "log" },
                ])
                if (data.percent !== undefined) {
                  setProgressPercent(Number(data.percent))
                }
              } else if (data.type === "progress") {
                if (data.count !== undefined) setFoundCount(Number(data.count))
                if (data.percent !== undefined) {
                  setProgressPercent(Number(data.percent))
                }
                setLogs((previous) => [
                  ...previous.slice(-100),
                  { time: timestamp, msg: data.message, type: "progress" },
                ])
              } else if (data.type === "error") {
                setLogs((previous) => [
                  ...previous,
                  { time: timestamp, msg: data.message, type: "error" },
                ])
                setIsMinimized(false)
              } else if (data.type === "done") {
                if (data.count !== undefined) setFoundCount(Number(data.count))
                if (data.stats) setAnalysisStats(data.stats)
                if (data.knowledge) setSessionResults(data.knowledge)
                setLogs((previous) => [
                  ...previous,
                  { time: timestamp, msg: data.message, type: "done" },
                ])
                setIsDone(true)
                setProgressPercent(100)
              }
            }
          }
        } catch (error) {
          if (controller.signal.aborted) return
          setLogs((previous) => [
            ...previous,
            {
              time: new Date().toLocaleTimeString("pl-PL"),
              msg:
                error instanceof Error
                  ? error.message
                  : "Błąd połączenia podczas analizy.",
              type: "error",
            },
          ])
          setIsMinimized(false)
        } finally {
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null
          }
          setIsTraining(false)
        }
      })()
    },
    []
  )

  useEffect(() => {
    return () => abortControllerRef.current?.abort()
  }, [])

  return (
    <KnowledgeContext.Provider
      value={{
        isTraining,
        isDone,
        isMinimized,
        trainingFile,
        foundCount,
        progressPercent,
        logs,
        analysisStats,
        sessionResults,
        tempApiKey,
        isValidatingKey,
        validationResult,
        selectedModelId,
        isApproved,
        setSelectedModelId,
        setIsApproved,
        setTempApiKey,
        setValidationResult,
        setIsValidatingKey,
        setSessionResults,
        setIsMinimized,
        setTrainingFile,
        startTraining,
        stopTraining,
        resetState,
      }}
    >
      {children}
    </KnowledgeContext.Provider>
  )
}

export function useKnowledge() {
  const context = useContext(KnowledgeContext)
  if (!context) {
    throw new Error("useKnowledge must be used within a KnowledgeProvider")
  }
  return context
}
