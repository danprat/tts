/**
 * Multi-Process TTS Service untuk processing parallel
 * Support resume dari chunk yang error
 */

import { generateSingleAudio, chunkText } from './geminiService.js';

// Enhanced storage untuk menyimpan progress session dengan audio results
const sessionStorage = {
  sessions: new Map(),
  audioCache: new Map(), // Cache untuk audio results sementara
  
  simpanSession(sessionId, data) {
    this.sessions.set(sessionId, {
      ...data,
      timestamp: Date.now()
    });
  },
  
  simpanAudioResults(sessionId, audioResults) {
    // Simpan audio results dalam cache sementara (hanya di memory)
    this.audioCache.set(sessionId, audioResults);
  },
  
  ambilAudioResults(sessionId) {
    return this.audioCache.get(sessionId) || [];
  },
  
  ambilSession(sessionId) {
    return this.sessions.get(sessionId);
  },
  
  hapusSession(sessionId) {
    this.sessions.delete(sessionId);
    this.audioCache.delete(sessionId);
  },
  
  getSemuaSession() {
    return Array.from(this.sessions.entries()).map(([id, data]) => ({
      id,
      ...data,
      hasAudioCache: this.audioCache.has(id)
    }));
  }
};

/**
 * Enhanced API Key Manager dengan health monitoring dan custom concurrency
 */
class MultiProcessApiKeyManager {
  constructor() {
    this.apiKeys = [];
    this.healthStatus = new Map(); // healthy, warning, error
    this.usageCount = new Map();
    this.errorCount = new Map();
    this.lastUsed = new Map();
    this.rateLimitInfo = new Map();
    this.maxConcurrency = 4; // Default max concurrency
  }

  setApiKeys(keys) {
    this.apiKeys = keys.filter(key => this.validasiApiKey(key));
    this.resetStats();
    this.checkKeysHealth();
  }

  setMaxConcurrency(maxConcurrency) {
    // Gunakan jumlah API keys sehat sebagai batas maksimal, bukan hardcoded limit
    const healthyKeysCount = this.ambilApiKeysSehat().length;
    const maxAllowed = Math.max(1, healthyKeysCount); // Minimum 1, maksimal sesuai API keys sehat
    
    this.maxConcurrency = Math.max(1, Math.min(maxConcurrency, maxAllowed));
    
    if (maxConcurrency > maxAllowed) {
      console.warn(`⚠️ Max Concurrency dibatasi ke ${maxAllowed}x (jumlah API keys sehat: ${healthyKeysCount})`);
    }
  }

  getMaxConcurrency() {
    // Double-check limit dengan jumlah keys sehat saat ini
    const healthyKeysCount = this.ambilApiKeysSehat().length;
    return Math.min(this.maxConcurrency, healthyKeysCount);
  }

  resetStats() {
    this.healthStatus.clear();
    this.usageCount.clear();
    this.errorCount.clear();
    this.lastUsed.clear();
    this.rateLimitInfo.clear();
    
    this.apiKeys.forEach(key => {
      this.healthStatus.set(key, 'healthy');
      this.usageCount.set(key, 0);
      this.errorCount.set(key, 0);
      this.lastUsed.set(key, 0);
    });
  }

  ambilApiKeysSehat(jumlah = null) {
    const now = Date.now();
    const sehatKeys = this.apiKeys.filter(key => {
      const health = this.healthStatus.get(key);
      const rateLimitTime = this.rateLimitInfo.get(key);
      
      // Skip jika error
      if (health === 'error') return false;
      
      // Skip jika masih dalam cooldown rate limit
      if (rateLimitTime && now < rateLimitTime) return false;
      
      // Auto-recover dari warning jika sudah lewat cooldown
      if (health === 'warning' && rateLimitTime && now >= rateLimitTime) {
        this.healthStatus.set(key, 'healthy');
        this.rateLimitInfo.delete(key);
      }
      
      return health === 'healthy' || health === 'warning';
    });
    
    if (jumlah && jumlah > 0) {
      return sehatKeys.slice(0, jumlah);
    }
    
    return sehatKeys;
  }

