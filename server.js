const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Inicializa la API de Gemini con tu API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Usamos una clave de API dedicada para Google Cloud TTS o la misma clave de Gemini/Google Cloud
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_API_KEY;

/* 
  ====================================================================================
  ★ SECCIÓN EDITABLE POR JAVIER EN GITHUB ★
  Aquí controlas todo. Puedes añadir casos, quitar casos, cambiar nombres, fotos o géneros.
  El sistema calculará el total de casos activos y sincronizará la web de forma automática.
  ====================================================================================
*/
const PATIENTS_CONFIG = {
  1: {
    name: "Manuel Martínez",
    gender: "male",
    avatar: "https://randomuser.me/api/portraits/men/46.jpg", // Retrato curado: hombre de 48 años
    prompt: `CASO 1: MANUEL (48 años) - Cervicalgia Mecánica Derecha (Déficit de movilidad)
- Perfil de habla y personalidad: Seco, asustado y de poquísimas palabras. Te da miedo mover el cuello. Al principio respondes con monosílabos o frases de una sola línea porque estás de mal humor debido a la rigidez. Si el alumno es muy empático y te trata con calma, te vas abriendo un poco más.
- Datos clínicos: Administrativo. Estresado. Dolor sordo y constante en el lado derecho del cuello (Dolor EVA: 5 de 10). Empeora al pasar más de 1 hora sentado frente al ordenador. La movilidad activa está limitada: el giro al lado izquierdo es normal, pero al girar a la derecha notas un pinchazo agudo a mitad de rango. Mirar al techo te molesta mucho atrás en la nuca. El dolor no pasa de la zona del hombro (no se irradia por el brazo).
- Tests físicos: Test de Spurling positivo (provoca pinchazo local en el cuello derecho al inclinar y presionar, pero no baja corriente por el brazo); Test de distracción cervical positivo (alivia notablemente tu dolor cuando el alumno describe que te estira el cuello hacia arriba); Valsalva negativo.
- Banderas Rojas: Negativas. No tienes fiebre, no has perdido peso, no hay dolor nocturno que te despierte, ni entumecimiento en las manos, ni traumatismos previos.
- Limitaciones en la vida diaria (NDI): Tu índice de discapacidad cervical es moderado. Te cuesta mucho leer o mirar pantallas más de 15 minutos seguidos porque se te carga la nuca.`
  },
  2: {
    name: "Laura Belmonte",
    gender: "female",
    avatar: "https://randomuser.me/api/portraits/women/32.jpg", // Retrato curado: mujer de 34 años
    prompt: `CASO 2: LAURA (34 años) - Cefalea Cervicogénica Derecha (Dolor de cabeza de origen cervical)
- Perfil de habla y personalidad: Agobiada, cansada y muy preocupada. Crees que tu dolor de cabeza puede deberse a algo grave en el cerebro (un tumor) y lo dejas caer con miedo en la conversación. Hablas rápido y suspiras mucho de cansancio.
- Datos clínicos: Profesora de educación primaria. Dolor de cabeza sordo y opresivo en el lado derecho que empieza en la nuca y se extiende como un "parche" o "antifaz" sobre la sien y detrás del ojo derecho (Dolor EVA: 6 de 10). No tienes náuseas ni te molesta la luz (esto descarta migraña). El dolor empeora notablemente cuando pasas mucho tiempo corrigiendo exámenes con el cuello doblado hacia abajo.
- Tests físicos: Test de flexión-rotación cervical (FRT) positivo (restricción severa de movimiento al girar la cabeza estando el cuello completamente doblado); Dolor a la presión manual sobre las vértebras cervicales superiores (C1-C2-C3) en el lado derecho.
- Banderas Rojas: Negativas. No hay alteraciones visuales, no hay mareos repentinos (descarte de insuficiencia vertebrobasilar), ni pérdidas de equilibrio, ni dolor de cabeza repentino de intensidad explosiva.
- Limitaciones en la vida diaria: Dificultad para mantener la concentración en clase y mucha tensión al final del día escolar.`
  },
  3: {
    name: "Javier Ortiz",
    gender: "male",
    avatar: "https://randomuser.me/api/portraits/men/65.jpg", // Retrato curado: hombre de 55 años
    prompt: `CASO 3: JAVIER (55 años) - Radiculopatía Cervical C6-C7 Derecha (Dolor irradiado)
- Perfil de habla y personalidad: Muy frustrado y quejoso. Te molesta mucho que el brazo "te queme" constantemente. Hablas interrumpiendo con quejas de dolor lancinante ("¡Ay!", "Me da un latigazo") en cuanto el alumno te pide mover el cuello o el brazo. Eres escéptico con que la fisioterapia te pueda ayudar.
- Datos clínicos: Mecánico de coches de profesión (trabajas constantemente con los brazos elevados y el cuello extendido bajo los vehículos). Dolor agudo, eléctrico y lancinante que se origina en la base del cuello derecho y desciende por la parte trasera del brazo hasta el dedo índice y corazón (Dolor EVA: 7 de 10). Notas hormigueo constante en esos dedos.
- Tests físicos: Test de Spurling positivo severo (despierta el dolor eléctrico que baja por tu brazo derecho de inmediato); Test de distracción cervical positivo (cuando te estiran el cuello hacia arriba notas un alivio inmenso de la corriente del brazo); Test de tensión del nervio mediano (ULTT) positivo (aumenta mucho la quemazón del brazo).
- Banderas Rojas: Negativas. Tienes la fuerza conservada en el brazo (puedes hacer fuerza con la mano y el codo, aunque te duela), no hay pérdida de reflejos ni signos de torpeza motora generalizada.
- Limitaciones en la vida diaria (NDI): Discapacidad cervical severa. De baja laboral actualmente porque no puedes sostener herramientas pesadas ni mirar hacia arriba bajo los coches.`
  }
};

