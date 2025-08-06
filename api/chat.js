// =================================================================
// ARCHIVO 2: api/chat.js (El servidor intermediario seguro)
// =================================================================
// Este código se ejecuta en Vercel, no en el navegador del usuario.
// Tiene acceso seguro a la clave de API.
// =================================================================

export default async function handler(req, res) {
    // Solo permitir peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { query, knowledge } = req.body;

        if (!query || !knowledge) {
            return res.status(400).json({ error: 'Faltan los parámetros "query" o "knowledge".' });
        }

        // *** ACCESO SEGURO A LA CLAVE DE API ***
        // Vercel inyectará la clave aquí desde las "Environment Variables".
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'La clave de API de Gemini no está configurada en el servidor.' });
        }
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const prompt = `
            Rol: Eres un asistente virtual experto y amable para la Maestría en Internet de las Cosas.
            Tarea: Responde la pregunta del usuario basándote ESTRICTA Y ÚNICAMENTE en el siguiente "Contexto". No inventes información ni respondas con conocimiento externo.
            Formato de respuesta: Responde de manera concisa y directa. Si la información no se encuentra en el contexto, responde amablemente: "Lo siento, no tengo información sobre ese tema en mi base de conocimiento.".

            Contexto:
            ---
            ${knowledge}
            ---

            Pregunta del usuario: "${query}"
        `;

        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        };

        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error("Error desde la API de Gemini:", errorText);
            throw new Error(`Error de la API de Gemini: ${geminiResponse.statusText}`);
        }

        const result = await geminiResponse.json();
        
        const botResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo obtener una respuesta.";

        // Enviar la respuesta de vuelta al chatbot en el navegador
        res.status(200).json({ response: botResponse });

    } catch (error) {
        console.error('Error en la función del servidor:', error);
        res.status(500).json({ error: error.message || 'Error interno del servidor.' });
    }
}