  tandaiError(apiKey, error) {
    const currentErrors = this.errorCount.get(apiKey) || 0;
    this.errorCount.set(apiKey, currentErrors + 1);
    
    // Check jika rate limiting atau timeout - prioritas tinggi
    const errorMessage = error.message?.toLowerCase() || '';
    const isRateLimit = errorMessage.includes('quota') || 
                       errorMessage.includes('rate') || 
                       errorMessage.includes('429') ||
                       errorMessage.includes('limit') ||
                       errorMessage.includes('exceeded') ||
                       errorMessage.includes('timeout') ||
                       errorMessage.includes('service unavailable') ||
                       errorMessage.includes('503');
    
    if (isRateLimit) {
      // Set cooldown 10 menit untuk timeout/rate limit
      const cooldownTime = errorMessage.includes('timeout') ? 
        Date.now() + (10 * 60 * 1000) : // 10 menit untuk timeout
        Date.now() + (5 * 60 * 1000);   // 5 menit untuk rate limit
      
      this.rateLimitInfo.set(apiKey, cooldownTime);
      this.healthStatus.set(apiKey, 'warning');
      
      const cooldownMinutes = errorMessage.includes('timeout') ? 10 : 5;
      console.warn(`API Key rate limited/timeout: ${apiKey.substring(0, 10)}... - cooldown ${cooldownMinutes} menit`);
      return;
    }
    
    // Jika error terlalu banyak, tandai sebagai bermasalah
    if (currentErrors >= 2) { // Lebih sensitif, 2 error langsung disable
      this.healthStatus.set(apiKey, 'error');
      console.error(`API Key disabled: ${apiKey.substring(0, 10)}... - terlalu banyak error`);
    } else {
      this.healthStatus.set(apiKey, 'warning');
    }
  }

  tandaiSukses(apiKey) {
    this.usageCount.set(apiKey, (this.usageCount.get(apiKey) || 0) + 1);
    this.lastUsed.set(apiKey, Date.now());
    
    // Reset error count kalau sukses
    this.errorCount.set(apiKey, 0);
    
    // Check cool down period
    const coolDownTime = this.rateLimitInfo.get(apiKey);
    if (coolDownTime && Date.now() > coolDownTime) {
      this.rateLimitInfo.delete(apiKey);
      this.healthStatus.set(apiKey, 'healthy');
    }
  }

  async checkKeysHealth() {
    // Periodic health check bisa ditambahkan disini
    // Untuk sekarang, kita gunakan real-time monitoring aja
  }

  getStats() {
    return this.apiKeys.map(key => ({
      key: key.substring(0, 10) + '...',
      health: this.healthStatus.get(key) || 'unknown',
      usage: this.usageCount.get(key) || 0,
      errors: this.errorCount.get(key) || 0,
      lastUsed: this.lastUsed.get(key) || 0,
      isRateLimited: this.rateLimitInfo.has(key),
      rateLimitTime: this.rateLimitInfo.get(key)
    }));
  }

  validasiApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }
    return apiKey.length > 20 && apiKey.includes('AI');
  }

  hasHealthyKeys() {
    return this.ambilApiKeysSehat().length > 0;
  }

  getJumlahKeysSehat() {
    return this.ambilApiKeysSehat().length;
  }

  // Method baru untuk mendapatkan key terbaik
  ambilApiKeyTerbaik() {
    const keysSehat = this.ambilApiKeysSehat();
    
    if (keysSehat.length === 0) {
      throw new Error('Tidak ada API Key yang tersedia. Semua key error atau rate limited.');
    }
    
    // Pilih key dengan usage paling sedikit
    const sortedKeys = keysSehat.sort((a, b) => {
      const usageA = this.usageCount.get(a) || 0;
      const usageB = this.usageCount.get(b) || 0;
      return usageA - usageB;
    });
    
    return sortedKeys[0];
  }

  // Method baru untuk mendapatkan API keys terdistribusi untuk batch parallel
  distributeApiKeysForBatch(batchSize) {
    const keysSehat = this.ambilApiKeysSehat();
    
    if (keysSehat.length === 0) {
      throw new Error('Tidak ada API Key yang tersedia untuk distribusi batch');
    }

    // Distribusi key ke setiap chunk dalam batch
    const distributedKeys = [];
    console.log(`🚀 Round-Robin Distribution: ${batchSize} chunks → ${keysSehat.length} API keys`);
    
    for (let i = 0; i < batchSize; i++) {
      const keyIndex = i % keysSehat.length; // Round-robin distribution
      const selectedKey = keysSehat[keyIndex];
      distributedKeys.push(selectedKey);
      
      console.log(`   C${i} → Key${keyIndex + 1} (${selectedKey.substring(0, 10)}...) [index ${i} % ${keysSehat.length} = ${keyIndex}]`);
    }

    // Count distribution untuk summary
    const keyCount = {};
    distributedKeys.forEach(key => {
      const keyName = key.substring(0, 10) + '...';
      keyCount[keyName] = (keyCount[keyName] || 0) + 1;
    });
    
    console.log(`📊 Distribution Summary:`, keyCount);
    
    return distributedKeys;
  }

  // Method baru untuk mendapatkan semua API keys untuk manual selection
  getApiKeysForManualSelection() {
    return this.apiKeys.map(key => ({
      key: key,
      displayKey: key.substring(0, 10) + '...',
      health: this.healthStatus.get(key) || 'unknown',
      usage: this.usageCount.get(key) || 0,
      errors: this.errorCount.get(key) || 0,
      lastUsed: this.lastUsed.get(key) || 0,
      isRateLimited: this.rateLimitInfo.has(key),
      rateLimitTime: this.rateLimitInfo.get(key)
    }));
  }
}

export const multiApiKeyManager = new MultiProcessApiKeyManager();

/**
 * Process single chunk dengan error handling dan retry logic
 * @param {string} chunk - Text chunk to process
 * @param {number} index - Chunk index
 * @param {string} voiceName - Voice name for TTS
 * @param {function} onProgress - Progress callback
 * @param {number} maxRetries - Maximum retry attempts
 * @param {string} assignedApiKey - Pre-assigned API key untuk parallel processing
 */
const prosesChunkTunggal = async (chunk, index, voiceName, onProgress, maxRetries = 3, assignedApiKey = null) => {
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Cek dulu apakah ada key yang sehat
      if (!multiApiKeyManager.hasHealthyKeys()) {
        throw new Error('Tidak ada API Key yang sehat untuk processing');
      }
      
      // Gunakan assigned key untuk attempt pertama, kalau retry baru pilih key terbaik
      let apiKey;
      if (attempt === 0 && assignedApiKey) {
        // Validasi assigned key masih sehat
        const keysSehat = multiApiKeyManager.ambilApiKeysSehat();
        if (keysSehat.includes(assignedApiKey)) {
          apiKey = assignedApiKey;
        } else {
          // Kalau assigned key tidak sehat, ambil yang terbaik
          apiKey = multiApiKeyManager.ambilApiKeyTerbaik();
        }
      } else {
        // Untuk retry attempts, ambil API key yang terbaik yang tersedia
        apiKey = multiApiKeyManager.ambilApiKeyTerbaik();
      }
      
      if (onProgress) {
        onProgress({
          type: 'chunk_start',
          chunkIndex: index,
          apiKey: apiKey.substring(0, 10) + '...',
          text: chunk.substring(0, 50) + (chunk.length > 50 ? '...' : ''),
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          assignedKey: assignedApiKey ? assignedApiKey.substring(0, 10) + '...' : null
        });
      }

      const result = await generateSingleAudio(chunk, voiceName, apiKey);
      
      // Mark success
      multiApiKeyManager.tandaiSukses(apiKey);
      
      return {
        success: true,
        index,
        result: {
          ...result,
          text: chunk,
          index,
          apiKeyUsed: apiKey.substring(0, 10) + '...',
          wasAssigned: assignedApiKey === apiKey
        }
      };
      
    } catch (error) {
      lastError = error;
      
      // Tentukan API key untuk error handling
      let errorApiKey;
      try {
        // Coba ambil key yang digunakan dari context, kalau gak ada ambil yang terbaik
        errorApiKey = multiApiKeyManager.ambilApiKeyTerbaik();
      } catch {
        // Jika tidak ada key yang tersedia, gunakan key pertama untuk logging
        errorApiKey = multiApiKeyManager.apiKeys[0] || 'unknown';
      }
      
      // Mark error pada API key
      multiApiKeyManager.tandaiError(errorApiKey, error);
      
      console.warn(`Attempt ${attempt + 1} failed for chunk ${index + 1}:`, error.message);
      
      // Jika masih ada percobaan dan masih ada key yang sehat, coba lagi
      if (attempt < maxRetries && multiApiKeyManager.hasHealthyKeys()) {
        console.log(`Retrying chunk ${index + 1} with different API key...`);
        // Tingkatkan delay berdasarkan attempt
        const delayTime = 2000 + (attempt * 1000); // 2s, 3s, 4s
        await new Promise(resolve => setTimeout(resolve, delayTime));
        continue;
      }
      
      // Jika sudah habis percobaan atau tidak ada key yang sehat
      break;
    }
  }
  
  // Return error result
  return {
    success: false,
    index,
    error: lastError?.message || 'Unknown error',
    chunk,
    apiKey: 'multiple-attempts',
    assignedKey: assignedApiKey ? assignedApiKey.substring(0, 10) + '...' : null
  };
};

