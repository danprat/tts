import axios from 'axios';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL_NAME = 'gemini-2.5-flash-preview-tts';

/**
 * Konfigurasi suara yang tersedia di Gemini TTS
 * Dikelompokkan berdasarkan karakteristik untuk kemudahan pemilihan
 */
export const VOICE_CONFIGS = [
  // Firm & Professional
  { name: 'Kore', category: 'Firm & Professional', description: 'Firm' },
  { name: 'Orus', category: 'Firm & Professional', description: 'Firm' },
  { name: 'Alnilam', category: 'Firm & Professional', description: 'Firm' },
  
  // Bright & Clear
  { name: 'Zephyr', category: 'Bright & Clear', description: 'Bright' },
  { name: 'Autonoe', category: 'Bright & Clear', description: 'Bright' },
  { name: 'Iapetus', category: 'Bright & Clear', description: 'Clear' },
  { name: 'Erinome', category: 'Bright & Clear', description: 'Clear' },
  
  // Upbeat & Energetic
  { name: 'Puck', category: 'Upbeat & Energetic', description: 'Upbeat' },
  { name: 'Fenrir', category: 'Upbeat & Energetic', description: 'Excitable' },
  { name: 'Laomedeia', category: 'Upbeat & Energetic', description: 'Upbeat' },
  { name: 'Sadachbia', category: 'Upbeat & Energetic', description: 'Lively' },
  
  // Easy-going & Casual
  { name: 'Callirrhoe', category: 'Easy-going & Casual', description: 'Easy-going' },
  { name: 'Umbriel', category: 'Easy-going & Casual', description: 'Easy-going' },
  { name: 'Zubenelgenubi', category: 'Easy-going & Casual', description: 'Casual' },
  { name: 'Achird', category: 'Easy-going & Casual', description: 'Friendly' },
  
  // Smooth & Gentle
  { name: 'Algieba', category: 'Smooth & Gentle', description: 'Smooth' },
  { name: 'Despina', category: 'Smooth & Gentle', description: 'Smooth' },
  { name: 'Achernar', category: 'Smooth & Gentle', description: 'Soft' },
  { name: 'Vindemiatrix', category: 'Smooth & Gentle', description: 'Gentle' },
  { name: 'Sulafat', category: 'Smooth & Gentle', description: 'Warm' },
  
  // Informative & Knowledgeable
  { name: 'Charon', category: 'Informative & Knowledgeable', description: 'Informative' },
  { name: 'Rasalgethi', category: 'Informative & Knowledgeable', description: 'Informative' },
  { name: 'Sadaltager', category: 'Informative & Knowledgeable', description: 'Knowledgeable' },
  
  // Special Characters
  { name: 'Leda', category: 'Special Characters', description: 'Youthful' },
  { name: 'Aoede', category: 'Special Characters', description: 'Breezy' },
  { name: 'Enceladus', category: 'Special Characters', description: 'Breathy' },
  { name: 'Algenib', category: 'Special Characters', description: 'Gravelly' },
  { name: 'Schedar', category: 'Special Characters', description: 'Even' },
  { name: 'Gacrux', category: 'Special Characters', description: 'Mature' },
  { name: 'Pulcherrima', category: 'Special Characters', description: 'Forward' }
];

/**
 * Get voices grouped by category
 */
export const getVoicesByCategory = () => {
  const grouped = {};
  VOICE_CONFIGS.forEach(voice => {
    if (!grouped[voice.category]) {
      grouped[voice.category] = [];
    }
    grouped[voice.category].push(voice);
  });
  return grouped;
};

/**
 * Konversi base64 audio data ke audio blob
 */
const konversiBase64KeAudio = (base64Data) => {
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return new Blob([bytes], { type: 'audio/pcm' });
  } catch (error) {
    throw new Error('Gagal mengkonversi audio data');
  }
};

/**
 * Konversi PCM ke WAV format
 */
const konversiPcmKeWav = (pcmData, sampleRate = 24000, channels = 1) => {
  const arrayBuffer = pcmData.arrayBuffer ? 
    pcmData.arrayBuffer() : 
    Promise.resolve(pcmData);
    
  return arrayBuffer.then(buffer => {
    const pcmArray = new Int16Array(buffer);
    const wavBuffer = new ArrayBuffer(44 + pcmArray.length * 2);
    const view = new DataView(wavBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmArray.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, pcmArray.length * 2, true);
    
    // Copy PCM data
    const wavArray = new Int16Array(wavBuffer, 44);
    wavArray.set(pcmArray);
    
    return new Blob([wavBuffer], { type: 'audio/wav' });
  });
};

/**
 * Chunking text menjadi bagian-bagian kecil dengan custom max length
 */
