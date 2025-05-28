# Multi-Process TTS Features 🚀

Aplikasi Gemini TTS telah diupgrade dengan fitur-fitur canggih untuk processing yang lebih cepat dan robust!

## ✨ Fitur Baru

### 1. Multi-Process Processing
- **Parallel Processing**: Memproses multiple chunks secara bersamaan berdasarkan jumlah API keys
- **Dynamic Concurrency**: Secara otomatis menyesuaikan jumlah proses parallel (maksimal 4x)
- **Load Balancing**: Distribusi beban secara merata ke semua API keys yang tersedia

### 2. Health Monitoring untuk API Keys
- **Real-time Health Status**: Monitor kesehatan setiap API key
  - 🟢 **Healthy**: API key berfungsi normal
  - 🟡 **Warning**: Ada beberapa error tapi masih bisa digunakan
  - 🔴 **Error**: Terlalu banyak error, dinonaktifkan sementara
- **Rate Limiting Detection**: Deteksi otomatis dan cooldown untuk API keys yang kena rate limit
- **Usage Statistics**: Monitor penggunaan dan error count untuk setiap API key

### 3. Session Management & Resume
- **Auto Session Tracking**: Setiap proses TTS disimpan sebagai session dengan ID unik
- **Resume Capability**: Lanjutkan proses dari chunk yang gagal tanpa mengulang dari awal
- **Failed Chunk Retry**: Coba ulang hanya chunks yang gagal
- **Session History**: Lihat semua session yang bisa di-resume

### 4. Real-time Monitoring
- **Progress Tracking**: Monitor progress dengan detail batch dan chunk
- **Processing Logs**: Log real-time dengan timestamp dan level (info, warning, error)
- **API Key Dashboard**: Monitor status dan penggunaan semua API keys
- **Performance Metrics**: Statistik concurrency dan throughput

## 🎯 Cara Penggunaan

### Setup API Keys
1. Masukkan multiple API keys (satu per baris) di textarea
2. Klik **"Setup Keys"** untuk validasi dan aktivasi
3. Monitor status di dashboard - pastikan ada keys yang healthy

### Processing Text
1. Masukkan text atau upload file .txt
2. Klik **"Generate Audio (Multi-Process)"**
3. Monitor progress di tab "Progress"
4. Jika ada error, gunakan fitur resume

### Resume Processing
1. Buka tab "Sessions" untuk melihat session yang gagal
2. Klik **"Resume"** untuk melanjutkan dari chunk yang gagal
3. Atau klik **"Retry Failed"** untuk coba ulang chunks yang error

## 📊 Monitor Dashboard

### Tab Progress
- Current session info
- Progress bar real-time
- Batch processing details
- Concurrency information

### Tab API Keys
- Health status setiap key
- Usage statistics
- Error count
- Rate limiting status

### Tab Sessions
- Daftar session yang bisa di-resume
- Progress setiap session
- Actions: Resume, Retry, Delete

### Tab Logs
- Real-time processing logs
- Error messages detail
- Performance information

## ⚡ Performance Benefits

### Speed Improvements
- **3-4x faster** dengan 4 API keys (dibanding sequential)
- **Adaptive concurrency** berdasarkan available healthy keys
- **Batch processing** untuk efisiensi optimal

### Reliability
- **Auto-retry** untuk chunks yang gagal
- **Health monitoring** mencegah penggunaan API keys bermasalah
- **Resume capability** menghemat waktu dan kuota API

### Resource Efficiency
- **Smart load balancing** untuk distribusi beban merata
- **Rate limit handling** mencegah pemborosan kuota
- **Memory efficient** chunking dan processing

## 🔧 Technical Details

### Concurrency Model
```javascript
// Maksimal 4 proses parallel
maxConcurrency = Math.min(healthyApiKeys.length, 4)

// Processing dalam batches
for (batch of chunks) {
  await Promise.allSettled(batch.map(processChunk))
}
```

### Health Monitoring
- **Error threshold**: 3 errors = key di-disable
- **Rate limit cooldown**: 1 menit untuk recovery
- **Auto recovery**: Keys kembali healthy setelah sukses

### Session Storage
- **In-memory storage** untuk development
- **Persistent storage** bisa ditambahkan ke localStorage/indexedDB
- **Auto cleanup** session lama (24 jam)

## 🚀 Quick Start Example

1. **Setup 3 API Keys**:
   ```
   AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
   AIzaSyZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
   ```

2. **Large Text Processing**:
   - Text 5000 karakter = ~10 chunks
   - With 3 keys = 3x parallel processing
   - Time: ~30% dari waktu sequential

3. **Error Handling**:
   - Jika 1 key error → otomatis skip ke key lain
   - Session disimpan → bisa resume kapan saja
   - Retry hanya chunks yang gagal

## 🎉 Benefits Summary

✅ **Faster Processing** - Up to 4x speed dengan multiple API keys  
✅ **Better Reliability** - Auto-retry dan health monitoring  
✅ **Resume Capability** - Tidak perlu mulai dari awal jika error  
✅ **Resource Efficient** - Smart load balancing dan rate limit handling  
✅ **Real-time Monitoring** - Dashboard lengkap untuk tracking  
✅ **User Friendly** - UI intuitif dengan progress yang jelas  

---

**Enjoy faster and more reliable TTS processing! 🎵✨** 