/**
 * Multi-process TTS dengan batching berdasarkan jumlah API keys dan custom settings
 */
export const generateAudioMultiProcess = async (
  text, 
  voiceName = 'Kore', 
  onProgress = null,
  sessionId = null,
  resumeFromChunk = 0,
  existingResults = [],
  customSettings = {}
) => {
  // Extract custom settings
  const { 
    chunkSize = 500, 
    maxConcurrency = null 
  } = customSettings;

  // Generate session ID kalau belum ada
  if (!sessionId) {
    sessionId = `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  if (!multiApiKeyManager.hasHealthyKeys()) {
    throw new Error('Tidak ada API Key yang sehat. Silakan check API keys Anda.');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text tidak boleh kosong');
  }

  // Update max concurrency jika di-custom
  if (maxConcurrency !== null) {
    multiApiKeyManager.setMaxConcurrency(maxConcurrency);
  }

  const chunks = chunkText(text.trim(), chunkSize);
  const totalChunks = chunks.length;
  const keysSehat = multiApiKeyManager.ambilApiKeysSehat();
  const finalMaxConcurrency = Math.min(keysSehat.length, multiApiKeyManager.getMaxConcurrency());
  
  // Initialize atau restore session
  let audioResults = [...existingResults];
  let completedChunks = new Set(audioResults.map(r => r.index));
  let failedChunks = [];
  
  // Simpan session info
  sessionStorage.simpanSession(sessionId, {
    text,
    voiceName,
    totalChunks,
    completedChunks: Array.from(completedChunks),
    failedChunks,
    startTime: Date.now(),
    status: 'processing',
    chunkSize,
    maxConcurrency: finalMaxConcurrency
  });

  if (onProgress) {
    onProgress({
      type: 'session_start',
      sessionId,
      totalChunks,
      maxConcurrency: finalMaxConcurrency,
      keysAvailable: keysSehat.length,
      resumeFromChunk,
      chunkSize
    });
  }

  try {
    // Process chunks dalam batches
    for (let batchStart = resumeFromChunk; batchStart < totalChunks; batchStart += finalMaxConcurrency) {
      const batchEnd = Math.min(batchStart + finalMaxConcurrency, totalChunks);
      const batchChunks = [];
      
      // Prepare batch dengan distribusi API keys
      for (let i = batchStart; i < batchEnd; i++) {
        if (!completedChunks.has(i)) {
          // Cek apakah masih ada key yang sehat
          if (!multiApiKeyManager.hasHealthyKeys()) {
            throw new Error('Semua API keys tidak tersedia atau rate limited. Tunggu beberapa menit dan coba lagi.');
          }
          
          batchChunks.push({
            chunk: chunks[i],
            index: i
          });
        }
      }

      if (batchChunks.length === 0) continue;

      // Distribusi API keys untuk batch chunks
      const distributedApiKeys = multiApiKeyManager.distributeApiKeysForBatch(batchChunks.length);

      if (onProgress) {
        onProgress({
          type: 'batch_start',
          batchStart,
          batchEnd,
          batchSize: batchChunks.length,
          progress: Math.round((batchStart / totalChunks) * 100),
          maxConcurrency: finalMaxConcurrency,
          distributedKeys: distributedApiKeys.map(key => key.substring(0, 10) + '...')
        });
      }

      // Process batch secara parallel dengan distributed API keys
      const batchPromises = batchChunks.map(({ chunk, index }, batchIndex) => 
        prosesChunkTunggal(
          chunk, 
          index, 
          voiceName, 
          onProgress, 
          3, // maxRetries
          distributedApiKeys[batchIndex] // assigned API key untuk chunk ini
        )
      );

      const batchResults = await Promise.allSettled(batchPromises);

      // Process hasil batch
      for (const [idx, settledResult] of batchResults.entries()) {
        const originalIndex = batchChunks[idx].index;
        
        if (settledResult.status === 'fulfilled') {
          const result = settledResult.value;
          
          if (result.success) {
            audioResults.push(result.result);
            completedChunks.add(originalIndex);
          } else {
            failedChunks.push({
              index: originalIndex,
              error: result.error,
              chunk: result.chunk,
              apiKey: result.apiKey || 'multiple-attempts'
            });
          }
        } else {
          failedChunks.push({
            index: originalIndex,
            error: settledResult.reason?.message || 'Unknown error',
            chunk: batchChunks[idx].chunk,
            apiKey: 'promise-rejected'
          });
        }
      }

      // Update session
      sessionStorage.simpanSession(sessionId, {
        text,
        voiceName,
        totalChunks,
        completedChunks: Array.from(completedChunks),
        failedChunks,
        progress: Math.round((completedChunks.size / totalChunks) * 100),
        status: failedChunks.length > 0 ? 'partial' : 'processing',
        chunkSize,
        maxConcurrency: finalMaxConcurrency
      });

      if (onProgress) {
        onProgress({
          type: 'batch_complete',
          completed: completedChunks.size,
          total: totalChunks,
          failed: failedChunks.length,
          percentage: Math.round((completedChunks.size / totalChunks) * 100)
        });
      }

      // Delay antar batch untuk menghindari overwhelming API
      if (batchEnd < totalChunks) {
        console.log('Waiting 3 seconds before next batch to avoid rate limiting...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Tingkatkan ke 3 detik
      }
    }

    // Sort hasil berdasarkan index
    audioResults.sort((a, b) => a.index - b.index);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Final audioResults before return:', audioResults);
      console.log('AudioResults length:', audioResults.length);
      audioResults.forEach((result, index) => {
        console.log(`AudioResult ${index}:`, {
          hasAudioBlob: !!result.audioBlob,
          text: result.text?.substring(0, 50),
          index: result.index,
          apiKeyUsed: result.apiKeyUsed
        });
      });
    }

    const isCompleted = completedChunks.size === totalChunks;
    const status = isCompleted ? 'completed' : 'partial';

    // Update final session
    sessionStorage.simpanSession(sessionId, {
      text,
      voiceName,
      totalChunks,
      completedChunks: Array.from(completedChunks),
      failedChunks,
      progress: Math.round((completedChunks.size / totalChunks) * 100),
      status,
      endTime: Date.now(),
      chunkSize,
      maxConcurrency: finalMaxConcurrency
    });
    
    // Simpan audio results ke cache untuk resume
    if (audioResults.length > 0) {
      sessionStorage.simpanAudioResults(sessionId, audioResults);
    }

    return {
      sessionId,
      audioResults,
      chunks,
      totalChunks,
      completedChunks: completedChunks.size,
      failedChunks,
      stats: multiApiKeyManager.getStats(),
      completed: isCompleted,
      canResume: !isCompleted && failedChunks.length > 0,
      maxConcurrency: finalMaxConcurrency,
      chunkSize
    };

  } catch (error) {
    sessionStorage.simpanSession(sessionId, {
      text,
      voiceName,
      totalChunks,
      completedChunks: Array.from(completedChunks),
      failedChunks,
      status: 'error',
      error: error.message,
      endTime: Date.now(),
      chunkSize,
      maxConcurrency: finalMaxConcurrency
    });

    throw error;
  }
};

/**
 * Retry individual chunk yang gagal dengan optional manual API key selection
 */
export const retryIndividualChunk = async (chunkIndex, chunkText, voiceName, selectedApiKey = null, maxRetries = 2) => {
  if (!multiApiKeyManager.hasHealthyKeys() && !selectedApiKey) {
    throw new Error('Tidak ada API key yang sehat untuk retry.');
  }

  console.log(`Retrying individual chunk ${chunkIndex + 1}:`, chunkText.substring(0, 50) + '...');
  
  if (selectedApiKey) {
    // Gunakan API key yang dipilih manual
    try {
      console.log(`Using manual selected API key: ${selectedApiKey.substring(0, 10)}...`);
      
      const result = await generateSingleAudio(chunkText, voiceName, selectedApiKey);
      
      // Mark success pada API key yang dipilih
      multiApiKeyManager.tandaiSukses(selectedApiKey);
      
      return {
        success: true,
        index: chunkIndex,
        result: {
          ...result,
          text: chunkText,
          index: chunkIndex,
          apiKeyUsed: selectedApiKey.substring(0, 10) + '... (manual)'
        }
      };
      
    } catch (error) {
      // Mark error pada API key yang dipilih
      multiApiKeyManager.tandaiError(selectedApiKey, error);
      
      return {
        success: false,
        index: chunkIndex,
        error: error?.message || 'Unknown error',
        chunk: chunkText,
        apiKey: selectedApiKey.substring(0, 10) + '... (manual)'
      };
    }
  } else {
    // Gunakan function prosesChunkTunggal yang sudah ada untuk auto selection
    const result = await prosesChunkTunggal(chunkText, chunkIndex, voiceName, null, maxRetries);
    return result;
  }
};

/**
 * Resume processing dari session yang gagal
 */
export const resumeFromSession = async (sessionId, onProgress = null) => {
  const session = sessionStorage.ambilSession(sessionId);
  
  if (!session) {
    throw new Error('Session tidak ditemukan');
  }

  if (session.status === 'completed') {
    throw new Error('Session sudah selesai');
  }

  console.log('Resuming session:', sessionId, session);

  // Coba ambil audio results yang sudah ada dari cache
  const cachedAudioResults = sessionStorage.ambilAudioResults(sessionId);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Cached audio results:', cachedAudioResults.length);
    console.log('Completed chunks from session:', session.completedChunks);
    console.log('Failed chunks:', session.failedChunks);
    console.log('Resume from chunk:', resumeFromChunk);
    console.log('Using existing audio results:', cachedAudioResults.length);
  }
  
  // Jika ada audio results yang sudah berhasil, gunakan sebagai existing results
  const existingResults = cachedAudioResults.length > 0 ? cachedAudioResults : [];
  
  // Cari chunk pertama yang belum completed untuk resume
  const completedIndexes = session.completedChunks || [];
  const failedIndexes = (session.failedChunks || []).map(f => f.index);
  
  // Resume dari chunk yang pertama failed atau yang belum diproses
  const resumeFromChunk = failedIndexes.length > 0 ? Math.min(...failedIndexes) : completedIndexes.length;
  
  return generateAudioMultiProcess(
    session.text,
    session.voiceName,
    onProgress,
    sessionId,
    resumeFromChunk,
    existingResults
  );
};

/**
 * Get daftar session yang bisa di-resume
 */
export const getResumableSessions = () => {
  return sessionStorage.getSemuaSession()
    .filter(session => 
      session.status === 'partial' || 
      session.status === 'error'
    )
    .sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * Cleanup session lama
 */
export const cleanupOldSessions = (maxAge = 24 * 60 * 60 * 1000) => {
  const now = Date.now();
  const sessions = sessionStorage.getSemuaSession();
  
  sessions.forEach(session => {
    if (now - session.timestamp > maxAge) {
      sessionStorage.hapusSession(session.id);
    }
  });
};

export { sessionStorage }; 