export const chunkText = (text, maxLength = 500) => {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    const potentialChunk = currentChunk 
      ? `${currentChunk}. ${trimmedSentence}` 
      : trimmedSentence;

    if (potentialChunk.length <= maxLength) {
      currentChunk = potentialChunk;
    } else {
      // Jika current chunk ada, simpan dulu
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = trimmedSentence;
      } else {
        // Jika sentence terlalu panjang, potong secara paksa
        const words = trimmedSentence.split(' ');
        let wordChunk = '';
        
        for (const word of words) {
          const potentialWordChunk = wordChunk 
            ? `${wordChunk} ${word}` 
            : word;

          if (potentialWordChunk.length <= maxLength) {
            wordChunk = potentialWordChunk;
          } else {
            if (wordChunk) {
              chunks.push(wordChunk);
              wordChunk = word;
            } else {
              // Kata tunggal terlalu panjang, potong paksa
              chunks.push(word.substring(0, maxLength));
              wordChunk = word.substring(maxLength);
            }
          }
        }
        
        if (wordChunk) {
          currentChunk = wordChunk;
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
};

/**
 * Default configuration untuk text chunking
 */
export const DEFAULT_CHUNK_SIZE = 500;
export const MIN_CHUNK_SIZE = 100;
export const MAX_CHUNK_SIZE = 2000;

/**
 * Generate audio menggunakan Gemini TTS API untuk single chunk
 */
export const generateSingleAudio = async (text, voiceName = 'Kore', apiKey) => {
  const requestBody = {
    contents: [{
      parts: [{
        text: text.trim()
      }]
    }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName
          }
        }
      }
    },
    model: MODEL_NAME
  };
  
  try {
    const response = await axios.post(
      `${GEMINI_API_BASE}/models/${MODEL_NAME}:generateContent`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          key: apiKey
        },
        timeout: 60000 // Tingkatkan ke 60 detik timeout
      }
    );
    
    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
      throw new Error('Format response tidak valid dari Gemini API');
    }
    
    const audioData = response.data.candidates[0].content.parts[0].inlineData.data;
    const pcmBlob = konversiBase64KeAudio(audioData);
    const wavBlob = await konversiPcmKeWav(pcmBlob);
    
    return {
      audioBlob: wavBlob,
      audioUrl: URL.createObjectURL(wavBlob)
    };
    
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || 'Unknown error';
      
      switch (status) {
        case 400:
          throw new Error(`Request tidak valid: ${message}`);
        case 401:
          throw new Error('API Key tidak valid atau expired');
        case 403:
          throw new Error('API Key kena limit quota atau akses ditolak');
        case 429:
          throw new Error('Rate limit exceeded - API Key kena limit request');
        case 500:
          throw new Error('Server error dari Gemini API');
        case 503:
          throw new Error('Service unavailable - Server Gemini sedang overload');
        default:
          throw new Error(`Error ${status}: ${message}`);
      }
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error('Request timeout - Koneksi ke Gemini API timeout');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Network error - Tidak bisa connect ke Gemini API');
    } else {
      throw new Error(`Gagal generate audio: ${error.message}`);
    }
  }
};

/**
 * Generate audio dengan chunking dan round robin API keys
 * Support resume dari chunk yang error
 */
export const generateAudio = async (text, voiceName = 'Kore', onProgress = null, resumeFromChunk = 0, existingResults = []) => {
  if (!apiKeyManager.hasValidKeys()) {
    throw new Error('Tidak ada API Key yang valid. Silakan masukkan API keys terlebih dahulu.');
  }
  
  if (!text || text.trim().length === 0) {
    throw new Error('Text tidak boleh kosong');
  }

  const chunks = chunkText(text.trim(), 500);
  let audioResults = [...existingResults]; // Copy existing results untuk resume
  
  try {
    for (let i = resumeFromChunk; i < chunks.length; i++) {
      const chunk = chunks[i];
      const apiKey = apiKeyManager.getNextApiKey();
      
      // Progress callback
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: chunks.length,
          currentText: chunk.substring(0, 50) + (chunk.length > 50 ? '...' : ''),
          percentage: Math.round(((i + 1) / chunks.length) * 100),
          isResuming: resumeFromChunk > 0,
          resumeFromChunk: resumeFromChunk + 1
        });
      }

      const result = await generateSingleAudio(chunk, voiceName, apiKey);
      audioResults.push({
        ...result,
        text: chunk,
        index: i,
        apiKeyUsed: apiKey.substring(0, 10) + '...'
      });

      // Delay antar request untuk menghindari rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return {
      audioResults,
      chunks,
      totalChunks: chunks.length,
      stats: apiKeyManager.getStats(),
      completed: true
    };

  } catch (error) {
    const failedChunkIndex = audioResults.length;
    return {
      audioResults,
      chunks,
      totalChunks: chunks.length,
      stats: apiKeyManager.getStats(),
      completed: false,
      failedChunkIndex,
      error: `Error pada chunk ${failedChunkIndex + 1}: ${error.message}`,
      canResume: true
    };
  }
};

