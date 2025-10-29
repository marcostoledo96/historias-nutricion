// * Registro de usuario (solo admin)
// * Requiere sesión con rol 'admin'. Si no, muestra alertas preventivas.

document.addEventListener('DOMContentLoaded', async () => {
  const auth = await verificarAutenticacion();
  const form = document.getElementById('form-registro');
  const esAdmin = !!(auth.autenticado && auth.usuario && auth.usuario.rol === 'admin');

  if (!auth.autenticado) {
    mostrarAlerta('Para crear usuarios debes iniciar sesión como administrador.', 'warning');
  } else if (!esAdmin) {
    mostrarAlerta('Acceso solo para administradores. Inicia sesión con una cuenta admin.', 'error');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!esAdmin) {
      mostrarAlerta('No tienes permisos para registrar usuarios. Inicia sesión como admin.', 'error');
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const resp = await fetch('/api/auth/registro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(data) });
      const result = await resp.json();
      if (resp.ok) {
        mostrarAlerta('Usuario creado', 'success');
        form.reset();
      } else {
        manejarErrorAPI(result, resp);
        mostrarAlerta(result.error || 'No se pudo crear el usuario', 'error');
      }
    } catch (e) { manejarErrorAPI(e); }
  });
});
