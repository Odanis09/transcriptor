async function transcribirAudio() {
  const archivo = document.getElementById('audioFile').files[0];
  const resultado = document.getElementById('resultado');
  const loader = document.getElementById('loader');

  if (!archivo) {
    resultado.textContent = 'Por favor, selecciona un archivo de audio.';
    return;
  }

  const formData = new FormData();
  formData.append('audio', archivo);

  loader.style.display = 'block';
  resultado.textContent = 'Transcribiendo...';

  try {
    const response = await fetch('/transcribir', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.error) {
      resultado.textContent = 'Error durante la transcripción: ' + data.error.message;
    } else {
      resultado.textContent = data.text;
    }
  } catch (err) {
    resultado.textContent = 'Error durante la transcripción.';
    console.error(err);
  } finally {
    loader.style.display = 'none';
  }
}
