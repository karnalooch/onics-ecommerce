"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface AnalysisStats {
  model: string
  requests: number
  type: string
}

interface LogEntry {
  time: string
  msg: string
  type: 'log' | 'progress' | 'error' | 'done'
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
  sessionResults: Record<string, any> | null
  selectedModelId: string | null
  isApproved: boolean
  setSelectedModelId: (val: string | null) => void
  setIsApproved: (val: boolean) => void
  setTempApiKey: (val: string) => void
  setValidationResult: (val: any | null) => void
  setIsValidatingKey: (val: boolean) => void
  setIsMinimized: (val: boolean) => void
  setTrainingFile: (file: string | null) => void
  startTraining: (filename: string, apiKey: string, modelId: string, availableModels: any[]) => void
  stopTraining: () => void
  resetState: () => void
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(undefined)

export function KnowledgeProvider({ children }: { children: React.ReactNode }) {
  const [isTraining, setIsTraining] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [trainingFile, setTrainingFile] = useState<string | null>(null)
  const [foundCount, setFoundCount] = useState(0)
  const [progressPercent, setProgressPercent] = useState(0)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [analysisStats, setAnalysisStats] = useState<AnalysisStats | null>(null)
  const [sessionResults, setSessionResults] = useState<Record<string, any> | null>(null)
  const [activeEventSource, setActiveEventSource] = useState<EventSource | null>(null)
  const [tempApiKey, setTempApiKey] = useState("")
  const [isValidatingKey, setIsValidatingKey] = useState(false)
  const [validationResult, setValidationResult] = useState<any | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [isApproved, setIsApproved] = useState(false)

  // Toolkit Pattern: synchronous-connection-guards
  const eventSourceRef = React.useRef<EventSource | null>(null)
  const isConnectingRef = React.useRef(false)

  // Persistence: Restore state from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('celtronics_ai_training')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setIsTraining(parsed.isTraining || false)
        setIsDone(parsed.isDone || false)
        setTrainingFile(parsed.trainingFile || null)
        setFoundCount(parsed.foundCount || 0)
        setProgressPercent(parsed.progressPercent || 0)
        setLogs(parsed.logs || [])
        setAnalysisStats(parsed.analysisStats || null)
        setTempApiKey(parsed.tempApiKey || "")
        setValidationResult(parsed.validationResult || null)
        setIsMinimized(parsed.isMinimized ?? false)
      } catch (e) {
        console.error("Failed to restore training state", e)
      }
    }
  }, [])

  // Persistence: Save state to sessionStorage on changes
  useEffect(() => {
    const stateToSave = {
      isTraining,
      isDone,
      trainingFile,
      foundCount,
      progressPercent,
      logs,
      analysisStats,
      tempApiKey,
      validationResult,
      isMinimized
    }
    sessionStorage.setItem('celtronics_ai_training', JSON.stringify(stateToSave))
  }, [isTraining, isDone, trainingFile, foundCount, progressPercent, logs, analysisStats, tempApiKey, validationResult, isMinimized])

  const stopTraining = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setActiveEventSource(null)
    isConnectingRef.current = false
    setLogs(prev => [...prev.slice(-100), { time: new Date().toLocaleTimeString(), msg: "Przerwano operację przez użytkownika.", type: 'error' }])
    setIsTraining(false)
    setIsDone(false)
    setIsMinimized(false)
    setProgressPercent(0)
  }, [])

  const resetState = useCallback(() => {
    setIsTraining(false)
    setIsDone(false)
    setIsMinimized(false)
    setTrainingFile(null)
    setFoundCount(0)
    setProgressPercent(0)
    setLogs([])
    setAnalysisStats(null)
    setValidationResult(null)
    sessionStorage.removeItem('celtronics_ai_training')
    if (activeEventSource) {
      activeEventSource.close()
      setActiveEventSource(null)
    }
  }, [activeEventSource])

  const startTraining = useCallback((filename: string, apiKey?: string, modelId?: string, availableModels?: string[]) => {
    // Force reset if starting a new session
    if (!isTraining) {
      setIsTraining(true)
      setIsDone(false)
      setIsMinimized(false)
      setTrainingFile(filename)
      setLogs([{ time: new Date().toLocaleTimeString(), msg: "Inicjalizacja silnika...", type: 'log' }])
      setProgressPercent(0)
      setFoundCount(0)
      setAnalysisStats(null)
      setSessionResults(null)
    }

    if (eventSourceRef.current || isConnectingRef.current) {
      console.log("[SSE-GUARD] Zapobieganie powielaniu połączenia.");
      return;
    }

    isConnectingRef.current = true;

    const params = new URLSearchParams({
      filename,
      apiKey: apiKey || '',
      modelId: modelId || 'internal-v7',
      availableModels: Array.isArray(availableModels) 
        ? availableModels.map(m => typeof m === 'string' ? m : (m as any).id).join(',')
        : ''
    })

    const eventSource = new EventSource(`/api/knowledge/train/stream?${params.toString()}`)
    eventSourceRef.current = eventSource;
    setActiveEventSource(eventSource)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'log') {
        setLogs(prev => [...prev.slice(-100), { time: data.timestamp || new Date().toLocaleTimeString(), msg: data.message, type: 'log' }])
        if (data.percent !== undefined) setProgressPercent(data.percent)
      } else if (data.type === 'progress') {
        if (data.count !== undefined) setFoundCount(data.count)
        setLogs(prev => [...prev.slice(-100), { time: data.timestamp || new Date().toLocaleTimeString(), msg: data.message, type: 'progress' }])
      } else if (data.type === 'error') {
        setLogs(prev => [...prev, { time: data.timestamp || new Date().toLocaleTimeString(), msg: data.message, type: 'error' }])
        setIsMinimized(false)
        eventSource.close()
        setActiveEventSource(null)
      } else if (data.type === 'done') {
        if (data.count !== undefined) setFoundCount(data.count)
        if (data.stats) setAnalysisStats(data.stats)
        setLogs(prev => [...prev, { time: data.timestamp || new Date().toLocaleTimeString(), msg: data.message, type: 'done' }])
        if (data.knowledge) setSessionResults(data.knowledge)
        setIsMinimized(false)
        setIsDone(true)
        setIsTraining(false)
        setProgressPercent(100)
        eventSource.close()
        setActiveEventSource(null)
      }
    }

    eventSource.onerror = () => {
      setLogs(prev => [...prev.slice(-100), { time: new Date().toLocaleTimeString(), msg: "Problemy z siecią... Czekam na stabilne połączenie.", type: 'log' }])
      eventSource.close()
      eventSourceRef.current = null;
      setActiveEventSource(null)
      isConnectingRef.current = false;
    }
  }, [isTraining, isDone])

  // Automatic Re-attachment Logic
  useEffect(() => {
    // Sprawdzamy refa zamiast stanu, aby uniknąć wyścigów przy odświeżaniu
    if (isTraining && !isDone && !eventSourceRef.current && !isConnectingRef.current && trainingFile && tempApiKey) {
      const modelId = validationResult?.recommended || ''
      const avModels = validationResult?.availableModels || []
      
      // Mały timeout, aby dać Reactowi czas na ustabilizowanie stanów
      const timer = setTimeout(() => {
        startTraining(trainingFile, tempApiKey, modelId, avModels)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isTraining, isDone, trainingFile, tempApiKey, validationResult, startTraining])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeEventSource) {
        activeEventSource.close()
      }
    }
  }, [activeEventSource])

  return (
    <KnowledgeContext.Provider value={{
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
      resetState
    }}>
      {children}
    </KnowledgeContext.Provider>
  )
}

export function useKnowledge() {
  const context = useContext(KnowledgeContext)
  if (context === undefined) {
    throw new Error('useKnowledge must be used within a KnowledgeProvider')
  }
  return context
}
