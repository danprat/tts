import { useState } from 'react';
import { BarChart3, Key, Activity, FileText, Trash2, Play, RotateCcw, Clock, Zap } from 'lucide-react';

const MultiProcessMonitor = ({ 
  progress, 
  apiKeyStats, 
  resumableSessions, 
  processingLogs,
  currentSession,
  onResumeSession,
  onRetrySession,
  onDeleteSession,
  onClearLogs,
  isProcessing
}) => {
  const [activeTab, setActiveTab] = useState('progress');

  const formatDuration = (startTime, endTime = null) => {
    const end = endTime || Date.now();
    const duration = Math.floor((end - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCooldownTime = (rateLimitTime) => {
    if (!rateLimitTime) return null;
    
    const now = Date.now();
    if (now >= rateLimitTime) return null;
    
    const remainingMs = rateLimitTime - now;
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    
    return `${remainingMinutes} menit`;
  };

  const getLogTypeClass = (type) => {
    switch (type) {
      case 'success': return 'log-success';
      case 'warning': return 'log-warning';
      case 'error': return 'log-error';
      case 'processing': return 'log-processing';
      default: return 'log-info';
    }
  };

  const tabs = [
    { id: 'progress', label: 'Progress', icon: BarChart3, badge: isProcessing ? 'Active' : null },
    { id: 'apikeys', label: 'API Keys', icon: Key, badge: apiKeyStats.filter(k => k.health === 'healthy').length },
    { id: 'sessions', label: 'Sessions', icon: Activity, badge: resumableSessions.length || null },
    { id: 'logs', label: 'Logs', icon: FileText, badge: processingLogs.length || null }
  ];

  // Debug log untuk sessions
  if (activeTab === 'sessions' && process.env.NODE_ENV === 'development') {
    console.log('Sessions tab data:', resumableSessions);
  }

  return (
    <div className="monitor-container">
      {/* Header */}
      <div className="monitor-header">
        <h3>
          <Zap size={20} />
          Multi-Process Monitor
        </h3>
        {isProcessing && (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <span>Processing...</span>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="monitor-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`monitor-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
            {tab.badge && (
              <div className="tab-badge">
                {tab.badge}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="monitor-content">
        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="tab-section">
            {currentSession && (
              <div className="current-session-card">
                <h4>🎯 Current Session</h4>
                <div className="session-info">
                  <div className="info-item">
                    <span className="info-label">Session ID</span>
                    <span className="info-value session-id">{currentSession.id}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Total Chunks</span>
                    <span className="info-value">{currentSession.totalChunks}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">API Keys</span>
                    <span className="info-value">{currentSession.keysAvailable}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Status</span>
                    <span className={`info-value status-badge ${currentSession.completed ? 'completed' : 'processing'}`}>
                      {currentSession.completed ? '✅ Completed' : '🔄 Processing'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="progress-section">
              <div className="progress-header">
                <span className="progress-text">
                  Progress: {progress.current}/{progress.total} chunks
                </span>
                <span className="progress-percentage">{progress.percentage}%</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar"
                  style={{ width: `${progress.percentage}%` }}
                >
                  <div className="progress-shimmer"></div>
                </div>
              </div>
            </div>

            {/* Batch Info */}
            {progress.batchInfo && (
              <div className="batch-info-card">
                <h5>📦 Current Batch</h5>
                <div className="batch-stats">
                  <div className="batch-stat">
                    <span className="stat-label">Range</span>
                    <span className="stat-value">
                      {progress.batchInfo.start + 1} - {progress.batchInfo.end}
                    </span>
                  </div>
                  <div className="batch-stat">
                    <span className="stat-label">Size</span>
                    <span className="stat-value">{progress.batchInfo.size} chunks</span>
                  </div>
                  <div className="batch-stat">
                    <span className="stat-label">Concurrency</span>
                    <span className="stat-value">{progress.maxConcurrency}x</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'apikeys' && (
          <div className="tab-section">
            <div className="section-title">
              <h4>🔑 API Keys Status</h4>
              <span className="healthy-count">
                {apiKeyStats.filter(key => key.health === 'healthy').length} healthy keys
              </span>
            </div>
            
            <div className="api-keys-list">
              {apiKeyStats.map((keyInfo, index) => (
                <div key={`api-key-${keyInfo.key}-${index}`} className={`api-key-item ${keyInfo.health}`}>
                  <div className="api-key-main">
                    <span className="api-key-id">{keyInfo.key}</span>
                    <div className="api-key-badges">
                      <span className={`health-badge ${keyInfo.health}`}>
                        {keyInfo.health === 'healthy' && '✅'}
                        {keyInfo.health === 'warning' && '⚠️'}
                        {keyInfo.health === 'error' && '❌'}
                        {keyInfo.health}
                      </span>
                      {keyInfo.isRateLimited && (
                        <span className="rate-limit-badge">
                          🕒 Rate Limited
                          {formatCooldownTime(keyInfo.rateLimitTime) && 
                            ` (${formatCooldownTime(keyInfo.rateLimitTime)})`
                          }
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="api-key-stats">
                    <div className="stat-item">
                      <span className="stat-name">Usage</span>
                      <span className="stat-number">{keyInfo.usage}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-name">Errors</span>
                      <span className="stat-number">{keyInfo.errors}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-name">Last Used</span>
                      <span className="stat-number">
                        {keyInfo.lastUsed > 0 ? new Date(keyInfo.lastUsed).toLocaleTimeString() : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {apiKeyStats.length === 0 && (
              <div className="empty-state">
                <Key size={48} />
                <h4>No API Keys</h4>
                <p>Setup API keys first to see their status here</p>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="tab-section">
            <div className="section-title">
              <h4>📋 Resumable Sessions</h4>
              {resumableSessions.length > 0 && (
                <span className="session-count">{resumableSessions.length} sessions</span>
              )}
            </div>

            <div className="sessions-list">
              {resumableSessions.map(session => (
                <div key={session.id} className="session-item">
                  <div className="session-header">
                    <div className="session-main">
                      <span className="session-id">{session.id}</span>
                      <span className={`session-status ${session.status}`}>
                        {session.status === 'partial' && '⚠️ Partial'}
                        {session.status === 'error' && '❌ Error'}
                        {session.status === 'completed' && '✅ Completed'}
                      </span>
                    </div>
                    <div className="session-time">
                      <Clock size={14} />
                      {formatDuration(session.startTime || session.timestamp, session.endTime)}
                    </div>
                  </div>
                  
                  <div className="session-details">
                    <div className="session-stats">
                      <div className="session-stat">
                        <span>Total</span>
                        <span>{session.totalChunks || 0}</span>
                      </div>
                      <div className="session-stat">
                        <span>Completed</span>
                        <span>{Array.isArray(session.completedChunks) ? session.completedChunks.length : (session.completedChunks || 0)}</span>
                      </div>
                      <div className="session-stat">
                        <span>Failed</span>
                        <span>{Array.isArray(session.failedChunks) ? session.failedChunks.length : (session.failedChunks || 0)}</span>
                      </div>
                      <div className="session-stat">
                        <span>Progress</span>
                        <span>{session.progress || 0}%</span>
                      </div>
                    </div>
                    
                    {/* Audio Cache Status */}
                    <div className="session-cache-status">
                      <span className="cache-label">Audio Cache:</span>
                      <span className={`cache-status ${session.hasAudioCache ? 'available' : 'missing'}`}>
                        {session.hasAudioCache ? '✅ Available' : '❌ Missing'}
                      </span>
                      {!session.hasAudioCache && (
                        <div className="cache-warning">
                          ⚠️ Resume akan regenerate semua chunk dari awal
                        </div>
                      )}
                    </div>
                    
                    {/* Session Error */}
                    {session.error && (
                      <div className="session-error">
                        <strong>Error:</strong> {session.error}
                      </div>
                    )}
                    
                    <div className="session-actions">
                      {session.status !== 'completed' && (
                        <>
                          <button
                            onClick={() => onResumeSession(session.id)}
                            className="session-btn resume-btn"
                            disabled={isProcessing}
                          >
                            <Play size={14} />
                            Resume
                          </button>
                          <button
                            onClick={() => onRetrySession(session.id)}
                            className="session-btn retry-btn"
                            disabled={isProcessing}
                          >
                            <RotateCcw size={14} />
                            Retry Failed
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onDeleteSession(session.id)}
                        className="session-btn delete-btn"
                        disabled={isProcessing}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {resumableSessions.length === 0 && (
              <div className="empty-state">
                <Activity size={48} />
                <h4>No Sessions</h4>
                <p>Process some audio to see resumable sessions here</p>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="tab-section">
            <div className="section-title">
              <h4>📝 Processing Logs</h4>
              <button
                onClick={onClearLogs}
                className="clear-logs-btn"
                disabled={processingLogs.length === 0}
              >
                <Trash2 size={14} />
                Clear Logs
              </button>
            </div>

            <div className="logs-container">
              {processingLogs.map(log => (
                <div key={log.id} className={`log-entry ${getLogTypeClass(log.type)}`}>
                  <span className="log-timestamp">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </div>

            {processingLogs.length === 0 && (
              <div className="empty-state">
                <FileText size={48} />
                <h4>No Logs</h4>
                <p>Processing logs will appear here during operation</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiProcessMonitor; 