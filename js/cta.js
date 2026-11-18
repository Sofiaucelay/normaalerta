/* NormaAlerta — bloque "Recibe el resumen semanal" al final de cada herramienta.
   Se añade con <script defer src="/js/cta.js"></script>. No usa cookies ni datos personales. */
(function () {
  'use strict';
  if (document.getElementById('na-cta-semanal')) return;

  var css = '' +
    '#na-cta-semanal{max-width:720px;margin:48px auto 32px;padding:24px;border-radius:14px;' +
    'background:#e8f5ee;border:1px solid rgba(26,122,74,.25);text-align:center;' +
    'font-family:inherit;color:#1c1b18;box-sizing:border-box}' +
    '#na-cta-semanal h2{font-size:20px;margin:0 0 8px;font-weight:600;line-height:1.3}' +
    '#na-cta-semanal p{font-size:15px;margin:0 0 16px;color:#5a5850;line-height:1.5}' +
    '#na-cta-semanal a.na-btn{display:inline-block;padding:12px 22px;border-radius:10px;' +
    'background:#1a7a4a;color:#fff;text-decoration:none;font-weight:600;font-size:15px}' +
    '#na-cta-semanal .na-nota{display:block;margin-top:10px;font-size:12px;color:#5a5850}' +
    '@media (max-width:760px){#na-cta-semanal{margin:32px 16px 24px}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var box = document.createElement('aside');
  box.id = 'na-cta-semanal';
  box.innerHTML =
    '<h2>¿Te ha servido? Recibe cada semana lo que cambia para autónomos</h2>' +
    '<p>Un resumen breve con los cambios del BOE y de Hacienda y los plazos que se acercan, ' +
    'explicado en claro y con qué conviene hacer.</p>' +
    '<a class="na-btn" href="/lista-espera.html">Apuntarme gratis →</a>' +
    '<span class="na-nota">Gratis · Sin spam · Te das de baja cuando quieras</span>';

  var footer = document.querySelector('footer');
  if (footer && footer.parentNode) footer.parentNode.insertBefore(box, footer);
  else document.body.appendChild(box);
})();
