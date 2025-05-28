import { useState, useRef, useEffect } from 'react';
import { Volume2, Download, Loader2, Key, Mic, Upload, FileText, Play, Pause, RotateCcw, Download as DownloadIcon, ChevronDown, ChevronUp, Zap, Settings } from 'lucide-react';
import { 
  downloadAudio, 
  downloadAllChunks,
  mergeAudioBlobs,
  readFileAsText,
  validateTextFile,
  VOICE_CONFIGS,
  getVoicesByCategory
} from './services/geminiService';
import { useMultiProcessTTS } from './hooks/useMultiProcessTTS';
import { useVoicePreference } from './hooks/useLocalStorage';
import MultiProcessMonitor from './components/MultiProcessMonitor';

const AppMultiProcess = () => {
  const [text, setText] = useState('');
  const [apiKeys, setApiKeys] = useState('');
  const [selectedVoice, setSelectedVoice] = useVoicePreference();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mergedAudioUrl, setMergedAudioUrl] = useState('');
  const [mergedAudioBlob, setMergedAudioBlob] = useState(null);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(-1);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [enableMultiProcess, setEnableMultiProcess] = useState(true);
  const [showMonitor, setShowMonitor] = useState(false);
  const [showApiKeySelector, setShowApiKeySelector] = useState(false);
  const [selectedChunkForRetry, setSelectedChunkForRetry] = useState(null);
  const [availableApiKeys, setAvailableApiKeys] = useState([]);
  const [activeMenu, setActiveMenu] = useState('api-keys');
  const [autoLoadAttempted, setAutoLoadAttempted] = useState(false);
  
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  const {
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
    setupApiKeys,
    generateAudio,
    resumeFromSessionId,
    retryChunk,
    retryFailedChunks,
    loadResumableSessions,
    deleteSession,
    clearLogs,
    updateCustomSettings,
    getHealthyApiKeysCount,
    getMaxConcurrency,
    getEstimatedChunks,
    getEstimatedBatches,
    getChunkStatus,
    getAvailableApiKeys,
    canProcess,
    hasResumableSessions,
    hasFailedChunks,
    MIN_CHUNK_SIZE,
    MAX_CHUNK_SIZE,
    DEFAULT_CHUNK_SIZE
  } = useMultiProcessTTS();

  const voicesByCategory = getVoicesByCategory();

  // Load API keys dari localStorage saat component mount
  useEffect(() => {
    const savedApiKeys = localStorage.getItem('gemini-tts-api-keys');
    if (savedApiKeys) {
      setApiKeys(savedApiKeys);
    }
  }, []);

  // Auto-setup API keys setelah hook siap
  useEffect(() => {
    const savedApiKeys = localStorage.getItem('gemini-tts-api-keys');
    console.log('Auto-load effect triggered:', {
      savedApiKeys: !!savedApiKeys,
      autoLoadAttempted,
      setupApiKeys: !!setupApiKeys,
      isProcessing,
      canProcess
    });
    
    if (savedApiKeys && !autoLoadAttempted && setupApiKeys && !isProcessing) {
      setAutoLoadAttempted(true);
      console.log('Attempting auto-load with keys:', savedApiKeys.substring(0, 20) + '...');
      try {
        const result = setupApiKeys(savedApiKeys);
        console.log('Auto-loaded API keys:', result);
        setSuccess(`Auto-loaded ${result.validKeys} API keys dari storage dengan max ${result.maxConcurrency}x concurrency`);
      } catch (err) {
        console.warn('Failed to auto-setup saved API keys:', err);
        setError(`Gagal auto-load API keys: ${err.message}`);
      }
    }
  }, [setupApiKeys, isProcessing, autoLoadAttempted, canProcess]);

  const bersihkanAlert = () => {
    setError('');
    setSuccess('');
  };

  const resetAll = () => {
    setMergedAudioUrl('');
    setMergedAudioBlob(null);
    setCurrentPlayingIndex(-1);
    bersihkanAlert();
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getCurrentVoiceInfo = () => {
    return VOICE_CONFIGS.find(voice => voice.name === selectedVoice) || VOICE_CONFIGS[0];
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      validateTextFile(file);
      const content = await readFileAsText(file);
      setText(content);
      setSuccess(`File "${file.name}" berhasil diupload (${content.length} karakter)`);
    } catch (err) {
      setError(err.message);
    }
    
    // Reset input
    event.target.value = '';
  };

  const handleSetupApiKeys = () => {
    try {
      const result = setupApiKeys(apiKeys);
      // Simpan ke localStorage setelah setup berhasil
      localStorage.setItem('gemini-tts-api-keys', apiKeys);
      setSuccess(`API Keys berhasil di-setup dan disimpan! ${result.validKeys} keys valid, max concurrency: ${result.maxConcurrency}`);
      setShowMonitor(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClearApiKeys = () => {
    if (window.confirm('Hapus semua API keys yang tersimpan? Action ini tidak bisa di-undo.')) {
      localStorage.removeItem('gemini-tts-api-keys');
      setApiKeys('');
      setAutoLoadAttempted(false);
      setSuccess('API Keys berhasil dihapus dari storage!');
    }
  };

  const handleGenerateAudio = async () => {
    bersihkanAlert();
    resetAll();

    if (!canProcess) {
      setError('Setup API keys terlebih dahulu atau tunggu proses selesai.');
      return;
    }

    if (!text.trim()) {
      setError('Silakan masukkan text atau upload file .txt terlebih dahulu.');
      return;
    }

    setShowMonitor(true);

    try {
      const result = await generateAudio(text.trim(), selectedVoice);
      
      if (result.completed) {
        // Auto-merge audio jika lebih dari 1 chunk
        if (result.audioResults.length > 1) {
          try {
            const audioBlobs = result.audioResults.map(r => r.audioBlob);
            const merged = await mergeAudioBlobs(audioBlobs);
            setMergedAudioBlob(merged);
            setMergedAudioUrl(URL.createObjectURL(merged));
            setSuccess(`Audio berhasil dibuat dan digabung! ${result.completedChunks}/${result.totalChunks} chunk diproses dengan max ${result.maxConcurrency}x concurrency.`);
          } catch (mergeError) {
            console.warn('Gagal merge audio:', mergeError);
            setSuccess(`Audio berhasil dibuat! ${result.completedChunks}/${result.totalChunks} chunk diproses. Merge gagal, gunakan download individual chunks.`);
          }
        } else if (result.audioResults.length === 1) {
          // Single chunk, langsung set sebagai merged
          setMergedAudioBlob(result.audioResults[0].audioBlob);
          setMergedAudioUrl(URL.createObjectURL(result.audioResults[0].audioBlob));
          setSuccess(`Audio berhasil dibuat! 1 chunk diproses.`);
        }
      } else {
        setError(`Proses tidak lengkap: ${result.completedChunks}/${result.totalChunks} chunk berhasil. Check tab Sessions untuk resume.`);
      }
      
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePlayChunk = (index) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('handlePlayChunk called with index:', index);
      console.log('audioResults:', audioResults);
      console.log('audioResults[index]:', audioResults[index]);
      console.log('currentPlayingIndex:', currentPlayingIndex);
    }
    
    if (currentPlayingIndex === index) {
      // Pause current playing
      setCurrentPlayingIndex(-1);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    } else {
      // Play new chunk
      setCurrentPlayingIndex(index);
      
      const audioResult = audioResults[index];
      if (audioResult?.audioBlob) {
        try {
          const audioUrl = URL.createObjectURL(audioResult.audioBlob);
          
          // Stop any currently playing audio
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          
          // Create new audio element for chunk
          const audio = new Audio();
          audio.src = audioUrl;
          audio.preload = 'auto';
          audioRef.current = audio;
          
          audio.play().then(() => {
            if (process.env.NODE_ENV === 'development') {
              console.log('Audio started playing successfully');
            }
          }).catch(err => {
            console.error('Audio play failed:', err);
            setCurrentPlayingIndex(-1);
            setError(`Gagal memutar audio chunk ${index + 1}: ${err.message}`);
          });
          
          // Cleanup when audio ends
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            setCurrentPlayingIndex(-1);
            audioRef.current = null;
          };
          
          // Cleanup on error
          audio.onerror = (e) => {
            console.error('Audio error:', e);
            URL.revokeObjectURL(audioUrl);
            setCurrentPlayingIndex(-1);
            audioRef.current = null;
            setError(`Error memutar audio chunk ${index + 1}`);
          };
          
        } catch (err) {
          console.error('Error creating audio URL:', err);
          setError(`Gagal membuat URL audio untuk chunk ${index + 1}`);
          setCurrentPlayingIndex(-1);
        }
      } else {
        console.error('Audio blob not found for index:', index);
        setError(`Audio chunk ${index + 1} tidak tersedia atau belum di-generate`);
        setCurrentPlayingIndex(-1);
      }
    }
  };

  const handleDownloadMerged = () => {
    if (mergedAudioBlob) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `gemini-tts-merged-${timestamp}.wav`;
      downloadAudio(mergedAudioBlob, filename);
      setSuccess(`Audio gabungan berhasil didownload sebagai: ${filename}`);
    }
  };

  const handleDownloadAllChunks = () => {
    if (audioResults.length > 0) {
      downloadAllChunks(audioResults);
      setSuccess(`${audioResults.length} file audio chunk berhasil didownload!`);
    }
  };

  const handleDownloadChunk = (result, index) => {
    if (result.audioBlob) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `gemini-tts-chunk-${String(index + 1).padStart(2, '0')}-${timestamp}.wav`;
      downloadAudio(result.audioBlob, filename);
      setSuccess(`Chunk ${index + 1} berhasil didownload sebagai: ${filename}`);
    } else {
      setError(`Audio chunk ${index + 1} tidak tersedia untuk download`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleGenerateAudio();
    }
  };

  const handleRetryChunk = async (chunkIndex, chunkText) => {
    try {
      await retryChunk(chunkIndex, chunkText, selectedVoice);
      setSuccess(`Chunk ${chunkIndex + 1} berhasil di-retry!`);
    } catch (err) {
      setError(`Gagal retry chunk ${chunkIndex + 1}: ${err.message}`);
    }
  };

  const handleRetryChunkWithApiKeySelection = (chunkIndex, chunkText) => {
    // Get available API keys
    const apiKeys = getAvailableApiKeys();
    setAvailableApiKeys(apiKeys);
    setSelectedChunkForRetry({ index: chunkIndex, text: chunkText });
    setShowApiKeySelector(true);
  };

  const handleManualApiKeyRetry = async (selectedApiKey) => {
    if (!selectedChunkForRetry) return;
    
    try {
      setShowApiKeySelector(false);
      await retryChunk(selectedChunkForRetry.index, selectedChunkForRetry.text, selectedVoice, selectedApiKey);
      setSuccess(`Chunk ${selectedChunkForRetry.index + 1} berhasil di-retry dengan API key manual!`);
    } catch (err) {
      setError(`Gagal retry chunk ${selectedChunkForRetry.index + 1}: ${err.message}`);
    } finally {
      setSelectedChunkForRetry(null);
    }
  };

  const handleCancelApiKeySelection = () => {
    setShowApiKeySelector(false);
    setSelectedChunkForRetry(null);
    setAvailableApiKeys([]);
  };

  const handleResumeSession = async (sessionId) => {
    try {
      setShowMonitor(true);
      await resumeFromSessionId(sessionId);
      setSuccess(`Session ${sessionId} berhasil di-resume!`);
    } catch (err) {
      setError(`Gagal resume session: ${err.message}`);
    }
  };

  const handleRetrySession = async (sessionId) => {
    try {
      setShowMonitor(true);
      await retryFailedChunks(sessionId);
      setSuccess(`Retry untuk session ${sessionId} berhasil!`);
    } catch (err) {
      setError(`Gagal retry session: ${err.message}`);
    }
  };

  const handleDeleteSession = (sessionId) => {
    deleteSession(sessionId);
    setSuccess(`Session ${sessionId} berhasil dihapus!`);
  };

  return (
    <div className="container">
      <div className="header">
        <h1>
          <Mic style={{ display: 'inline-block', marginRight: '0.5rem' }} />
          Gemini TTS
          <span style={{ 
            fontSize: '0.6em', 
            background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
            color: 'white',
            padding: '0.2rem 0.5rem',
            borderRadius: '1rem',
            marginLeft: '1rem',
            fontWeight: '600'
          }}>
            <Zap size={12} style={{ display: 'inline', marginRight: '0.2rem' }} />
            MULTI-PROCESS
          </span>
        </h1>
        <p>
          Konversi text ke suara dengan multi-processing berdasarkan jumlah API keys - {VOICE_CONFIGS.length} Voice Models
          <br />
          <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>
            🚀 Proses parallel, Resume otomatis, Health monitoring
          </span>
        </p>
      </div>

      <div className="content">
        {/* Navigation Menu */}
        <div className="nav-menu">
          <button
            onClick={() => setActiveMenu('api-keys')}
            className={`nav-item ${activeMenu === 'api-keys' ? 'active' : ''}`}
          >
            <Key size={20} />
            <span>API Keys Setup</span>
            <div className="nav-badge">
              {getHealthyApiKeysCount()}/{apiKeyStats.length}
            </div>
          </button>
          
          <button
            onClick={() => setActiveMenu('generate')}
            className={`nav-item ${activeMenu === 'generate' ? 'active' : ''}`}
            disabled={!canProcess}
          >
            <Zap size={20} />
            <span>Generate Audio</span>
            {!canProcess && <div className="nav-status disabled">Not Ready</div>}
          </button>
          
          <button
            onClick={() => setActiveMenu('monitoring')}
            className={`nav-item ${activeMenu === 'monitoring' ? 'active' : ''}`}
          >
            <Settings size={20} />
            <span>Monitoring</span>
            {(isProcessing || hasResumableSessions) && (
              <div className="nav-status processing">
                {isProcessing ? 'Processing' : `${resumableSessions.length} Sessions`}
              </div>
            )}
          </button>
        </div>

        {/* API Keys Setup Section */}
        {activeMenu === 'api-keys' && (
          <div className="menu-section">
            <div className="section-header">
              <h2>
                <Key size={24} />
                API Keys Configuration
              </h2>
              <p>Setup multiple Google Gemini API keys untuk parallel processing</p>
            </div>

            <div className="form-group">
              <label htmlFor="apiKeys" className="label">
                Multiple API Keys (One per line)
              </label>
              <textarea
                id="apiKeys"
                value={apiKeys}
                onChange={(e) => setApiKeys(e.target.value)}
                placeholder="Masukkan API keys (satu per baris):&#10;AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX&#10;AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY&#10;AIzaSyZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ"
                className="textarea"
                style={{ minHeight: '120px' }}
              />
              <div className="input-helper">
                Dapatkan API key gratis di{' '}
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Google AI Studio
                </a>
              </div>
            </div>

            <div className="action-group">
              <button
                onClick={handleSetupApiKeys}
                className="button button-primary"
                disabled={isProcessing || !apiKeys.trim()}
              >
                <Settings size={16} />
                Setup API Keys
              </button>
            </div>

            <div className="action-group">
              <button
                onClick={handleClearApiKeys}
                className="button button-secondary"
                disabled={isProcessing || !apiKeys.trim()}
              >
                <Settings size={16} />
                Clear API Keys
              </button>
            </div>

            {/* API Keys Status Grid */}
            {apiKeyStats.length > 0 && (
              <div className="status-card">
                <h3>API Keys Status</h3>
                <div className="api-keys-grid">
                  {apiKeyStats.map((keyInfo, index) => (
                    <div key={`api-key-${keyInfo.key}-${index}`} className={`api-key-card ${keyInfo.health}`}>
                      <div className="api-key-header">
                        <span className="api-key-name">{keyInfo.key}</span>
                        <span className={`status-badge ${keyInfo.health}`}>
                          {keyInfo.health}
                        </span>
                      </div>
                      <div className="api-key-stats">
                        <div className="stat">
                          <span className="stat-label">Usage</span>
                          <span className="stat-value">{keyInfo.usage}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Errors</span>
                          <span className="stat-value">{keyInfo.errors}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Last Used</span>
                          <span className="stat-value">
                            {keyInfo.lastUsed > 0 ? new Date(keyInfo.lastUsed).toLocaleTimeString() : 'Never'}
                          </span>
                        </div>
                      </div>
                      {keyInfo.isRateLimited && (
                        <div className="rate-limit-warning">
                          ⚠️ Rate Limited
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="status-summary">
                  <div className="summary-item">
                    <span className="summary-label">Healthy Keys:</span>
                    <span className="summary-value">{getHealthyApiKeysCount()}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Max Concurrency:</span>
                    <span className="summary-value">{getMaxConcurrency()}x</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Status:</span>
                    <span className={`summary-value ${canProcess ? 'ready' : 'not-ready'}`}>
                      {canProcess ? '✅ Ready' : '❌ Not Ready'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generate Audio Section */}
        {activeMenu === 'generate' && (
          <div className="menu-section">
            <div className="section-header">
              <h2>
                <Zap size={24} />
                Generate Audio
              </h2>
              <p>Konversi text ke suara dengan multi-process parallel</p>
            </div>

            {/* API Key Status Alert */}
            {apiKeyStats.length > 0 && (
              <div className="warning-card">
                <h4>📊 API Keys Status</h4>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <span>✅ Healthy: {getHealthyApiKeysCount()}</span>
                  <span>⚠️ Rate Limited: {apiKeyStats.filter(k => k.isRateLimited).length}</span>
                  <span>❌ Error: {apiKeyStats.filter(k => k.health === 'error').length}</span>
                  <span>🚀 Max Parallel: {Math.min(getHealthyApiKeysCount(), getMaxConcurrency())}x distribusi ke {getHealthyApiKeysCount()} keys</span>
                </div>
                {getHealthyApiKeysCount() === 0 && (
                  <p style={{ color: 'var(--color-error)', fontWeight: '600' }}>
                    ⛔ Semua API keys bermasalah! Check di tab API Keys atau tunggu cooldown.
                  </p>
                )}
                {getHealthyApiKeysCount() > 0 && apiKeyStats.filter(k => k.isRateLimited).length > 0 && (
                  <p style={{ color: 'var(--color-warning)', fontWeight: '500' }}>
                    ⏳ Beberapa keys kena rate limit - processing akan lambat karena concurrency terbatas ke {getHealthyApiKeysCount()} keys saja.
                  </p>
                )}
                {getHealthyApiKeysCount() > 0 && getHealthyApiKeysCount() < getMaxConcurrency() && (
                  <p style={{ color: 'var(--color-warning)', fontWeight: '500' }}>
                    💡 Concurrency dibatasi ke {getHealthyApiKeysCount()}x karena hanya {getHealthyApiKeysCount()} API keys yang sehat. Setiap chunk akan dikirim ke API key berbeda.
                  </p>
                )}
              </div>
            )}

            {!canProcess && (
              <div className="warning-card">
                <h4>⚠️ Setup Required</h4>
                <p>Silakan setup API keys terlebih dahulu di tab "API Keys Setup"</p>
              </div>
            )}

            {/* Text Input */}
            <div className="form-group">
              <div className="label-with-action">
                <label htmlFor="text" className="label">
                  <FileText size={16} />
                  Text Content (Unlimited Length)
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="button button-secondary button-small"
                >
                  <Upload size={16} />
                  Upload .txt
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Masukkan text di sini atau upload file .txt...&#10;&#10;Text akan diproses secara parallel dengan chunk 500 karakter."
                className="textarea"
                style={{ minHeight: '150px' }}
                disabled={!canProcess}
              />
              <div className="input-helper">
                <strong>Total:</strong> {text.length.toLocaleString()} karakter
                {text.length > 500 && (
                  <> • <strong>Estimasi chunks:</strong> {getEstimatedChunks(text)}
                    {getHealthyApiKeysCount() > 0 && (
                      <> • <strong>Estimasi batch:</strong> {getEstimatedBatches(text)}</>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Custom Settings - Simplified */}
            <div className="form-group">
              <label className="label">⚙️ Settings</label>
              
              <div className="settings-grid">
                <div className="setting-item">
                  <label className="setting-label">Chunk Size</label>
                  <input
                    type="number"
                    className="setting-input"
                    min={MIN_CHUNK_SIZE}
                    max={MAX_CHUNK_SIZE}
                    value={customSettings.chunkSize}
                    onChange={(e) => updateCustomSettings({ 
                      chunkSize: Math.max(MIN_CHUNK_SIZE, Math.min(MAX_CHUNK_SIZE, parseInt(e.target.value) || DEFAULT_CHUNK_SIZE))
                    })}
                  />
                  <div className="setting-helper">
                    {MIN_CHUNK_SIZE}-{MAX_CHUNK_SIZE} chars per chunk
                  </div>
                </div>

                <div className="setting-item">
                  <label className="setting-label">Max Concurrency</label>
                  <input
                    type="number"
                    className="setting-input"
                    min={1}
                    max={10}
                    value={customSettings.maxConcurrency || getMaxConcurrency()}
                    onChange={(e) => updateCustomSettings({ 
                      maxConcurrency: Math.max(1, Math.min(10, parseInt(e.target.value) || 4))
                    })}
                  />
                  <div className="setting-helper">
                    Parallel across {getHealthyApiKeysCount()} API keys
                  </div>
                </div>
              </div>

              {/* Quick Preview */}
              <div className="settings-info">
                <div className="preview-stats">
                  <span>📦 {getEstimatedChunks(text)} chunks</span>
                  <span>⚡ {getMaxConcurrency()}x across {getHealthyApiKeysCount()} keys</span>
                  <span>🔄 {getEstimatedBatches(text)} batches</span>
                  <span>⏱️ ~{Math.ceil(getEstimatedBatches(text) * 3)}s</span>
                </div>

                {/* Quick Presets */}
                <div className="preset-buttons">
                  <button
                    className="preset-button"
                    onClick={() => updateCustomSettings({ chunkSize: 300, maxConcurrency: 2 })}
                  >
                    🐌 Safe
                  </button>
                  <button
                    className="preset-button"
                    onClick={() => updateCustomSettings({ chunkSize: 500, maxConcurrency: 4 })}
                  >
                    ⚡ Balanced
                  </button>
                  <button
                    className="preset-button"
                    onClick={() => updateCustomSettings({ chunkSize: 800, maxConcurrency: 6 })}
                  >
                    🚀 Fast
                  </button>
                  <button
                    className="preset-button"
                    onClick={() => updateCustomSettings({ chunkSize: 1200, maxConcurrency: 8 })}
                  >
                    ⚡ Max
                  </button>
                </div>

                {/* Simple Tips */}
                <details className="tips-collapsible">
                  <summary className="tips-summary">💡 Tips & Penjelasan</summary>
                  <div className="tips-content">
                    <div className="tip-item">
                      <strong>📏 Chunk Size:</strong>
                      <p>Ukuran text per potongan. Lebih besar = lebih cepat tapi berisiko timeout.</p>
                    </div>
                    <div className="tip-item">
                      <strong>⚡ Max Concurrency:</strong>
                      <p>Berapa chunk diproses bersamaan menggunakan API key yang berbeda. Bukan request per API key!</p>
                      <ul>
                        <li>2x = 2 chunk parallel dengan 2 API key berbeda</li>
                        <li>4x = 4 chunk parallel dengan 4 API key berbeda</li>
                        <li>Max dibatasi oleh jumlah API key yang sehat</li>
                      </ul>
                    </div>
                    <div className="tip-item">
                      <strong>🎯 Presets Explanation:</strong>
                      <ul>
                        <li><strong>🐌 Safe:</strong> Chunk kecil, concurrency rendah - untuk API yang sering timeout</li>
                        <li><strong>⚡ Balanced:</strong> Setting standar - balance antara speed & stability</li>
                        <li><strong>🚀 Fast:</strong> Chunk besar, concurrency tinggi - untuk API stabil</li>
                        <li><strong>⚡ Max:</strong> Maximum speed - berisiko rate limit</li>
                      </ul>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            {/* Voice Selection */}
            <div className="form-group">
              <label className="label">Voice Selection ({VOICE_CONFIGS.length} Models)</label>
              
              <div 
                onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                className="voice-selector-trigger"
              >
                <div className="selected-voice">
                  <div className="voice-name">{getCurrentVoiceInfo().name}</div>
                  <div className="voice-details">
                    {getCurrentVoiceInfo().category} • {getCurrentVoiceInfo().description}
                  </div>
                </div>
                {showVoiceSelector ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {showVoiceSelector && (
                <div className="voice-selector-dropdown">
                  {Object.entries(voicesByCategory).map(([category, voices]) => (
                    <div key={category} className="voice-category">
                      <div 
                        onClick={() => toggleCategory(category)}
                        className="voice-category-header"
                      >
                        <span>{category} ({voices.length})</span>
                        {expandedCategories[category] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                      
                      {expandedCategories[category] && (
                        <div className="voice-category-content">
                          <div className="voice-category-grid">
                            {voices.map((voice) => (
                              <div
                                key={voice.name}
                                className={`voice-option ${selectedVoice === voice.name ? 'selected' : ''}`}
                                onClick={() => {
                                  setSelectedVoice(voice.name);
                                  setShowVoiceSelector(false);
                                }}
                              >
                                <div className="voice-option-name">{voice.name}</div>
                                <div className="voice-option-description">{voice.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="action-group">
              <button
                onClick={handleGenerateAudio}
                disabled={isProcessing || !canProcess || !text.trim()}
                className="button button-primary button-large"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing {progress.current}/{progress.total} ({progress.percentage}%)
                  </>
                ) : (
                  <>
                    <Zap size={20} />
                    Generate Audio (Multi-Process)
                  </>
                )}
              </button>
              
              {isProcessing && (
                <div className="processing-info">
                  Menggunakan {getMaxConcurrency()}x parallel processing distribusi ke {getHealthyApiKeysCount()} API keys...
                </div>
              )}
            </div>

            {/* Results Section */}
            {(audioResults.length > 0 || mergedAudioBlob) && (
              <div className="results-section">
                <h3>🎵 Audio Results</h3>
                
                {/* Merged Audio */}
                {mergedAudioBlob && (
                  <div className="merged-audio-card">
                    <h4>🎯 Audio Gabungan Siap</h4>
                    <div className="audio-controls">
                      <audio 
                        controls 
                        className="audio-player" 
                        src={mergedAudioUrl}
                        preload="metadata"
                      />
                    </div>
                    <div className="result-actions">
                      <button
                        onClick={handleDownloadMerged}
                        className="button button-primary"
                      >
                        💾 Download Audio Gabungan
                      </button>
                    </div>
                    <div className="result-info">
                      {audioResults.length > 1 
                        ? `${audioResults.length} chunks telah digabung menjadi 1 file audio` 
                        : 'Audio siap untuk digunakan'
                      }
                    </div>
                  </div>
                )}

                {/* Individual Chunks */}
                {(allChunks.length > 0 || audioResults.length > 0) && (
                  <div className="chunks-section">
                    <div className="chunks-header">
                      <h4>📝 Chunks Overview ({Math.max(allChunks.length, audioResults.length)})</h4>
                      {hasFailedChunks && (
                        <span className="failed-indicator">
                          ⚠️ {failedChunks.length} chunk gagal
                        </span>
                      )}
                    </div>
                    
                    <div className="chunks-grid">
                      {Array.from({ length: Math.max(allChunks.length, audioResults.length, currentSession?.totalChunks || 0) }, (_, index) => {
                        const chunkStatus = getChunkStatus(index);
                        const audioResult = audioResults.find(r => r.index === index);
                        const failedChunk = failedChunks.find(f => f.index === index);
                        const chunkText = allChunks[index] || failedChunk?.chunk || audioResult?.text || `Chunk ${index + 1}`;
                        const isRetrying = retryingChunks.has(index);
                        
                        return (
                          <div 
                            key={index} 
                            className={`chunk-card ${chunkStatus} ${currentPlayingIndex === index ? 'playing' : ''}`}
                          >
                            <div className="chunk-header">
                              <span className="chunk-number">
                                {chunkStatus === 'success' && '✅'}
                                {chunkStatus === 'failed' && '❌'}
                                {chunkStatus === 'retrying' && '🔄'}
                                {chunkStatus === 'pending' && '⏳'}
                                Chunk {index + 1}
                              </span>
                              <span className="chunk-status">{chunkStatus}</span>
                            </div>
                            
                            <div className="chunk-content">
                              <div className="chunk-text">
                                {chunkText.length > 150 ? chunkText.substring(0, 150) + '...' : chunkText}
                              </div>
                              
                              {chunkStatus === 'failed' && failedChunk && (
                                <div className="chunk-error">
                                  <strong>Error:</strong> {failedChunk.error}<br />
                                  <strong>API Key:</strong> {failedChunk.apiKey}
                                </div>
                              )}
                              
                              {chunkStatus === 'success' && audioResult?.audioBlob && (
                                <div className="chunk-audio">
                                  <audio 
                                    controls 
                                    style={{ width: '100%', height: '32px' }}
                                    src={URL.createObjectURL(audioResult.audioBlob)}
                                    preload="metadata"
                                  />
                                </div>
                              )}
                              
                              {chunkStatus === 'success' && audioResult && (
                                <div className="chunk-info">
                                  API: {audioResult.apiKeyUsed}
                                </div>
                              )}
                            </div>
                            
                            <div className="chunk-actions">
                              {chunkStatus === 'success' && audioResult && (
                                <>
                                  <button
                                    onClick={() => handlePlayChunk(index)}
                                    className="button button-small button-secondary"
                                    disabled={isRetrying}
                                  >
                                    {currentPlayingIndex === index ? '⏸️' : '▶️'}
                                  </button>
                                  <button
                                    onClick={() => handleDownloadChunk(audioResult, index)}
                                    className="button button-small button-primary"
                                    disabled={!audioResult.audioBlob || isRetrying}
                                  >
                                    💾
                                  </button>
                                </>
                              )}
                              
                              {chunkStatus === 'failed' && (
                                <button
                                  onClick={() => handleRetryChunkWithApiKeySelection(index, chunkText)}
                                  className="button button-small button-retry"
                                  disabled={isRetrying || isProcessing || !canProcess}
                                >
                                  {isRetrying ? '🔄' : '🔄 Retry'}
                                </button>
                              )}
                              
                              {chunkStatus === 'retrying' && (
                                <div className="retrying-indicator">
                                  <div className="spinner"></div>
                                  Retrying...
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {hasFailedChunks && (
                      <div className="failed-summary">
                        <p>
                          <strong>{failedChunks.length} chunk gagal</strong> - Gunakan tombol Retry individual atau retry semua chunk yang gagal.
                        </p>
                        <button
                          onClick={() => {
                            failedChunks.forEach(failedChunk => {
                              handleRetryChunk(failedChunk.index, failedChunk.chunk);
                            });
                          }}
                          className="button button-primary"
                          disabled={isProcessing || !canProcess}
                          style={{ backgroundColor: 'var(--color-error)', border: 'none' }}
                        >
                          🔄 Retry All Failed Chunks ({failedChunks.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Monitoring Section */}
        {activeMenu === 'monitoring' && (
          <div className="menu-section">
            <div className="section-header">
              <h2>
                <Settings size={24} />
                System Monitoring
              </h2>
              <p>Real-time monitoring untuk multi-process TTS</p>
            </div>

            <MultiProcessMonitor
              progress={progress}
              apiKeyStats={apiKeyStats}
              resumableSessions={resumableSessions}
              processingLogs={processingLogs}
              currentSession={currentSession}
              onResumeSession={handleResumeSession}
              onRetrySession={handleRetrySession}
              onDeleteSession={handleDeleteSession}
              onClearLogs={clearLogs}
              isProcessing={isProcessing}
            />
          </div>
        )}

        {/* Alert Messages */}
        {error && (
          <div className="alert alert-error">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{error}</span>
              <button onClick={bersihkanAlert} className="alert-close">×</button>
            </div>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{success}</span>
              <button onClick={bersihkanAlert} className="alert-close">×</button>
            </div>
          </div>
        )}
      </div>

      {/* API Key Selector Modal */}
      {showApiKeySelector && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--color-bg)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ 
                margin: 0, 
                marginBottom: '0.5rem',
                color: 'var(--color-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🔑 Pilih API Key untuk Retry
              </h3>
              <p style={{ 
                margin: 0, 
                color: 'var(--color-text-secondary)',
                fontSize: '0.875rem'
              }}>
                Chunk {selectedChunkForRetry?.index + 1} - Pilih API key manual atau gunakan auto selection
              </p>
            </div>

            {/* Preview chunk text */}
            {selectedChunkForRetry && (
              <div style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                marginBottom: '1rem',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                maxHeight: '100px',
                overflowY: 'auto'
              }}>
                <strong>Text chunk:</strong><br />
                {selectedChunkForRetry.text.length > 150 
                  ? selectedChunkForRetry.text.substring(0, 150) + '...' 
                  : selectedChunkForRetry.text
                }
              </div>
            )}

            {/* Auto selection option */}
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={() => handleManualApiKeyRetry(null)}
                className="button button-secondary"
                style={{ 
                  width: '100%',
                  marginBottom: '1rem',
                  padding: '1rem',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>🎯</span>
                <div>
                  <div style={{ fontWeight: '600' }}>Auto Selection</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Sistem akan memilih API key terbaik secara otomatis
                  </div>
                </div>
              </button>
            </div>

            {/* Manual API Key Selection */}
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: 'var(--color-text)',
                marginBottom: '0.75rem'
              }}>
                Manual Selection ({availableApiKeys.length} keys tersedia):
              </h4>
              
              <div style={{ 
                display: 'grid', 
                gap: '0.5rem',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {availableApiKeys.map((keyInfo, index) => {
                  const getHealthColor = (health, isRateLimited) => {
                    if (isRateLimited) return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
                    switch (health) {
                      case 'healthy': return { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' };
                      case 'warning': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
                      case 'error': return { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
                      default: return { bg: 'rgba(156, 163, 175, 0.1)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' };
                    }
                  };

                  const colors = getHealthColor(keyInfo.health, keyInfo.isRateLimited);
                  const isDisabled = keyInfo.health === 'error' || keyInfo.isRateLimited;

                  return (
                    <button
                      key={index}
                      onClick={() => !isDisabled && handleManualApiKeyRetry(keyInfo.key)}
                      disabled={isDisabled}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${colors.border}`,
                        borderRadius: 'var(--radius)',
                        background: colors.bg,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.6 : 1,
                        textAlign: 'left',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '0.25rem'
                      }}>
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'var(--color-text)'
                        }}>
                          {keyInfo.displayKey}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: colors.text,
                          textTransform: 'capitalize'
                        }}>
                          {keyInfo.isRateLimited ? 'Rate Limited' : keyInfo.health}
                        </span>
                      </div>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary)'
                      }}>
                        <div>Usage: {keyInfo.usage}</div>
                        <div>Errors: {keyInfo.errors}</div>
                        <div>
                          Last: {keyInfo.lastUsed > 0 
                            ? new Date(keyInfo.lastUsed).toLocaleTimeString() 
                            : 'Never'
                          }
                        </div>
                      </div>
                      {keyInfo.isRateLimited && keyInfo.rateLimitTime && (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#f59e0b',
                          marginTop: '0.25rem'
                        }}>
                          Cooldown: {Math.ceil((keyInfo.rateLimitTime - Date.now()) / 60000)} menit
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ 
              display: 'flex', 
              gap: '0.75rem', 
              justifyContent: 'flex-end',
              paddingTop: '1rem',
              borderTop: '1px solid var(--color-border)'
            }}>
              <button
                onClick={handleCancelApiKeySelection}
                className="button button-secondary"
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppMultiProcess; 