const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const textToSpeech = require('@google-cloud/text-to-speech');

const app = express();
app.use(cors());
app.use(express.json());

// Inicializa Gemini para el texto
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Inicializa Google Cloud TTS usando el JSON de tu Cuenta de Servicio desde Render
const credentials = process.env.GOOGLE_CREDENTIALS 
  ? JSON.parse(process.env.GOOGLE_CREDENTIALS) 
  : undefined;

const ttsClient = new textToSpeech.TextToSpeechClient({ credentials });

/* ====================================================================================
   PATIENTS_CONFIG y BASE_TUTOR_PROMPT SE MANTIENEN EXACTAMENTE IGUAL QUE TIENES
   ==================================================================================== */

// FUNCIÓN AUXILIAR DE TEXT-TO-SPEECH USANDO LA CUENTA DE SERVICIO OFICIAL
async function generateAudioBase64(text, gender, isTutor) {
  const cleanText = text ? text.replace(/[*#\-_`[\]()]/g, '').trim() : '';
  if (!cleanText) return null;

  // Selección de voz natural oficial
  let voiceName = 'es-ES-Standard-A'; // Voz femenina
  if (isTutor || gender === 'male') {
    voiceName = 'es-ES-Standard-B'; // Voz masculina
  }

  const request = {
    input: { text: cleanText },
    voice: { languageCode: 'es-ES', name: voiceName },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
  };

  const [response] = await ttsClient.synthesizeSpeech(request);
  return response.audioContent.toString('base64');
}

// ENDPOINT DE CHAT
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, caseId } = req.body;
    
    const activeCaseIds = Object.keys(PATIENTS_CONFIG).map(Number);
    let selectedCaseId = caseId;

    if (!selectedCaseId || !PATIENTS_CONFIG[selectedCaseId]) {
      selectedCaseId = activeCaseIds[Math.floor(Math.random() * activeCaseIds.length)];
    }

    const activePatient = PATIENTS_CONFIG[selectedCaseId];
    const dynamicSystemPrompt = `${BASE_TUTOR_PROMPT}\n\n[INSTRUCCIÓN CLÍNICA DEL CASO ACTUAL CONGELADO]:\n${activePatient.prompt}`;

    const contents = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // 1. Generación del texto con Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: contents,
      config: {
        systemInstruction: dynamicSystemPrompt,
        temperature: 0.7,
      }
    });

    const replyText = response.text;
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const isTutorMode = lastUserMessage.toUpperCase().includes("FIN DE CONSULTA");

    // 2. Generación del MP3 oficial con la cuenta de servicio de Google Cloud
    let audioBase64 = null;
    try {
      audioBase64 = await generateAudioBase64(replyText, activePatient.gender, isTutorMode);
    } catch (ttsError) {
      console.error('Error generando audio TTS:', ttsError.message);
    }

    res.json({
      reply: replyText,
      caseId: selectedCaseId,
      audioBase64: audioBase64,
      patient: {
        name: activePatient.name,
        gender: activePatient.gender,
        avatar: activePatient.avatar
      }
    });

  } catch (error) {
    console.error('Error en el servidor:', error);
    res.status(500).json({ error: 'Error procesando la simulación' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});