/**
 * Round Robin API Key Manager
 */
class ApiKeyManager {
  constructor() {
    this.apiKeys = [];
    this.currentIndex = 0;
    this.usageCount = new Map();
  }

  setApiKeys(keys) {
    this.apiKeys = keys.filter(key => validasiApiKey(key));
    this.currentIndex = 0;
    this.usageCount.clear();
    this.apiKeys.forEach(key => this.usageCount.set(key, 0));
  }

  getNextApiKey() {
    if (this.apiKeys.length === 0) {
      throw new Error('Tidak ada API key yang valid');
    }

    const key = this.apiKeys[this.currentIndex];
    this.usageCount.set(key, (this.usageCount.get(key) || 0) + 1);
    this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
    
    return key;
  }

  getStats() {
    return Array.from(this.usageCount.entries()).map(([key, count]) => ({
      key: key.substring(0, 10) + '...', // Hanya tampilkan sebagian untuk keamanan
      usage: count
    }));
  }

  hasValidKeys() {
    return this.apiKeys.length > 0;
  }
}

export const apiKeyManager = new ApiKeyManager();

/**
 * Validasi API Key format
 */
export const validasiApiKey = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // Basic validation untuk format API key Google
  return apiKey.length > 20 && apiKey.includes('AI');
};

/**
 * Validasi multiple API keys
 */
export const validasiMultipleApiKeys = (apiKeysText) => {
  if (!apiKeysText || typeof apiKeysText !== 'string') {
    return [];
  }

  const keys = apiKeysText
    .split('\n')
    .map(key => key.trim())
    .filter(key => key.length > 0);

  return keys.filter(validasiApiKey);
};

/**
 * Merge multiple audio blobs menjadi satu file
 */
export const mergeAudioBlobs = async (audioBlobs) => {
  if (audioBlobs.length === 0) {
    throw new Error('Tidak ada audio untuk di-merge');
  }

  if (audioBlobs.length === 1) {
    return audioBlobs[0];
  }

  try {
    // Convert blobs ke array buffers
    const arrayBuffers = await Promise.all(
      audioBlobs.map(blob => blob.arrayBuffer())
    );

    // Parse WAV headers dan extract PCM data
    const pcmDataArrays = arrayBuffers.map(buffer => {
      const view = new DataView(buffer);
      const dataOffset = 44; // Standard WAV header size
      const dataSize = view.getUint32(40, true); // Data chunk size
      return new Int16Array(buffer, dataOffset, dataSize / 2);
    });

    // Calculate total length
    const totalLength = pcmDataArrays.reduce((sum, arr) => sum + arr.length, 0);
    
    // Merge PCM data
    const mergedPcm = new Int16Array(totalLength);
    let offset = 0;
    
    for (const pcmData of pcmDataArrays) {
      mergedPcm.set(pcmData, offset);
      offset += pcmData.length;
    }

    // Create new WAV file
    const wavBuffer = new ArrayBuffer(44 + mergedPcm.length * 2);
    const view = new DataView(wavBuffer);
    
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    // WAV header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + mergedPcm.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, 24000, true); // sample rate
    view.setUint32(28, 48000, true); // byte rate
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, mergedPcm.length * 2, true);
    
    // Copy merged PCM data
    const wavArray = new Int16Array(wavBuffer, 44);
    wavArray.set(mergedPcm);
    
    return new Blob([wavBuffer], { type: 'audio/wav' });
    
  } catch (error) {
    throw new Error(`Gagal merge audio: ${error.message}`);
  }
};

/**
 * Download audio file
 */
export const downloadAudio = (audioBlob, filename = 'audio-gemini.wav') => {
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Download semua audio chunks sebagai file terpisah
 */
export const downloadAllChunks = (audioResults, baseFilename = 'gemini-tts') => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  
  audioResults.forEach((result, index) => {
    const filename = `${baseFilename}-chunk-${String(index + 1).padStart(2, '0')}-${timestamp}.wav`;
    downloadAudio(result.audioBlob, filename);
  });
};

/**
 * Read file content sebagai text
 */
export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    
    reader.onerror = () => {
      reject(new Error('Gagal membaca file'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
};

/**
 * Validasi file upload
 */
export const validateTextFile = (file) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['text/plain', 'text/txt', 'application/txt'];
  
  if (file.size > maxSize) {
    throw new Error('File terlalu besar. Maksimal 10MB.');
  }
  
  if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.txt')) {
    throw new Error('Hanya file .txt yang diizinkan.');
  }
  
  return true;
}; 