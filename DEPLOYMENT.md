# 🚀 Deployment Guide - Gemini TTS App

Panduan lengkap untuk deploy aplikasi TTS ke berbagai platform cloud.

## 📦 Build untuk Production

```bash
# Build aplikasi
npm run build

# Preview build (optional)
npm run preview
```

Folder `dist/` akan berisi file statis yang siap deploy.

## 🌐 Deployment Options

### 1. Vercel (Recommended)

**Via CLI:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

**Via Web Interface:**
1. Push ke GitHub repository
2. Connect repository di [vercel.com](https://vercel.com)
3. Auto deploy setiap push ke main branch

**Konfigurasi Vercel:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

### 2. Netlify

**Via CLI:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build dan deploy
npm run build
netlify deploy --prod --dir=dist
```

**Via Web Interface:**
1. Drag & drop folder `dist/` ke [netlify.com](https://netlify.com)
2. Atau connect GitHub repository

**Konfigurasi netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3. GitHub Pages

```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add script ke package.json
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}

# Deploy
npm run deploy
```

**Konfigurasi vite.config.js untuk GitHub Pages:**
```js
export default defineConfig({
  plugins: [react()],
  base: '/repository-name/', // Ganti dengan nama repo
  server: {
    port: 3000,
    open: true
  }
})
```

### 4. Railway

1. Connect GitHub repository di [railway.app](https://railway.app)
2. Add environment variables jika diperlukan
3. Deploy otomatis dari main branch

### 5. Cloudflare Pages

1. Connect repository di [pages.cloudflare.com](https://pages.cloudflare.com)
2. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`

## 🔧 Environment Configuration

### Production Settings

Untuk production, pastikan:

1. **API Key Security**: API key dimasukkan di client-side (aman karena Gemini API tidak memerlukan server-side proxy)

2. **HTTPS Only**: Pastikan site berjalan di HTTPS

3. **Error Tracking**: Tambahkan error tracking (optional):
```bash
npm install @sentry/react
```

### Performance Optimization

**Vite Bundle Analysis:**
```bash
npm run build -- --analyze
```

**Optimizations yang sudah included:**
- ✅ Tree shaking otomatis
- ✅ Code splitting dengan React.lazy()
- ✅ CSS minification
- ✅ Asset optimization

## 🌍 Custom Domain

### Vercel Custom Domain
1. Buka project di Vercel dashboard
2. Settings → Domains
3. Add custom domain
4. Update DNS records sesuai instruksi

### Netlify Custom Domain
1. Site settings → Domain management
2. Add custom domain
3. Configure DNS records

### Cloudflare Custom Domain
1. Add domain di Cloudflare Pages
2. Update nameservers ke Cloudflare

## 🔒 Security Considerations

### API Key Security
- ✅ API key hanya disimpan di client state
- ✅ Tidak ada API key di source code
- ✅ HTTPS enforced di production

### CORS Handling
Gemini API mendukung CORS untuk client-side requests, jadi tidak perlu proxy server.

### Content Security Policy (optional)
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               connect-src 'self' https://generativelanguage.googleapis.com; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
               font-src 'self' https://fonts.gstatic.com;">
```

## 📊 Monitoring & Analytics

### Basic Analytics (optional)
```bash
# Google Analytics
npm install gtag

# Plausible Analytics
# Add script tag ke index.html
```

### Error Monitoring (optional)
```bash
npm install @sentry/react @sentry/tracing
```

## 🧪 Pre-deployment Checklist

- [ ] ✅ Build berhasil tanpa error
- [ ] ✅ Test di browser production build (`npm run preview`)
- [ ] ✅ Semua assets di-load dengan benar
- [ ] ✅ Audio playback berfungsi di berbagai browser
- [ ] ✅ Responsive design di mobile
- [ ] ✅ Error handling berfungsi dengan baik
- [ ] ✅ API validation berfungsi
- [ ] ✅ HTTPS enforced
- [ ] ✅ Meta tags untuk SEO

## 🔄 Auto-deployment Setup

### GitHub Actions (example)

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🆘 Troubleshooting

### Build Errors
```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

### Deployment Errors
- Pastikan Node.js version compatible (16+)
- Check build output size limits
- Verify environment variables

### Runtime Errors
- Check browser console untuk errors
- Pastikan HTTPS untuk audio APIs
- Test API connectivity

---

Happy deploying! 🚀 