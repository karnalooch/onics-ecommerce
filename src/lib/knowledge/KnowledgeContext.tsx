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
  tempApiKey: string
  isValidatingKey: boolean
  validationResult: any | null
  setTempApiKey: (val: string) => void
  setValidationResult: (val: any | null) => void
  setIsValidatingKey: (val: boolean) => void
  setIsMinimized: (val: boolean) => void
  setTrainingFile: (file: string | null) => void
  startTraining: (filename: string, apiKey: string, modelId: string, availableModels: string[]) => void
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
  const [activeEventSource, setActiveEventSource] = useState<EventSource | null>(null)
  const [tempApiKey, setTempApiKey] = useState("")
  const [isValidatingKey, setIsValidatingKey] = useState(false)
  const [validationResult, setValidationResult] = useState<any | null>(null)

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
    if (activeEventSource) {
      activeEventSource.close()
      setActiveEventSource(null)
    }
    setLogs(prev => [...prev.slice(-100), { time: new Date().toLocaleTimeString(), msg: "Przerwano operację przez użytkownika.", type: 'error' }])
    setIsTraining(false)
    setIsDone(false)
    setIsMinimized(false)
    setProgressPercent(0)
  }, [activeEventSource])

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

  const startTraining = useCallback((filename: string, apiKey: string, modelId: string, availableModels: string[]) => {
    // Only reset detailed counts if starting a COMPLETELY new session manually
    if (!isTraining) {
      setIsTraining(true)
      setIsDone(false)
      setIsMinimized(false)
      setTrainingFile(filename)
      setLogs([{ time: new Date().toLocaleTimeString(), msg: "Inicjalizacja połączenia...", type: 'log' }])
      setProgressPercent(0)
      setFoundCount(0)
      setAnalysisStats(null)
    }

    const params = new URLSearchParams({
      filename,
      apiKey,
      modelId,
      availableModels: availableModels.join(',')
    })

    const eventSource = new EventSource(`/api/knowledge/train/stream?${params.toString()}`)
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
        setIsMinimized(false)
        setIsDone(true)
        setProgressPercent(100)
        eventSource.close()
        setActiveEventSource(null)
      }
    }

    eventSource.onerror = () => {
      setLogs(prev => [...prev.slice(-100), { time: new Date().toLocaleTimeString(), msg: "Błąd połączenia (SSE). Próba ponownego połączenia...", type: 'error' }])
      eventSource.close()
      setActiveEventSource(null)
      
      // Auto-reconnect after 3 seconds if still training
      setTimeout(() => {
        if (isTraining && !isDone) {
          // Note: Logic here is simple, in real app we'd use a better backoff
        }
      }, 3000)
    }
  }, [isTraining, isDone])

  // Automatic Re-attachment Logic
  useEffect(() => {
    if (isTraining && !isDone && !activeEventSource && trainingFile && tempApiKey) {
      const modelId = validationResult?.recommended || ''
      const avModels = validationResult?.availableModels || []
      startTraining(trainingFile, tempApiKey, modelId, avModels)
    }
  }, [isTraining, isDone, activeEventSource, trainingFile, tempApiKey, validationResult, startTraining])

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
      tempApiKey,
      isValidatingKey,
      validationResult,
      setTempApiKey,
      setValidationResult,
      setIsValidatingKey,
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
