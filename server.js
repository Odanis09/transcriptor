const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

app.post('/transcribir', upload.single('audio'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: { message: 'No se ha subido ningún archivo' } });
  }

  try {
    // Paso 1: Subir archivo a AssemblyAI
    const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
      },
      body: fs.createReadStream(file.path),
    });

    const uploadData = await uploadRes.json();
    const audioUrl = uploadData.upload_url;

    // Paso 2: Enviar solicitud de transcripción
    const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio_url: audioUrl }),
    });

    const transcriptData = await transcriptRes.json();
    const transcriptId = transcriptData.id;

    // Paso 3: Esperar que se complete la transcripción (polling)
    let completed = false;
    let transcription = null;

    while (!completed) {
      const pollingRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
        },
      });

      const pollingData = await pollingRes.json();

      if (pollingData.status === 'completed') {
        completed = true;
        transcription = pollingData.text;
      } else if (pollingData.status === 'error') {
        throw new Error(pollingData.error);
      } else {
        await new Promise(r => setTimeout(r, 3000)); // Espera 3 segundos
      }
    }

    res.json({ text: transcription });
  } catch (error) {
    console.error('Error al transcribir con AssemblyAI:', error);
    res.status(500).json({ error: { message: 'Error al transcribir con AssemblyAI' } });
  } finally {
    fs.unlinkSync(file.path);
  }
});

app.listen(3000, () => console.log('Servidor corriendo en http://localhost:3000'));
