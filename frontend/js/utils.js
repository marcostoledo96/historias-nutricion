// * Utilidades generales para la aplicación
// * Este módulo agrupa helpers de UI y validaciones que se usan en varias páginas.
// ? Convención de mensajes: mostrarAlerta(mensaje, tipo) donde tipo ∈ {success, error, warning, info}
// ! No hace llamadas a API; sólo maneja DOM y formatos.

// Función para mostrar alertas
function mostrarAlerta(mensaje, tipo = 'info') {
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) return;
  
  // Limpiar alertas previas
  alertContainer.innerHTML = '';
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${tipo}`;
  alertDiv.textContent = mensaje;
  
  alertContainer.appendChild(alertDiv);
  
  // Auto-ocultar después de 5 segundos
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

// Función para formatear fechas
// * formatearFecha(fecha)
// > Entrada: fecha en formato aceptado por Date (string/Date). Salida: DD/MM/AAAA (es-AR).
function formatearFecha(fecha) {
  if (!fecha) return '';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-AR');
}

// Función para formatear fecha y hora
// formatearFechaHora eliminado por no uso

// Función para calcular edad
// * calcularEdad(fechaNacimiento)
// > Calcula edad (años) a partir de fecha de nacimiento. Retorna '' si falta.
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return '';
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  
  return edad;
}

// Función para validar email
// * validarEmail(email)
// > Valida formato básico de email.
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Función para validar DNI
// * validarDNI(dni)
// > Valida DNI argentino de 7 u 8 dígitos (string de números).
function validarDNI(dni) {
  const regex = /^\d{7,8}$/;
  return regex.test(dni);
}

// capitalizar eliminado por no uso

// Función para obtener badge de situación de turno
// * getBadgeSituacion(situacion)
// > Devuelve HTML para badge según estado del turno.
function getBadgeSituacion(situacion) {
  const badges = {
    'programado': 'badge-programado',
    'en_espera': 'badge-en-espera', 
    'atendido': 'badge-atendido',
    'ausente': 'badge-ausente',
    'cancelado': 'badge-cancelado'
  };
  
  const textos = {
    'programado': 'Programado',
    'en_espera': 'En Espera', 
    'atendido': 'Atendido',
    'ausente': 'Ausente',
    'cancelado': 'Cancelado'
  };
  
  return `<span class="badge ${badges[situacion] || 'badge-secondary'}">${textos[situacion] || situacion}</span>`;
}

// Función para limpiar formulario
// * limpiarFormulario(formId)
// > Ejecuta form.reset() si existe el formulario con ese id.
function limpiarFormulario(formId) {
  const form = document.getElementById(formId);
  if (form) {
    form.reset();
  }
}

// Función para confirmar acción
// * confirmarAccion(mensaje)
// > Wrapper para confirm() para estandarizar y facilitar reemplazo futuro.
function confirmarAccion(mensaje) {
  return confirm(mensaje);
}

// Función para debounce (útil para búsquedas)
// * debounce(func, wait)
// > Evita ejecuciones repetidas; ejecuta la función luego de inactividad (wait ms).
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Función para mostrar/ocultar elementos
// * mostrarElemento/ocultarElemento
// > Alternan la clase .hidden en elementos por id.
function mostrarElemento(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.remove('hidden');
  }
}

function ocultarElemento(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.add('hidden');
  }
}

// Función para toggle de elementos
// toggleElemento eliminado por no uso

// Función para loading en botones
// * setButtonLoading(buttonId, isLoading)
// > Deshabilita/rehabilita un botón y gestiona un spinner interno.
function setButtonLoading(buttonId, isLoading) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    // Añadir spinner si no existe
    let spinner = btn.querySelector('.loading');
    if (!spinner) {
      spinner = document.createElement('span');
      spinner.className = 'loading';
      spinner.setAttribute('aria-hidden', 'true');
      btn.prepend(spinner);
    }
  } else {
    btn.disabled = false;
    const spinner = btn.querySelector('.loading');
    if (spinner) spinner.remove();
  }
}

// Función para exportar tabla a CSV
// exportarACSV eliminado por no uso

// Función para obtener parámetros de URL
// * getURLParams()
// > Devuelve los parámetros de la URL actual como objeto simple clave/valor.
function getURLParams() {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(params);
}

// Función para setear parámetro en URL sin recargar
// setURLParam eliminado por no uso

// Función para manejar errores de API
// * manejarErrorAPI(error, response)
// * Estrategia estandar para manejar respuestas HTTP y errores de red.
// ? 401 → redirige a login; 403/404/5xx muestran alerta contextual.
function manejarErrorAPI(error, response = null) {
  console.error('Error API:', error);
  
  if (response) {
    if (response.status === 401) {
      mostrarAlerta('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
      return;
    }
    
    if (response.status === 403) {
      mostrarAlerta('No tienes permisos para realizar esta acción.', 'error');
      return;
    }
    
    if (response.status === 404) {
      mostrarAlerta('Recurso no encontrado.', 'error');
      return;
    }
    
    if (response.status >= 500) {
      mostrarAlerta('Error interno del servidor. Intenta nuevamente.', 'error');
      return;
    }
  }
  
  mostrarAlerta('Error de conexión. Verifica tu conexión a internet.', 'error');
}

// Abrir perfil del paciente en nueva pestaña (opcionalmente en modo edición)
// * abrirPerfilPaciente(id, editar=false)
// > Abre `perfil_paciente.html` en nueva pestaña; si editar=true agrega ?edit=1
function abrirPerfilPaciente(id, editar = false) {
  if (!id) return;
  // Construir URL hacia perfil_paciente.html relativo al sitio actual
  const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
  const url = new URL(base + 'perfil_paciente.html');
  url.searchParams.set('id', id);
  if (editar) url.searchParams.set('edit', '1');
  window.open(url.toString(), '_blank');
}

// Aplicar tema según preferencias locales (claro/oscuro)
// * Aplicación de tema claro/oscuro
// > Lee localStorage.preferencias.tema y setea data-theme en <html>.
(function aplicarTemaPreferencias() {
  try {
    const prefs = JSON.parse(localStorage.getItem('preferencias') || '{}');
    const tema = prefs.tema || 'claro';
    document.documentElement.setAttribute('data-theme', tema === 'oscuro' ? 'dark' : 'light');
  } catch (e) {
    // por defecto claro
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();