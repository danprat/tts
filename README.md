# 🎤 Gemini TTS - Text to Speech App

Aplikasi Text-to-Speech modern menggunakan Google Gemini AI dengan antarmuka yang bersih dan responsif.

## ✨ Fitur

- 🎯 **Konversi Text ke Audio** - Ubah text menjadi suara natural menggunakan Gemini AI
- 🎵 **4 Pilihan Suara** - Kore, Charon, Aoede, dan Fenrir dengan karakteristik berbeda
- 🔑 **Multi API Key Round Robin** - Gunakan beberapa API key secara bergantian
- 📄 **Unlimited Text & File Upload** - Support text panjang dan upload file .txt hingga 10MB
- ✂️ **Smart Chunking** - Otomatis pecah text per 500 karakter berdasarkan kalimat
- 🔄 **Resume Support** - Lanjutkan processing dari chunk yang error tanpa mengulang dari awal
- 📊 **Real-time Progress** - Monitor progress dan API key usage
- 🎧 **Multiple Audio Options** - Download gabungan atau file terpisah per chunk
- 📱 **Responsive Design** - Tampilan optimal di desktop dan mobile
- 🔊 **Audio Player** - Putar audio langsung di browser dengan kontrol individual
- 💾 **Download Audio** - Simpan audio dalam format WAV
- ⚡ **Real-time Processing** - Generate audio dengan cepat
- 🛡️ **Error Handling** - Pesan error yang jelas dan informatif

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Menggunakan pnpm (recommended)
pnpm install

# Atau menggunakan npm
npm install

# Atau menggunakan yarn
yarn install
```

### 2. Dapatkan API Key

1. Buka [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Login dengan akun Google
3. Buat API key baru
4. Copy API key untuk digunakan di aplikasi

### 3. Jalankan Aplikasi

```bash
# Development mode
pnpm dev

# Atau
npm run dev
```

Aplikasi akan berjalan di `http://localhost:3000`

## 🎛️ Cara Penggunaan

### Persiapan
1. **Setup Multi API Key** - Masukkan beberapa API key Gemini (satu per baris) untuk performa optimal
2. **Input Text** - Ketik langsung atau upload file .txt (unlimited length)
3. **Pilih Suara** - Klik salah satu dari 4 pilihan suara yang tersedia

### Processing
4. **Generate Audio** - Klik "Generate Audio" untuk memulai processing
5. **Monitor Progress** - Lihat real-time progress dan API key usage
6. **Review Chunks** - Text otomatis dipecah menjadi chunk 500 karakter

### Output
7. **Play Audio** - Dengarkan gabungan lengkap atau individual chunks
8. **Download Options** - Download file gabungan atau semua chunk terpisah
9. **Manage Results** - Reset untuk memulai project baru

## 🎵 Jenis Suara

| Suara | Karakteristik |
|-------|---------------|
| **Kore** | Suara natural dan jelas (default) |
| **Charon** | Suara dalam dan kuat |
| **Aoede** | Suara melodis dan lembut |
| **Fenrir** | Suara tegas dan berkarakter |

## 🛠️ Tech Stack

- **React 18** - UI framework modern
- **Vite** - Build tool yang cepat
- **Axios** - HTTP client untuk API calls
- **Lucide React** - Icon library
- **Vanilla CSS** - Custom styling dengan CSS variables

## 📁 Struktur Project

```
gemini-tts-app/
├── src/
│   ├── services/
│   │   └── geminiService.js    # Service untuk Gemini API
│   ├── App.jsx                 # Komponen utama
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles
├── index.html                 # HTML template
├── package.json              # Dependencies
├── vite.config.js            # Vite configuration
└── README.md                 # Dokumentasi
```

## 🔧 API Integration

Aplikasi menggunakan Gemini 2.5 Flash Preview TTS model dengan endpoint:

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent
```

### Request Format

```json
{
  "contents": [{
    "parts": [{
      "text": "Your text here"
    }]
  }],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {
      "voiceConfig": {
        "prebuiltVoiceConfig": {
          "voiceName": "Kore"
        }
      }
    }
  }
}
```

## 🎨 Design System

### Color Palette
- **Primary**: `#6366f1` (Indigo)
- **Accent**: `#06b6d4` (Cyan)
- **Success**: `#10b981` (Emerald)
- **Error**: `#ef4444` (Red)

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700

## 🚀 Build & Deploy

### Production Build

```bash
pnpm build
```

### Preview Build

```bash
pnpm preview
```

### Deploy Options

- **Vercel**: Drag & drop `dist` folder
- **Netlify**: Connect GitHub repo
- **GitHub Pages**: Push `dist` to `gh-pages` branch

## 🛡️ Error Handling

Aplikasi menangani berbagai jenis error:

- ❌ **400** - Request tidak valid
- ❌ **401** - API Key tidak valid
- ❌ **403** - Akses ditolak / quota habis
- ❌ **429** - Rate limit exceeded
- ❌ **500** - Server error
- ❌ **Timeout** - Request timeout (30 detik)

## 📝 Best Practices

### Performance
- Menggunakan Vite untuk build yang cepat
- Lazy loading untuk components besar
- Audio blob management yang efisien

### Security
- API key disimpan di local state (tidak di localStorage)
- Input validation untuk mencegah XSS
- HTTPS only untuk production

### UX/UI
- Loading states yang jelas
- Error messages yang informatif
- Responsive design untuk semua device
- Keyboard shortcuts (Ctrl+Enter)

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## 📄 License

MIT License - silakan gunakan untuk project pribadi atau komersial.

## 🆘 Troubleshooting

### API Key Error
- Pastikan API key valid dan aktif
- Cek quota di Google AI Studio
- Pastikan billing account sudah setup (jika diperlukan)

### Audio Tidak Muncul
- Cek browser permissions untuk audio
- Pastikan browser mendukung Web Audio API
- Coba dengan browser yang berbeda

### Build Error
- Pastikan Node.js versi 16+
- Clear node_modules dan reinstall
- Cek file permissions

## 🔗 Links

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)

---

Dibuat dengan ❤️ menggunakan React dan Google Gemini AI 