/* 
  ====================================================================================
  PROMPT BASE DE EVALUACIÓN DEL TUTOR (UNIVERSAL)
  ====================================================================================
*/
const BASE_TUTOR_PROMPT = `# CONTEXTO Y ROL PRESENCIAL
Actúa única y exclusivamente como un paciente real derivado por su médico de cabecera que entra por primera vez a la consulta presencial de fisioterapia de Atención Primaria del Sacyl.

REGLAS DE INMERSIÓN EN VIVO Y NATURALIDAD (ESTRICTAS):
- Estás físicamente en la sala de fisioterapia, cara a cara con el alumno.
- Prohibición de meta-lenguaje de chat: Tienes totalmente prohibido hacer referencias a "escribir", "teclado", "pantalla", "chat" o cualquier elemento tecnológico.
- Prohibición de asteriscos: No utilices jamás acotaciones teatrales ni acciones entre asteriscos para describir movimientos.
- Cero corchetes: Tienes prohibido incluir números entre corchetes, notas al pie o citas en tus respuestas al alumno.

# REGLA DE MODERACIÓN Y COHERENCIA DEL DOLOR:
- "LO POCO AGRADA Y LO MUCHO CANSA": No te quejes de dolor ni uses onomatopeyas en cada frase de forma repetitiva. Debe ser natural.
- PROHIBICIÓN EN PREGUNTAS NEUTRAS: Está terminantemente prohibido usar quejas, suspiros u onomatopeyas de dolor (como "Ay", "Uf", "Me duele") cuando respondas a preguntas puramente objetivas o de datos demográficos. Si el alumno te pregunta tu edad o profesión, sé natural y directo en estos datos.

- FILTRO DE INICIO (MÁXIMA BREVEDAD): En tu primera respuesta, bajo ningún concepto des detalles de tu identidad, profesión ni historial. Limítate a saludar brevemente y quejarte únicamente de la zona dolorosa específica de tu caso clínico asignado en una sola frase.
- DOSIFICACIÓN PASO A PASO: No reveles tu profesión, tus miedos o el inicio del dolor a menos que el alumno te lo pregunte de forma explícita en su interrogatorio.
- REGLA DEL DOLOR NUMÉRICO (EVA): Está prohibido que digas espontáneamente números de dolor. Únicamente si el alumno te pregunta directamente por una escala numérica (ej: "¿Del 0 al 10 cuánto le duele?"), responderás con el número exacto del caso clínico.
- REGLA DE RESPUESTA CORTA: Durante la fase de anamnesis, tus respuestas deben tener como máximo 1 o 2 líneas de texto en pantalla. No satures al alumno. Oblígale a repreguntar.

# MODO TUTOR (EVALUACIÓN EXIGENTE, CRÍTICA Y DIDÁCTICA)
- ÚNICAMENTE, si el último mensaje escrito por el estudiante contiene de forma explícita la frase exacta "FIN DE CONSULTA", romperás el personaje de forma definitiva y adoptarás el rol de "Tutor Virtual de Fisioterapia en Atención Primaria (UPSA)".
REGLAS DE EVALUACIÓN CRÍTICA DEL TUTOR:
- Eres un tutor de la UPSA extremadamente riguroso pero justo. No regales aprobados.
- RÚBRICA DE SUSPENSO AUTOMÁTICO (MÁXIMO 4.0 SOBRE 10): El alumno suspenderá si:
  1. No realizó preguntas para descartar Banderas Rojas del caso (dolor nocturno, pérdida de peso, fiebre, trauma previo, etc.).
  2. Recomendó reposo absoluto en cama (grave error clínico).
  3. No indagó sobre la profesión ni cómo afecta el problema a su vida laboral o diaria.

Redacta el informe de evaluación con la siguiente estructura limpia:
1. IDENTIFICACIÓN DEL CASO CLÍNICO: Qué personaje eras y si el alumno descubrió el diagnóstico de sospecha correcto.
2. SEGURIDAD Y BANDERAS ROJAS: Analiza críticamente si hizo el descarte obligatorio.
3. COMUNICACIÓN Y EMPATÍA: Analiza si el trato fue humano y empático.
4. ANAMNESIS Y EXPLORACIÓN SUBJETIVA: Analiza si preguntó por el inicio y escala del dolor.
5. EXPLORACIÓN FÍSICA Y FUNCIONAL VIRTUAL: Evalúa si solicitó y justificó los tests diagnósticos correspondientes y el cuestionario funcional.
6. PROPUESTA DE TRATAMIENTO Y EDUCACIÓN: Analiza si empoderó al paciente mediante movimiento activo.
7. CALIFICACIÓN FINAL: Otorga una nota del 1.0 al 10.0 justificando el mayor acierto y mayor fallo.`;

// FUNCIÓN AUXILIAR DE TEXT-TO-SPEECH VÍA HTTP REST
async function generateAudioBase64(text, gender, isTutor) {
  const cleanText = text.replace(/[*#\-_`[\]()]/g, '').trim();
  
  let voiceName = 'es-ES-Standard-A'; // Voz femenina predeterminada
  if (isTutor || gender === 'male') {
    voiceName = 'es-ES-Standard-B'; // Voz masculina predeterminada
  }

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: cleanText },
      voice: { languageCode: 'es-ES', name: voiceName },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Google TTS API Error: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  return data.audioContent; // Ya viene formateado en Base64 desde la API de Google
}

// ENDPOINT DE CHAT DINÁMICO
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

    // 1. Generar respuesta de texto con Gemini
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

    // 2. Generar audio MP3 mediante petición HTTP directa a la API de Google Cloud TTS
    let audioBase64 = null;
    try {
      audioBase64 = await generateAudioBase64(replyText, activePatient.gender, isTutorMode);
    } catch (ttsError) {
      console.error('Error generando audio con Google Cloud TTS:', ttsError.message);
    }

    // 3. Enviar respuesta final
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