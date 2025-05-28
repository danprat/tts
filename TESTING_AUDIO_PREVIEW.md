# Testing Audio Preview & Resume Functionality

## Steps to Test:

1. **Open Application**: `http://localhost:3002` (or available port)

2. **Setup API Keys**: 
   - Paste valid Gemini API keys (one per line)
   - Click "Setup Keys"

3. **Input Test Text**:
   - Use the simple test: "Ini adalah test sederhana untuk audio preview. Text ini akan dipecah menjadi dua chunk untuk testing."
   - Or upload `test-simple.txt`

4. **Generate Audio**:
   - Click "Generate Audio (Multi-Process)"
   - Monitor the progress in the Monitor tabs

5. **Test Audio Preview**:
   - After generation, scroll to "Preview Individual Chunks" section
   - Click "▶️ Play" button on any chunk to preview
   - Click "💾 Download" button to download individual chunk
   - Use HTML audio controls as fallback

6. **Test Resume Functionality**:
   - Interrupt a long processing (or simulate failure)
   - Go to "Sessions" tab in Monitor
   - Check "Audio Cache" status (✅ Available / ❌ Lost)
   - Click "Resume" to continue from where it left off
   - Audio preview should still be available after resume

## New Features:

### Individual Chunk Download:
- ✅ Download button on each chunk
- ✅ Timestamped filenames: `gemini-tts-chunk-01-2024-01-01-12-00-00.wav`
- ✅ Success/error feedback messages

### Improved Resume:
- ✅ Audio cache system preserves completed chunks
- ✅ Resume from failed chunks only (not from beginning)
- ✅ Audio preview preserved after resume
- ✅ Warning if audio cache is lost

## Debug Information:

- Check browser console for debug logs
- Look for "🐛 Debug Info" section in development mode
- Verify `audioResults.length > 0` and `hasBlob: ✅`
- Monitor Sessions tab for cache status

## Expected Behavior:

- ✅ Audio chunks playable via Play button
- ✅ Individual chunk download with unique filenames
- ✅ HTML audio controls as fallback
- ✅ Visual indicator (green highlight) when playing
- ✅ Resume preserves existing audio results
- ✅ Smart resume from failed chunks only

## Troubleshooting:

- **No audio preview**: Check if audioBlob exists in debug info
- **Resume lost audio**: Check if "Audio Cache: ✅ Available" in Sessions tab
- **Download fails**: Verify audioBlob exists for that chunk
- **Play fails**: Check browser console for errors 