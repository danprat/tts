import { validasiApiKey, VOICE_CONFIGS } from '../services/geminiService';

/**
 * Test basic validasi tanpa perlu API call
 */
export const testValidasiLokal = () => {
  console.log('🧪 Testing validasi lokal...');
  
  // Test validasi API key
  const testCases = [
    { key: '', expected: false, desc: 'Empty string' },
    { key: 'invalid', expected: false, desc: 'Too short' },
    { key: 'AIzaSyDemoKeyForTesting123456789', expected: true, desc: 'Valid format' },
    { key: null, expected: false, desc: 'Null value' },
    { key: undefined, expected: false, desc: 'Undefined value' }
  ];
  
  testCases.forEach(test => {
    const result = validasiApiKey(test.key);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${status} ${test.desc}: ${result}`);
  });
  
  // Test voice configs
  console.log(`\n🎵 Voice configurations loaded: ${VOICE_CONFIGS.length} voices`);
  VOICE_CONFIGS.forEach(voice => {
    console.log(`- ${voice.name}: ${voice.description}`);
  });
  
  return {
    validasi: testCases.every(test => validasiApiKey(test.key) === test.expected),
    voiceCount: VOICE_CONFIGS.length
  };
};

/**
 * Test koneksi ke Gemini API (dummy request)
 */
export const testKoneksiApi = async (apiKey) => {
  if (!validasiApiKey(apiKey)) {
    throw new Error('API Key tidak valid untuk testing');
  }
  
  console.log('🌐 Testing koneksi ke Gemini API...');
  
  try {
    // Test dengan text yang sangat pendek untuk menghemat quota
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Hi'
            }]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Kore"
                }
              }
            }
          }
        })
      }
    );
    
    if (response.ok) {
      console.log('✅ Koneksi API berhasil');
      return { success: true, status: response.status };
    } else {
      console.log(`❌ API Error: ${response.status}`);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Test utility lengkap
 */
export const runAllTests = async (apiKey = null) => {
  console.log('🚀 Running comprehensive tests...\n');
  
  const lokalTest = testValidasiLokal();
  
  if (apiKey && validasiApiKey(apiKey)) {
    console.log('\n🔑 API Key provided, testing connection...');
    const apiTest = await testKoneksiApi(apiKey);
    return { lokal: lokalTest, api: apiTest };
  } else {
    console.log('\n⚠️ No valid API key provided, skipping API tests');
    return { lokal: lokalTest, api: null };
  }
}; 