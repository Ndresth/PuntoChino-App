// Aplica el tema guardado ANTES de pintar la página: sin destello blanco al abrir en modo oscuro.
// Cada restaurante guarda el suyo: /puntochino -> "puntochino:tema".
try {
  var restaurante = location.pathname.split('/')[1];
  if (localStorage.getItem(restaurante + ':tema') === 'oscuro') document.documentElement.setAttribute('data-bs-theme', 'dark');
} catch { /* sin almacenamiento: modo claro */ }
