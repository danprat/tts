import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  generateAudioMultiProcess, 
  resumeFromSession, 
  getResumableSessions,
  cleanupOldSessions,
  multiApiKeyManager,
  retryIndividualChunk
} from '../services/multiProcessService.js';
import { 
  validasiMultipleApiKeys,
  DEFAULT_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
  MAX_CHUNK_SIZE
} from '../services/geminiService.js';

export const useMultiProcessTTS = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
    sessionId: null,
    maxConcurrency: 0,
    batchInfo: null
  });
  const [audioResults, setAudioResults] = useState([]);
  const [failedChunks, setFailedChunks] = useState([]);
  const [allChunks, setAllChunks] = useState([]);
  const [apiKeyStats, setApiKeyStats] = useState([]);
  const [resumableSessions, setResumableSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [processingLogs, setProcessingLogs] = useState([]);
  const [retryingChunks, setRetryingChunks] = useState(new Set());
  
  // Custom settings state
  const [customSettings, setCustomSettings] = useState({
    chunkSize: DEFAULT_CHUNK_SIZE,
    maxConcurrency: 4
  });
  
  const abortController = useRef(null);

  // Load resumable sessions saat component mount
  useEffect(() => {
    loadResumableSessions();
    cleanupOldSessions(); // Cleanup session lama
  }, []);

  const loadResumableSessions = useCallback(() => {
    const sessions = getResumableSessions();
    setResumableSessions(sessions);
  }, []);

  const setupApiKeys = useCallback((apiKeysText) => {
    const validKeys = validasiMultipleApiKeys(apiKeysText);
    if (validKeys.length === 0) {
      throw new Error('Tidak ada API key yang valid ditemukan');
    }
    
    multiApiKeyManager.setApiKeys(validKeys);
    updateStats();
    
    return {
      validKeys: validKeys.length,
      maxConcurrency: Math.min(validKeys.length, customSettings.maxConcurrency)
    };
  }, [customSettings.maxConcurrency]);

  const updateCustomSettings = useCallback((newSettings) => {
    setCustomSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Validasi chunk size
      if (updated.chunkSize < MIN_CHUNK_SIZE) {
        updated.chunkSize = MIN_CHUNK_SIZE;
      } else if (updated.chunkSize > MAX_CHUNK_SIZE) {
        updated.chunkSize = MAX_CHUNK_SIZE;
      }
      
      // Validasi max concurrency
      if (updated.maxConcurrency < 1) {
        updated.maxConcurrency = 1;
      } else if (updated.maxConcurrency > 10) {
        updated.maxConcurrency = 10;
      }
      
      return updated;
    });
  }, []);

  const updateStats = useCallback(() => {
    const stats = multiApiKeyManager.getStats();
    setApiKeyStats(stats);
  }, []);

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLogs(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      message,
      type
    }].slice(-50)); // Keep only last 50 logs
  }, []);

  const clearLogs = useCallback(() => {
    setProcessingLogs([]);
  }, []);

  const handleProgress = useCallback((progressData) => {
    switch (progressData.type) {
      case 'session_start':
        setProgress(prev => ({
          ...prev,
          sessionId: progressData.sessionId,
          total: progressData.totalChunks,
          maxConcurrency: progressData.maxConcurrency
        }));
        setCurrentSession({
          id: progressData.sessionId,
          totalChunks: progressData.totalChunks,
          keysAvailable: progressData.keysAvailable,
          chunkSize: progressData.chunkSize,
          maxConcurrency: progressData.maxConcurrency
        });
        addLog(`Session dimulai: ${progressData.sessionId} (${progressData.totalChunks} chunks @ ${progressData.chunkSize} chars, ${progressData.keysAvailable} API keys, ${progressData.maxConcurrency}x concurrency)`);
        break;

      case 'batch_start':
        setProgress(prev => ({
          ...prev,
          batchInfo: {
            start: progressData.batchStart,
            end: progressData.batchEnd,
            size: progressData.batchSize
          },
          percentage: progressData.progress
        }));
        addLog(`Batch dimulai: chunk ${progressData.batchStart + 1}-${progressData.batchEnd} (${progressData.batchSize} chunks, ${progressData.maxConcurrency}x concurrency)`);
        break;

      case 'chunk_start':
        if (progressData.attempt && progressData.attempt > 1) {
          addLog(`Retry chunk ${progressData.chunkIndex + 1} (attempt ${progressData.attempt}/${progressData.maxRetries}) dengan ${progressData.apiKey}`, 'warning');
        } else {
          addLog(`Processing chunk ${progressData.chunkIndex + 1} dengan ${progressData.apiKey}`, 'processing');
        }
        break;

      case 'batch_complete':
        setProgress(prev => ({
          ...prev,
          current: progressData.completed,
          total: progressData.total,
          percentage: progressData.percentage
        }));
        updateStats();
        
        if (progressData.failed > 0) {
          addLog(`Batch selesai: ${progressData.completed}/${progressData.total} berhasil, ${progressData.failed} gagal`, 'warning');
        } else {
          addLog(`Batch selesai: ${progressData.completed}/${progressData.total} berhasil`);
        }
        break;

      default:
        break;
    }
  }, [addLog, updateStats]);

  const generateAudio = useCallback(async (text, voiceName = 'Kore', sessionId = null) => {
    if (!multiApiKeyManager.hasHealthyKeys()) {
      const stats = multiApiKeyManager.getStats();
      const rateLimitedKeys = stats.filter(k => k.isRateLimited);
      const errorKeys = stats.filter(k => k.health === 'error');
      
      let errorMessage = 'Tidak ada API key yang sehat. ';
      if (rateLimitedKeys.length > 0) {
        errorMessage += `${rateLimitedKeys.length} key kena rate limit/timeout. `;
      }
      if (errorKeys.length > 0) {
        errorMessage += `${errorKeys.length} key error. `;
      }
      errorMessage += 'Tunggu beberapa menit atau periksa API keys Anda.';
      
      throw new Error(errorMessage);
    }

    setIsProcessing(true);
    setAudioResults([]);
    setFailedChunks([]);
    setAllChunks([]);
    setProgress({
      current: 0,
      total: 0,
      percentage: 0,
      sessionId: null,
      maxConcurrency: 0,
      batchInfo: null
    });
    
    abortController.current = new AbortController();
    addLog(`Memulai multi-process TTS dengan chunk size: ${customSettings.chunkSize}, max concurrency: ${customSettings.maxConcurrency}...`);

    try {
      const result = await generateAudioMultiProcess(
        text,
        voiceName,
        handleProgress,
        sessionId,
        0, // resumeFromChunk
        [], // existingResults
        customSettings // Pass custom settings
      );

      // Update audio results dengan hasil yang lengkap
      if (process.env.NODE_ENV === 'development') {
        console.log('Setting audioResults in hook:', result.audioResults);
      }
      setAudioResults(result.audioResults || []);
      setFailedChunks(result.failedChunks || []);
      setAllChunks(result.chunks || []);
      setCurrentSession(prev => ({ 
        ...prev, 
        completed: result.completed,
        failedChunks: result.failedChunks || [],
        chunkSize: result.chunkSize,
        maxConcurrency: result.maxConcurrency
      }));
      
      if (result.completed) {
        addLog(`Proses selesai! ${result.completedChunks}/${result.totalChunks} chunks berhasil (chunk size: ${result.chunkSize}, concurrency: ${result.maxConcurrency}x)`, 'success');
        
        if (result.audioResults && result.audioResults.length > 1) {
          addLog(`Siap untuk auto-merge ${result.audioResults.length} chunks menjadi 1 file`, 'info');
        }
      } else {
        const failedCount = result.failedChunks?.length || 0;
        if (failedCount > 0) {
          addLog(`Proses parsial: ${result.completedChunks}/${result.totalChunks} chunks berhasil, ${failedCount} gagal`, 'warning');
          
          const timeoutErrors = result.failedChunks?.filter(f => 
            f.error?.includes('timeout') || 
            f.error?.includes('rate') ||
            f.error?.includes('limit')
          ) || [];
          
          if (timeoutErrors.length > 0) {
            addLog(`💡 Tips: ${timeoutErrors.length} chunks gagal karena timeout/rate limit. Coba turunkan chunk size atau concurrency, atau tunggu 5-10 menit lalu retry.`, 'info');
          }
        } else {
          addLog(`Proses parsial: ${result.completedChunks}/${result.totalChunks} chunks berhasil`, 'warning');
        }
      }

      loadResumableSessions();
      return result;

    } catch (error) {
      let enhancedError = error.message;
      if (error.message?.includes('Tidak ada API Key yang tersedia')) {
        enhancedError += ` - Coba turunkan max concurrency dari ${customSettings.maxConcurrency} atau tunggu 5-10 menit.`;
      }
      
      addLog(`Error: ${enhancedError}`, 'error');
      throw new Error(enhancedError);
    } finally {
      setIsProcessing(false);
      updateStats();
    }
  }, [handleProgress, addLog, loadResumableSessions, updateStats, customSettings]);

  const resumeSession = useCallback(async (sessionId) => {
    if (!sessionId) {
      throw new Error('Session ID diperlukan untuk resume');
    }

    addLog(`Melanjutkan session: ${sessionId}...`);
    return generateAudio(null, null, sessionId);
  }, [generateAudio, addLog]);

  const resumeFromSessionId = useCallback(async (sessionId) => {
    setIsProcessing(true);
    addLog(`Resume dari session: ${sessionId}`);

    try {
      const result = await resumeFromSession(sessionId, handleProgress);
      
      // Update audio results dengan hasil baru (merge dengan yang existing jika ada)
      setAudioResults(result.audioResults || []);
      setFailedChunks(result.failedChunks || []);
      setAllChunks(result.chunks || []);
      
      if (result.completed) {
        addLog(`Resume selesai! ${result.completedChunks}/${result.totalChunks} chunks berhasil`, 'success');
      } else {
        addLog(`Resume parsial: ${result.completedChunks}/${result.totalChunks} chunks berhasil`, 'warning');
      }

      loadResumableSessions();
      return result;

    } catch (error) {
      addLog(`Error resume: ${error.message}`, 'error');
      throw error;
    } finally {
      setIsProcessing(false);
      updateStats();
    }
  }, [handleProgress, addLog, loadResumableSessions, updateStats]);

  // Function baru untuk retry individual chunk dengan manual API key selection
  const retryChunk = useCallback(async (chunkIndex, chunkText, voiceName, selectedApiKey = null) => {
    if (!multiApiKeyManager.hasHealthyKeys()) {
      throw new Error('Tidak ada API key yang sehat untuk retry.');
    }

    setRetryingChunks(prev => new Set([...prev, chunkIndex]));
    
    if (selectedApiKey) {
      addLog(`Retry chunk ${chunkIndex + 1} dengan API key manual: ${selectedApiKey.substring(0, 10)}...`, 'warning');
    } else {
      addLog(`Retry chunk ${chunkIndex + 1} dengan auto API key selection...`, 'warning');
    }

    try {
      const result = await retryIndividualChunk(chunkIndex, chunkText, voiceName, selectedApiKey);
      
      if (result.success) {
        // Update audioResults dengan hasil retry
        setAudioResults(prev => {
          const newResults = [...prev];
          // Cari dan replace hasil yang ada, atau tambahkan baru
          const existingIndex = newResults.findIndex(r => r.index === chunkIndex);
          if (existingIndex >= 0) {
            newResults[existingIndex] = result.result;
          } else {
            newResults.push(result.result);
            newResults.sort((a, b) => a.index - b.index);
          }
          return newResults;
        });

        // Hapus dari failed chunks
        setFailedChunks(prev => prev.filter(f => f.index !== chunkIndex));
        
        addLog(`Chunk ${chunkIndex + 1} berhasil di-retry!`, 'success');
        updateStats();
        
        return result;
      } else {
        addLog(`Retry chunk ${chunkIndex + 1} gagal: ${result.error}`, 'error');
        throw new Error(result.error);
      }

    } catch (error) {
      addLog(`Error retry chunk ${chunkIndex + 1}: ${error.message}`, 'error');
      throw error;
    } finally {
      setRetryingChunks(prev => {
        const newSet = new Set(prev);
        newSet.delete(chunkIndex);
        return newSet;
      });
    }
  }, [addLog, updateStats]);

  const stopProcessing = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      setIsProcessing(false);
      addLog('Proses dihentikan oleh user', 'warning');
    }
  }, [addLog]);

  const retryFailedChunks = useCallback(async (sessionId) => {
    // Implementasi untuk retry chunks yang gagal
    addLog(`Retry chunks yang gagal untuk session: ${sessionId}`);
    return resumeFromSessionId(sessionId);
  }, [resumeFromSessionId, addLog]);

  const getHealthyApiKeysCount = useCallback(() => {
    return multiApiKeyManager.getJumlahKeysSehat();
  }, []);

  const getMaxConcurrency = useCallback(() => {
    const healthyKeys = multiApiKeyManager.getJumlahKeysSehat();
    return Math.min(healthyKeys, customSettings.maxConcurrency);
  }, [customSettings.maxConcurrency]);

  const getEstimatedChunks = useCallback((text) => {
    if (!text || text.length === 0) return 0;
    return Math.ceil(text.length / customSettings.chunkSize);
  }, [customSettings.chunkSize]);

  const getEstimatedBatches = useCallback((text) => {
    const chunks = getEstimatedChunks(text);
    const concurrency = getMaxConcurrency();
    return concurrency > 0 ? Math.ceil(chunks / concurrency) : 0;
  }, [getEstimatedChunks, getMaxConcurrency]);

  const deleteSession = useCallback((sessionId) => {
    // Dalam implementasi real, ini bisa menghapus dari sessionStorage
    addLog(`Session ${sessionId} dihapus`);
    loadResumableSessions();
  }, [addLog, loadResumableSessions]);

  // Helper function untuk mendapatkan status chunk
  const getChunkStatus = useCallback((index) => {
    const hasAudio = audioResults.some(r => r.index === index);
    const hasFailed = failedChunks.some(f => f.index === index);
    const isRetrying = retryingChunks.has(index);
    
    if (isRetrying) return 'retrying';
    if (hasAudio) return 'success';
    if (hasFailed) return 'failed';
    return 'pending';
  }, [audioResults, failedChunks, retryingChunks]);

  // Function untuk mendapatkan daftar API keys yang tersedia untuk manual selection
  const getAvailableApiKeys = useCallback(() => {
    return multiApiKeyManager.getApiKeysForManualSelection();
  }, []);

  return {
    // State
    isProcessing,
    progress,
    audioResults,
    failedChunks,
    allChunks,
    apiKeyStats,
    resumableSessions,
    currentSession,
    processingLogs,
    retryingChunks,
    customSettings,

    // Functions
    setupApiKeys,
    generateAudio,
    resumeSession,
    resumeFromSessionId,
    retryChunk,
    stopProcessing,
    retryFailedChunks,
    loadResumableSessions,
    deleteSession,
    updateStats,
    clearLogs,
    updateCustomSettings,
    getHealthyApiKeysCount,
    getMaxConcurrency,
    getEstimatedChunks,
    getEstimatedBatches,
    getChunkStatus,
    getAvailableApiKeys,

    // Computed values
    canProcess: !isProcessing && multiApiKeyManager.hasHealthyKeys(),
    hasResumableSessions: resumableSessions.length > 0,
    hasFailedChunks: failedChunks.length > 0,
    
    // Configuration constants
    MIN_CHUNK_SIZE,
    MAX_CHUNK_SIZE,
    DEFAULT_CHUNK_SIZE
  };
}; 