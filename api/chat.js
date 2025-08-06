import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // *** CAMBIO IMPORTANTE ***
        // 1. Leer el archivo de conocimiento desde el servidor.
        // Vercel despliega los archivos en un entorno de solo lectura,
        // por lo que necesitamos construir la ruta de forma correcta.
        const knowledgeFilePath = path.join(process.cwd(), 'data', 'knowledge.txt');
        const knowledge = await fs.readFile(knowledgeFilePath, 'utf8');

        // 2. Obtener solo la pregunta del cuerpo de la petición.
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Falta el parámetro "query".' });
        }

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

        res.status(200).json({ response: botResponse });

    } catch (error) {
        console.error('Error en la función del servidor:', error);
        // Devuelve un error más específico si el archivo no se encuentra
        if (error.code === 'ENOENT') {
             return res.status(500).json({ error: 'No se encontró el archivo de conocimiento (knowledge.txt) en el servidor.' });
        }
        res.status(500).json({ error: error.message || 'Error interno del servidor.' });
    }
}
