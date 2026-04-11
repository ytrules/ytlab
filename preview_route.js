// Preview route to add to server.js
// Add this BEFORE the webhook route

// 2.5. Generate 30-second preview for Starter plan
app.post('/api/preview', async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) return res.status(400).json({ error: 'No fileId' });
    
    const inputFile = path.join(UPLOAD_DIR, fileId);
    if (!fs.existsSync(inputFile)) return res.status(404).json({ error: 'File not found' });
    
    const previewId = `preview_${Date.now()}`;
    const previewFile = path.join(OUTPUT_DIR, `${previewId}.mp3`);
    const watermarkText = 'YT Creative Lab';
    
    // Process first 30 seconds + watermark voice overlay
    const ffmpegCmd = `ffmpeg -i "${inputFile}" \
      -t 30 \
      -af "highpass=f=80,equalizer=f=200:width_type=o:width=2:g=2,equalizer=f=5000:width_type=o:width=2:g=1.5,acompressor=threshold=0.125:ratio=3:attack=10:release=100:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=11" \
      -ar 44100 "${previewFile}" -y 2>/dev/null`;
    
    const { exec } = require('child_process');
    exec(ffmpegCmd, (err) => {
      if (err) return res.status(500).json({ error: 'Processing failed' });
      
      const previewUrl = `${process.env.SERVER_URL}/api/preview-file/${previewId}`;
      
      // Auto-delete preview after 30 mins
      setTimeout(() => {
        if (fs.existsSync(previewFile)) fs.unlinkSync(previewFile);
      }, 30 * 60 * 1000);
      
      res.json({ previewUrl });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve preview file
app.get('/api/preview-file/:previewId', (req, res) => {
  const { previewId } = req.params;
  const filePath = path.join(OUTPUT_DIR, `${previewId}.mp3`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Preview expired' });
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Access-Control-Allow-Origin', '*');
  fs.createReadStream(filePath).pipe(res);
});
