import { PROMPT_ASISTENTE, PROMPT_AUDITORIA, PROMPT_TRADUCTOR } from '../lib/prompts.js';

// Proxy seguro hacia la API de Claude para las herramientas con IA
// (asistente fiscal, auditoría fiscal y traductor de cartas).
// La clave se guarda en Vercel como variable de entorno ANTHROPIC_API_KEY
// y nunca llega al navegador.

const MODELO = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const MAX_TOKENS = 1500;
const MAX_MENSAJES = 20;
const MAX_CHARS_TEXTO = 20000;
const MAX_BYTES_IMAGEN = 5 * 1024 * 1024;
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Las instrucciones de sistema viven en el servidor: el navegador solo dice qué herramienta es.
const HERRAMIENTAS = {
  asistente: PROMPT_ASISTENTE,
  auditoria: PROMPT_AUDITORIA,
  traductor: PROMPT_TRADUCTOR,
};

// Límite sencillo por IP (en memoria; se reinicia con cada arranque de la función).
const LIMITE_POR_HORA = 30;
const contador = new Map();
function limitado(ip) {
  const ahora = Date.now();
  const reg = contador.get(ip) || { n: 0, desde: ahora };
  if (ahora - reg.desde > 3600_000) { reg.n = 0; reg.desde = ahora; }
  reg.n += 1;
  contador.set(ip, reg);
  return reg.n > LIMITE_POR_HORA;
}

function validarMensajes(mensajes) {
  if (!Array.isArray(mensajes) || mensajes.length === 0 || mensajes.length > MAX_MENSAJES) return false;
  for (const m of mensajes) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return false;
    if (typeof m.content === 'string') {
      if (m.content.length > MAX_CHARS_TEXTO) return false;
    } else if (Array.isArray(m.content)) {
      for (const b of m.content) {
        if (b.type === 'text') {
          if (typeof b.text !== 'string' || b.text.length > MAX_CHARS_TEXTO) return false;
        } else if (b.type === 'image') {
          const s = b.source || {};
          if (s.type !== 'base64' || !TIPOS_IMAGEN.includes(s.media_type)) return false;
          if (typeof s.data !== 'string' || s.data.length * 0.75 > MAX_BYTES_IMAGEN) return false;
        } else {
          return false;
        }
      }
    } else {
      return false;
    }
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Servicio de IA no configurado' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'desconocida';
  if (limitado(ip)) return res.status(429).json({ error: 'Demasiadas consultas. Inténtalo dentro de un rato.' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: 'Petición no válida' }); }
  }
  const { herramienta, messages } = body || {};
  const system = HERRAMIENTAS[herramienta];
  if (!system) return res.status(400).json({ error: 'Herramienta desconocida' });
  if (!validarMensajes(messages)) return res.status(400).json({ error: 'Mensaje no válido o demasiado largo' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODELO, max_tokens: MAX_TOKENS, system, messages }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('Error API Claude:', r.status, JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ error: 'El servicio de IA no ha respondido correctamente' });
    }
    const texto = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    return res.status(200).json({ texto });
  } catch (err) {
    console.error('Error llamando a Claude:', err);
    return res.status(502).json({ error: 'No se pudo conectar con el servicio de IA' });
  }
}
