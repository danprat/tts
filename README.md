# 🎵 Multi-Process TTS App

> **Advanced Text-to-Speech aplikasi dengan multi-process parallel processing menggunakan Google Gemini API**

[![React](https://img.shields.io/badge/React-18.0-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-4.5-green.svg)](https://vitejs.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-red.svg)](https://opensource.org/licenses/MIT)

## 🚀 **Key Features**

### ⚡ **Multi-Process Engine**
- **Parallel Processing** dengan distribusi ke multiple API keys
- **Custom Concurrency Settings** - Atur berapa chunk diproses bersamaan
- **Auto Load Balancing** - Distribusi optimal berdasarkan API key health
- **Rate Limiting Protection** dengan auto-recovery mechanism

### 🎛️ **Custom Settings**
- **📏 Chunk Size:** 200-2000 characters per potongan
- **⚡ Max Concurrency:** Distribusi parallel ke multiple API keys (bukan per API key!)
- **🎯 Quick Presets:** Safe, Balanced, Fast, Max
- **📊 Real-time Preview:** Estimasi chunks, batches, dan waktu processing

### 🔧 **Advanced Monitoring**
- **Health Monitoring** untuk setiap API key dengan status tracking
- **Session Management** dengan auto-resume untuk failed chunks
- **Real-time Dashboard** dengan progress tracking dan logs
- **Error Recovery** dengan smart retry mechanisms

### 🎵 **Audio Features**
- **50+ Voice Models** dari Google Gemini dengan kategorisasi
- **Auto Audio Merge** untuk hasil final yang seamless
- **Individual Chunk Download** untuk debugging dan fine-tuning
- **Audio Preview** dengan play/pause controls

### 📱 **User Experience**
- **Responsive Design** yang mobile-friendly
- **Navigation Menu** dengan tab switching
- **File Upload Support** untuk .txt files
- **LocalStorage Integration** untuk API key persistence

## 🛠️ **Installation & Setup**

### Prerequisites
- Node.js 16+ dan npm/pnpm
- Google Gemini API Keys (gratis di [Google AI Studio](https://aistudio.google.com/app/apikey))

### Quick Start
```bash
# Clone repository
git clone https://github.com/danprat/tts.git
cd tts

# Install dependencies (recommended: pnpm untuk performance)
pnpm install
# atau: npm install

# Start development server
pnpm dev
# atau: npm run dev

# Open browser
open http://localhost:3001
```

### Production Build
```bash
# Build untuk production
pnpm build

# Preview production build
pnpm preview
```

## 🔑 **API Keys Setup**

1. **Dapatkan API Keys** dari [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Setup Multiple Keys** untuk parallel processing:
   ```
   AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
   AIzaSyZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
   ```
3. **Auto-Save** - Keys akan tersimpan di localStorage untuk session berikutnya

## 💡 **How Multi-Process Works**

```
Text Input (1000 chars)
       ↓
Chunking (500 chars each)
       ↓
┌─────────────────────────────────┐
│  Chunk 1  │  Chunk 2  │  Chunk 3  │
│  API Key 1│  API Key 2│  API Key 3│
└─────────────────────────────────┘
       ↓ (Parallel Processing)
┌─────────────────────────────────┐
│ Audio 1 │ Audio 2 │ Audio 3  │
└─────────────────────────────────┘
       ↓
   Auto Merge
       ↓
  Final Audio.wav
```

**Key Concepts:**
- **Max Concurrency 4x** = 4 chunks processed parallel dengan 4 API keys berbeda
- **Bukan** 4 requests per API key - tapi distribusi 1 request per API key
- **Load Balancing** otomatis berdasarkan API key health dan usage

## 🎯 **Custom Settings Explained**

### 📏 **Chunk Size (200-2000 chars)**
```
Small (300):  Stabil, lambat  - Untuk API keys yang sering timeout
Medium (500): Balance optimal - Setting default yang recommended  
Large (800):  Cepat, risky    - Untuk API keys yang very stable
XL (1200):    Maximum speed   - High risk rate limiting
```

### ⚡ **Max Concurrency (1-10x)**
```
2x = 2 chunks parallel → 2 API keys different
4x = 4 chunks parallel → 4 API keys different  
6x = 6 chunks parallel → 6 API keys different
Max dibatasi oleh jumlah API keys yang healthy
```

## 📊 **Performance Benchmarks**

| Text Length | Chunk Size | Concurrency | API Keys | Est. Time | Actual Performance |
|-------------|------------|-------------|----------|-----------|-------------------|
| 1000 chars  | 500        | 2x          | 2 keys   | ~6s       | ⚡ Fast           |
| 2000 chars  | 500        | 4x          | 4 keys   | ~9s       | ⚡⚡ Very Fast      |
| 5000 chars  | 800        | 6x          | 6 keys   | ~15s      | ⚡⚡⚡ Lightning     |

## 🔧 **Project Structure**

```
src/
├── components/
│   └── MultiProcessMonitor.jsx    # Real-time monitoring dashboard
├── hooks/
│   ├── useMultiProcessTTS.js       # Main TTS hook dengan state management  
│   └── useLocalStorage.js          # Persistent storage utilities
├── services/
│   ├── geminiService.js            # Google Gemini API integration
│   └── multiProcessService.js      # Multi-process engine core
├── AppMultiProcess.jsx             # Main application component
├── index.css                       # Comprehensive styling
└── main.jsx                        # Application entry point
```

## 🚨 **Troubleshooting**

### Common Issues & Solutions

**❌ "Semua API keys bermasalah"**
```
✅ Check API keys validity di Google AI Studio
✅ Tunggu 5-10 menit untuk rate limit recovery
✅ Gunakan preset "Safe" untuk API keys yang unstable
```

**❌ "Rate Limited"** 
```
✅ Reduce Max Concurrency ke 2x atau 3x
✅ Increase Chunk Size untuk fewer requests
✅ Add more API keys untuk load distribution
```

**❌ "Audio tidak merged"**
```
✅ Check browser console untuk merge errors
✅ Download individual chunks sebagai workaround
✅ Retry dengan chunk size yang lebih kecil
```

## 🤝 **Contributing**

1. Fork repository ini
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push ke branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📝 **Development Notes**

### Tech Stack
- **Frontend:** React 18 + Vite 4 + Lucide React Icons
- **Styling:** Pure CSS dengan CSS Variables dan Responsive Design
- **State Management:** React Hooks + Custom Hooks pattern
- **Storage:** LocalStorage untuk API keys persistence
- **Audio:** Web Audio API dengan Blob manipulation

### Performance Optimizations
- **Lazy Loading** untuk components dan audio processing
- **Memory Management** dengan proper cleanup untuk audio URLs
- **Efficient Re-renders** dengan optimized state updates
- **Bundle Optimization** dengan Vite tree-shaking

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Google Gemini** untuk amazing Text-to-Speech API
- **React Team** untuk excellent development experience  
- **Vite Team** untuk lightning-fast development tools
- **Lucide** untuk beautiful and consistent icons

---

**⭐ Star repo ini jika helpful! Contributions welcome! 🚀**

**🔗 Links:**
- [Live Demo](https://your-demo-url.com) (coming soon)
- [Google AI Studio](https://aistudio.google.com/app/apikey) - Get your API keys
- [Issues](https://github.com/danprat/tts/issues) - Report bugs atau request features
- [Discussions](https://github.com/danprat/tts/discussions) - Community support 