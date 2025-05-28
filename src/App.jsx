import { useState, useRef } from 'react';
import { Volume2, Download, Loader2, Key, Mic, Upload, FileText, Play, Pause, RotateCcw, Download as DownloadIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  generateAudio, 
  downloadAudio, 
  downloadAllChunks,
  mergeAudioBlobs,
  readFileAsText,
  validateTextFile,
  VOICE_CONFIGS,
  getVoicesByCategory,
  validasiMultipleApiKeys,
  apiKeyManager 
} from './services/geminiService';
import { useVoicePreference } from './hooks/useLocalStorage';

const App = () => {
  const [text, setText] = useState('');
  const [apiKeys, setApiKeys] = useState('');
  const [selectedVoice, setSelectedVoice] = useVoicePreference();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [audioResults, setAudioResults] = useState([]);
  const [mergedAudioUrl, setMergedAudioUrl] = useState('');
  const [mergedAudioBlob, setMergedAudioBlob] = useState(null);
  const [progress, setProgress] = useState(null);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(-1);
  const [stats, setStats] = useState([]);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  
  // Resume functionality states
  const [canResume, setCanResume] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [lastProcessedText, setLastProcessedText] = useState('');
  const [failedChunkIndex, setFailedChunkIndex] = useState(-1);
  
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  const voicesByCategory = getVoicesByCategory();

  const bersihkanAlert = () => {
    setError('');
    setSuccess('');
  };

  const resetAll = () => {
    setAudioResults([]);
    setMergedAudioUrl('');
    setMergedAudioBlob(null);
    setProgress(null);
    setCurrentPlayingIndex(-1);
    setStats([]);
    setCanResume(false);
    setResumeData(null);
    setLastProcessedText('');
    setFailedChunkIndex(-1);
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

  const handleGenerateAudio = async (isResume = false) => {
    bersihkanAlert();
    
    if (!isResume) {
      resetAll();
    }

    const validKeys = validasiMultipleApiKeys(apiKeys);
    if (validKeys.length === 0) {
      setError('Tidak ada API Key yang valid. Masukkan minimal 1 API key yang benar.');
      return;
    }

    if (!text.trim()) {
      setError('Silakan masukkan text atau upload file .txt terlebih dahulu.');
      return;
    }

    // Check if text changed when resuming
    if (isResume && text.trim() !== lastProcessedText) {
      setError('Text telah berubah. Resume hanya bisa dilakukan dengan text yang sama.');
      return;
    }

    // Setup API key manager
    apiKeyManager.setApiKeys(validKeys);
    setIsLoading(true);

    try {
      const resumeFromChunk = isResume && resumeData ? resumeData.failedChunkIndex : 0;
      const existingResults = isResume && resumeData ? resumeData.audioResults : [];
      
      const result = await generateAudio(
        text, 
        selectedVoice, 
        (progressData) => {
          setProgress(progressData);
        },
        resumeFromChunk,
        existingResults
      );

      if (result.completed) {
        // Processing completed successfully
        setAudioResults(result.audioResults);
        setStats(result.stats);
        setProgress(null);
        setCanResume(false);
        setResumeData(null);
        
        // Merge audio jika ada multiple chunks
        if (result.audioResults.length > 1) {
          const audioBlobs = result.audioResults.map(r => r.audioBlob);
          const merged = await mergeAudioBlobs(audioBlobs);
          setMergedAudioBlob(merged);
          setMergedAudioUrl(URL.createObjectURL(merged));
        } else if (result.audioResults.length === 1) {
          setMergedAudioBlob(result.audioResults[0].audioBlob);
          setMergedAudioUrl(result.audioResults[0].audioUrl);
        }

        const completedChunks = result.audioResults.length;
        const resumeText = isResume ? ` (Resume dari chunk ${resumeFromChunk + 1})` : '';
        setSuccess(`Audio berhasil dibuat! ${completedChunks}/${result.totalChunks} chunk diproses dengan ${validKeys.length} API key.${resumeText}`);
        
      } else {
        // Processing failed, but can resume
        setAudioResults(result.audioResults);
        setStats(result.stats);
        setProgress(null);
        setCanResume(true);
        setResumeData({
          audioResults: result.audioResults,
          failedChunkIndex: result.failedChunkIndex,
          totalChunks: result.totalChunks
        });
        setLastProcessedText(text.trim());
        setFailedChunkIndex(result.failedChunkIndex);
        
        const completedChunks = result.audioResults.length;
        setError(`${result.error} Progress tersimpan: ${completedChunks}/${result.totalChunks} chunk berhasil.`);
      }
      
    } catch (err) {
      setError(err.message);
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeProcessing = () => {
    handleGenerateAudio(true);
  };

  const handlePlayChunk = (index) => {
    if (currentPlayingIndex === index) {
      setCurrentPlayingIndex(-1);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      setCurrentPlayingIndex(index);
      if (audioRef.current) {
        audioRef.current.src = audioResults[index].audioUrl;
        audioRef.current.play().catch(console.warn);
      }
    }
  };

  const handleDownloadMerged = () => {
    if (mergedAudioBlob) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      downloadAudio(mergedAudioBlob, `gemini-tts-merged-${timestamp}.wav`);
      setSuccess('Audio gabungan berhasil didownload!');
    }
  };

  const handleDownloadAllChunks = () => {
    if (audioResults.length > 0) {
      downloadAllChunks(audioResults);
      setSuccess(`${audioResults.length} file audio chunk berhasil didownload!`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleGenerateAudio();
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>
          <Mic style={{ display: 'inline-block', marginRight: '0.5rem' }} />
          Gemini TTS
        </h1>
        <p>Konversi text ke suara menggunakan Google Gemini AI - {VOICE_CONFIGS.length} Voice Models</p>
      </div>

      <div className="content">
        {/* API Keys Input */}
        <div className="form-group">
          <label htmlFor="apiKeys" className="label">
            <Key size={16} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
            Google Gemini API Keys (Multi Key Round Robin)
          </label>
          <textarea
            id="apiKeys"
            value={apiKeys}
            onChange={(e) => setApiKeys(e.target.value)}
            placeholder="Masukkan API keys (satu per baris untuk round robin):&#10;AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX&#10;AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY&#10;AIzaSyZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ"
            className="textarea"
            style={{ minHeight: '100px' }}
          />
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            Dapatkan API key gratis di{' '}
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'var(--color-primary)' }}
            >
              Google AI Studio
            </a>
            <br />
            <strong>Valid keys:</strong> {validasiMultipleApiKeys(apiKeys).length} dari {apiKeys.split('\n').filter(k => k.trim()).length} input
          </p>
        </div>

        {/* Text Input with File Upload */}
        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <label htmlFor="text" className="label" style={{ margin: 0 }}>
              <FileText size={16} style={{ display: 'inline-block', marginRight: '0.5rem' }} />
              Text Content (Unlimited Length)
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="button button-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
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
            placeholder="Masukkan text di sini atau upload file .txt...&#10;&#10;Text akan dipecah otomatis menjadi chunk 500 karakter untuk diproses secara bergantian dengan API keys yang tersedia."
            className="textarea"
            style={{ minHeight: '150px' }}
          />
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            <strong>Total:</strong> {text.length.toLocaleString()} karakter
            {text.length > 500 && (
              <> • <strong>Estimasi chunks:</strong> {Math.ceil(text.length / 500)}</>
            )}
          </p>
        </div>

        {/* Voice Selection */}
        <div className="form-group">
          <label className="label">Pilih Suara ({VOICE_CONFIGS.length} Models)</label>
          
          {/* Current Voice Display */}
          <div 
            onClick={() => setShowVoiceSelector(!showVoiceSelector)}
            style={{
              padding: '1rem',
              border: '2px solid var(--color-primary)',
              borderRadius: 'var(--radius)',
              background: 'var(--color-bg)',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}
          >
            <div>
              <div style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                {getCurrentVoiceInfo().name}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                {getCurrentVoiceInfo().category} • {getCurrentVoiceInfo().description}
              </div>
            </div>
            {showVoiceSelector ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {/* Voice Selector */}
          {showVoiceSelector && (
            <div style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              background: 'var(--color-bg-secondary)',
              maxHeight: '400px',
              overflowY: 'auto',
              marginBottom: '1rem'
            }}>
              {Object.entries(voicesByCategory).map(([category, voices]) => (
                <div key={category}>
                  <div 
                    onClick={() => toggleCategory(category)}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'var(--color-bg)',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: '600'
                    }}
                  >
                    <span>{category} ({voices.length})</span>
                    {expandedCategories[category] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  
                  {expandedCategories[category] && (
                    <div style={{ padding: '0.5rem' }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '0.5rem'
                      }}>
                        {voices.map((voice) => (
                          <div
                            key={voice.name}
                            className={`voice-card ${selectedVoice === voice.name ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedVoice(voice.name);
                              setShowVoiceSelector(false);
                            }}
                            style={{
                              padding: '0.75rem',
                              border: selectedVoice === voice.name ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                              borderRadius: 'var(--radius)',
                              background: selectedVoice === voice.name ? 'rgba(99, 102, 241, 0.1)' : 'var(--color-bg)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{voice.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                              {voice.description}
                            </div>
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

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {/* Progress Bar */}
        {progress && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="label">
                Processing Progress
                {progress.isResuming && (
                  <span style={{ color: 'var(--color-accent)', marginLeft: '0.5rem' }}>
                    (Resume dari chunk {progress.resumeFromChunk})
                  </span>
                )}
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                {progress.current}/{progress.total} chunks ({progress.percentage}%)
              </span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              backgroundColor: 'var(--color-border)', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${progress.percentage}%`, 
                height: '100%', 
                backgroundColor: 'var(--color-primary)',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              Current: {progress.currentText}
            </p>
          </div>
        )}

        {/* Resume Section */}
        {canResume && !isLoading && (
          <div style={{ 
            marginBottom: '1.5rem',
            padding: '1rem',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid var(--color-warning)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--color-warning)', marginBottom: '0.25rem' }}>
                ⚠️ Processing Terhenti
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                {resumeData?.audioResults.length || 0}/{resumeData?.totalChunks || 0} chunk berhasil diproses.
                {failedChunkIndex >= 0 && ` Error di chunk ${failedChunkIndex + 1}.`}
              </div>
            </div>
            <button
              onClick={handleResumeProcessing}
              className="button button-primary"
              style={{ minWidth: '120px' }}
            >
              🔄 Resume
            </button>
          </div>
        )}

        {/* Control Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => handleGenerateAudio(false)}
            disabled={isLoading || !text.trim() || validasiMultipleApiKeys(apiKeys).length === 0}
            className="button button-primary"
            style={{ flex: 1 }}
          >
            {isLoading ? (
              <>
                <Loader2 className="loading" />
                Processing...
              </>
            ) : (
              <>
                <Volume2 size={20} />
                Generate Audio ({getCurrentVoiceInfo().name})
              </>
            )}
          </button>
          
          {(audioResults.length > 0 || isLoading || canResume) && (
            <button
              onClick={resetAll}
              disabled={isLoading}
              className="button button-secondary"
            >
              <RotateCcw size={20} />
              Reset
            </button>
          )}
        </div>

        {/* API Key Usage Stats */}
        {stats.length > 0 && (
          <div style={{ 
            marginBottom: '1.5rem',
            padding: '1rem',
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius)',
            fontSize: '0.875rem'
          }}>
            <strong>API Key Usage:</strong>
            <div style={{ marginTop: '0.5rem' }}>
              {stats.map((stat, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{stat.key}</span>
                  <span>{stat.usage} requests</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audio Results */}
        {audioResults.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            {/* Merged Audio Player */}
            {mergedAudioUrl && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">🎵 Gabungan Semua Audio</label>
                <audio
                  ref={audioRef}
                  src={mergedAudioUrl}
                  controls
                  className="audio-player"
                />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    onClick={handleDownloadMerged}
                    className="button button-primary"
                    style={{ flex: 1 }}
                  >
                    <DownloadIcon size={20} />
                    Download Gabungan
                  </button>
                  <button
                    onClick={handleDownloadAllChunks}
                    className="button button-secondary"
                    style={{ flex: 1 }}
                  >
                    <DownloadIcon size={20} />
                    Download Semua Chunk
                  </button>
                </div>
              </div>
            )}

            {/* Individual Chunks */}
            {audioResults.length > 1 && (
              <div>
                <label className="label">🔊 Audio Chunks ({audioResults.length} bagian)</label>
                <div style={{ 
                  maxHeight: '300px', 
                  overflowY: 'auto',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                  marginTop: '0.5rem'
                }}>
                  {audioResults.map((result, index) => (
                    <div key={index} style={{ 
                      padding: '1rem',
                      borderBottom: index < audioResults.length - 1 ? '1px solid var(--color-border)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <button
                        onClick={() => handlePlayChunk(index)}
                        className="button button-secondary"
                        style={{ padding: '0.5rem', minWidth: '40px' }}
                      >
                        {currentPlayingIndex === index ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <div style={{ flex: 1, fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                          Chunk {index + 1} ({result.text.length} karakter)
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)' }}>
                          {result.text.substring(0, 100)}{result.text.length > 100 ? '...' : ''}
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          API: {result.apiKeyUsed}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div style={{ 
          marginTop: '2rem', 
          padding: '1.5rem', 
          background: 'var(--color-bg-secondary)', 
          borderRadius: 'var(--radius)',
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)'
        }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>✨ Fitur Baru & Cara Penggunaan:</h3>
          <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
            <li><strong>Multi API Key:</strong> Masukkan beberapa API key (satu per baris) untuk round robin</li>
            <li><strong>Unlimited Text:</strong> Upload file .txt atau ketik langsung tanpa batas karakter</li>
            <li><strong>Auto Chunking:</strong> Text dipecah otomatis per 500 karakter</li>
            <li><strong>{VOICE_CONFIGS.length} Voice Models:</strong> Pilih dari berbagai karakteristik suara yang tersedia</li>
            <li><strong>Smart Processing:</strong> Setiap chunk diproses bergantian dengan API key berbeda</li>
            <li><strong>Resume Support:</strong> Jika error di tengah, lanjutkan dari chunk yang gagal tanpa mengulang</li>
            <li><strong>Multiple Downloads:</strong> Download gabungan atau semua chunk terpisah</li>
            <li><strong>Progress Tracking:</strong> Monitor real-time progress dan API usage</li>
          </ol>
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius)' }}>
            <strong>💡 Tips Pro:</strong>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Gunakan 3-5 API key untuk performa optimal</li>
              <li>Text dipecah berdasarkan kalimat untuk hasil natural</li>
              <li>File .txt hingga 10MB didukung</li>
              <li>Audio chunks dapat diputar individual sebelum download</li>
              <li>Voice selection tersedia dalam 6 kategori karakteristik</li>
              <li><strong>Fitur Resume:</strong> Jika ada error, gunakan tombol Resume untuk melanjutkan</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App; 