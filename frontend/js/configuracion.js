// ! Configuración de cuenta (perfil, contraseña y preferencias locales)
// * Contrato rápido:
//   - GET/PUT /api/auth/perfil para datos del usuario
//   - PUT /api/auth/password para cambio de contraseña
//   - Preferencias se guardan en localStorage por ahora (tema, auto_inicio, page_size)
// ? Requiere: inicializarPagina() desde components.js, y utils para UI (mostrarAlerta, setButtonLoading, manejarErrorAPI)

document.addEventListener('DOMContentLoaded', async () => {
  const acceso = await inicializarPagina();
  if (!acceso) return;
  cargarPerfil();
  configurarFormularios();
});

async function cargarPerfil() {
  try {
    const resp = await fetch('/api/auth/perfil', { credentials: 'include' });
    if (!resp.ok) return manejarErrorAPI(null, resp);
    const data = await resp.json();
    const form = document.getElementById('form-perfil');
    form.nombre.value = data.nombre || '';
    form.email.value = data.email || '';
  } catch (e) { manejarErrorAPI(e); }
}

function configurarFormularios() {
  const formPerfil = document.getElementById('form-perfil');
  formPerfil.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(formPerfil).entries());
    try {
      setButtonLoading('btn-guardar-perfil', true);
      const resp = await fetch('/api/auth/perfil', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(data)
      });
      const result = await resp.json();
      if (resp.ok) {
        mostrarAlerta('Perfil actualizado', 'success');
        // Refrescar nombre en header
        document.getElementById('usuario-nombre').textContent = result.usuario?.nombre || data.nombre;
      } else {
        mostrarAlerta(result.error || 'No se pudo actualizar el perfil', 'error');
      }
    } catch (e) { manejarErrorAPI(e); }
    finally { setButtonLoading('btn-guardar-perfil', false); }
  });

  const formPwd = document.getElementById('form-password');
  formPwd.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(formPwd).entries());
    if (!data.password_actual || !data.password_nueva) {
      mostrarAlerta('Completa ambos campos de contraseña', 'warning');
      return;
    }
    // ? Podrías validar reglas de fortaleza aquí (largo mínimo, mayúsculas, símbolos, etc.)
    try {
      setButtonLoading('btn-guardar-password', true);
      const resp = await fetch('/api/auth/password', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(data)
      });
      const result = await resp.json();
      if (resp.ok) {
        mostrarAlerta('Contraseña actualizada', 'success');
        formPwd.reset();
      } else {
        mostrarAlerta(result.error || 'No se pudo actualizar la contraseña', 'error');
      }
    } catch (e) { manejarErrorAPI(e); }
    finally { setButtonLoading('btn-guardar-password', false); }
  });

  const formPref = document.getElementById('form-preferencias');
  formPref.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(formPref).entries());
    data.auto_inicio = formPref.auto_inicio.checked;
    // Guardar en localStorage (preferencias locales por ahora)
    localStorage.setItem('preferencias', JSON.stringify(data));
    mostrarAlerta('Preferencias guardadas localmente', 'success');
  });

  // Cargar preferencias previas si existen
  try {
    const prefs = JSON.parse(localStorage.getItem('preferencias') || '{}');
    if (prefs.tema) document.querySelector('#form-preferencias [name="tema"]').value = prefs.tema;
    if (typeof prefs.auto_inicio === 'boolean') document.querySelector('#form-preferencias [name="auto_inicio"]').checked = prefs.auto_inicio;
    if (prefs.page_size) document.querySelector('#form-preferencias [name="page_size"]').value = String(prefs.page_size);
  } catch {}
}
