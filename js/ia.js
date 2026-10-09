/* NormaAlerta — utilidades compartidas de las herramientas con IA.
   Las peticiones pasan por /api/claude (función de Vercel), que guarda la clave. */
(function (global) {
  'use strict';

  async function llamarIA(herramienta, messages) {
    const r = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ herramienta, messages }),
    });
    let data = {};
    try { data = await r.json(); } catch (e) { /* respuesta no JSON */ }
    if (!r.ok || !data.texto) {
      const err = new Error((data.error || 'No se pudo conectar con el asistente') + (data.codigo ? ' · código ' + data.codigo + ' ' + data.tipo : ''));
      err.status = r.status;
      throw err;
    }
    return data.texto;
  }

  function escaparHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Markdown básico → HTML, escapando antes cualquier HTML del texto
  function markdownBasico(texto) {
    return escaparHTML(texto)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<em>$2</em>')
      .replace(/^#{1,3} (.+)$/gm, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, (m) => '<ul>' + m.replace(/\n/g, '') + '</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>').replace(/$/, '</p>');
  }

  global.NAIA = { llamarIA, escaparHTML, markdownBasico };
})(window);
