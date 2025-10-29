// * Perfil del Paciente e Historial
// * Muestra/edita datos de paciente y lista sus consultas. Incluye mejoras de UX (auto-grow, scroll, edad dinámica).

document.addEventListener('DOMContentLoaded', async () => {
  const acceso = await inicializarPagina();
  if (!acceso) return;

  const { id, edit } = getURLParams();
  if (!id) {
    mostrarAlerta('Falta ID de paciente', 'error');
    setTimeout(() => (window.location.href = 'inicio.html'), 1500);
    return;
  }

  await cargarPerfil(id);
  await cargarConsultasPaciente(id);
  configurarEventosPerfil(id);
  mejorarUXPerfil(edit === '1');
});

// * cargarPerfil(id): trae datos del paciente y carga el formulario
async function cargarPerfil(id) {
  try {
    const resp = await fetch(`/api/pacientes/${id}`, { credentials: 'include' });
    if (!resp.ok) return manejarErrorAPI(null, resp);
    const p = await resp.json();

    const form = document.getElementById('form-perfil-paciente');
    form.dataset.id = id;
    form.nombre.value = p.nombre || '';
    form.apellido.value = p.apellido || '';
    form.sexo.value = p.sexo || 'otro';
    form.dni.value = p.dni || '';
    form.fecha_nacimiento.value = p.fecha_nacimiento ? p.fecha_nacimiento.substring(0,10) : '';
    form.telefono.value = p.telefono || '';
  if (form.telefono_adicional) form.telefono_adicional.value = p.telefono_adicional || '';
    form.email.value = p.email || '';
    form.cobertura.value = p.cobertura || '';
    form.plan.value = p.plan || '';
    form.numero_afiliado.value = p.numero_afiliado || '';
    form.localidad.value = p.localidad || '';
    form.direccion.value = p.direccion || '';
    form.ocupacion.value = p.ocupacion || '';
    form.enfermedades_preexistentes.value = p.enfermedades_preexistentes || '';
    if (form.alergias) form.alergias.value = p.alergias || '';
    form.observaciones.value = p.observaciones || '';
    form.pa.value = p.pa || '';
    form.pmin.value = p.pmin || '';
    form.pmax.value = p.pmax || '';
    form.imc.value = p.imc || '';
    form.t.value = p.t || '';
    form.pposible.value = p.pposible || '';
    form.medicacion.value = p.medicacion || '';
    form.ejercicio_fisico.value = p.ejercicio_fisico || '';

    // Actualizar edad luego de cargar datos
    actualizarEdadUI();

    // Ajustar altura de textareas según contenido
    inicializarAutoGrowTextareasPerfil();
  } catch (e) {
    manejarErrorAPI(e);
  }
}

// * cargarConsultasPaciente(id): lista consultas asociadas al paciente
async function cargarConsultasPaciente(id) {
  try {
    const resp = await fetch(`/api/consultas/paciente/${id}`, { credentials: 'include' });
    if (!resp.ok) return manejarErrorAPI(null, resp);
    const consultas = await resp.json();

    const tbody = document.getElementById('consultas-paciente-tbody');
    const sin = document.getElementById('sin-consultas-paciente');

    if (!consultas.length) {
      tbody.innerHTML = '';
      sin.classList.remove('hidden');
      return;
    }
    sin.classList.add('hidden');

    tbody.innerHTML = consultas.map(c => `
      <tr>
        <td>${formatearFecha(c.fecha)} ${c.hora ? c.hora.substring(0,5) : ''}</td>
        <td>${c.motivo_consulta || '-'}</td>
        <td>${c.diagnostico || '-'}</td>
        <td><a class="btn btn-sm" href="consulta.html?id=${c.id_consulta}">Ver</a></td>
      </tr>
    `).join('');
  } catch (e) {
    manejarErrorAPI(e);
  }
}

// * configurarEventosPerfil(id): wire de submit, navegación y nueva consulta para el paciente
function configurarEventosPerfil(id) {
  const form = document.getElementById('form-perfil-paciente');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
  // Asegurar que los campos opcionales no definidos se envían como string vacío en lugar de undefined
  if (!('telefono_adicional' in data)) data.telefono_adicional = '';
  // Asegurar que los campos clínicos se envíen aunque estén vacíos
  for (const campo of ['pa','pmin','pmax','imc','t','pposible','medicacion','ejercicio_fisico']) {
    if (!(campo in data)) data[campo] = '';
  }

    if (!validarDNI(data.dni)) {
      mostrarAlerta('DNI inválido', 'error');
      return;
    }
    if (data.email && !validarEmail(data.email)) {
      mostrarAlerta('Email inválido', 'error');
      return;
    }

    try {
      const resp = await fetch(`/api/pacientes/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(data)
      });
      const result = await resp.json();
      if (resp.ok) {
        mostrarAlerta('Perfil guardado', 'success');
      } else {
        manejarErrorAPI(result, resp);
        mostrarAlerta(result.error || 'No se pudo guardar', 'error');
      }
    } catch (e) { manejarErrorAPI(e); }
  });

  document.getElementById('btn-cancelar-perfil').addEventListener('click', () => {
    window.history.length > 1 ? window.history.back() : window.location.href = 'inicio.html';
  });

  const abrir = document.getElementById('btn-abrir-nueva-consulta');
  if (abrir) {
    // Abrir página de consulta en modo nueva consulta con el id del paciente
    abrir.addEventListener('click', () => {
      const pid = id;
      const url = new URL(window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'consulta.html');
      url.searchParams.set('nuevo', '1');
      if (pid) url.searchParams.set('id_paciente', pid);
      window.location.href = url.toString();
    });
  }

  // Recalcular edad al cambiar la fecha de nacimiento
  const campoFecha = form.querySelector('input[name="fecha_nacimiento"]');
  if (campoFecha) {
    ['change', 'input'].forEach(ev => campoFecha.addEventListener(ev, actualizarEdadUI));
  }
}

// * mejorarUXPerfil(modoEdicion): enfoque inicial, autogrow, y comportamientos menores
function mejorarUXPerfil(modoEdicion = false) {
  // Mejoras simples: auto-scroll cuando se abre la nueva consulta
  // El card de nueva consulta inline fue removido; se abre consulta.html directamente

  // Si viene en modo edición desde la lista, enfocar el formulario del perfil
  if (modoEdicion) {
    const form = document.getElementById('form-perfil-paciente');
    if (form) {
      setTimeout(() => form.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      const firstInput = form.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }
  }

  // Prefijar fecha de nueva consulta a hoy
  // Sin formulario inline, no es necesario prefijar fecha aquí

  // Garantizar auto-grow inicial por si el perfil ya está cargado
  inicializarAutoGrowTextareasPerfil();
}

// Mostrar edad (en años) junto a la fecha de nacimiento
// * actualizarEdadUI(): calcula edad y la muestra junto a la fecha de nacimiento
function actualizarEdadUI() {
  try {
    const form = document.getElementById('form-perfil-paciente');
    if (!form) return;
    const fecha = form.fecha_nacimiento ? form.fecha_nacimiento.value : '';
    const span = document.getElementById('edad-texto');
    if (!span) return;
    if (!fecha) { span.textContent = ''; return; }
    const edad = calcularEdad(fecha);
    if (edad === '' || isNaN(edad) || edad < 0) { span.textContent = ''; return; }
    span.textContent = `${edad} años`;
  } catch {
    // noop
  }
}

// Auto-grow para textareas dentro del perfil del paciente
// * inicializarAutoGrowTextareasPerfil(): ajusta la altura de textareas según contenido
function inicializarAutoGrowTextareasPerfil() {
  try {
    const form = document.getElementById('form-perfil-paciente');
    if (!form) return;
    const areas = form.querySelectorAll('textarea');
    areas.forEach((area) => {
      const autoGrow = () => {
        area.style.height = 'auto';
        area.style.overflowY = 'hidden';
        // Altura mínima basada en atributo rows si existe; si no, usar 2 como default
        const cs = window.getComputedStyle(area);
        let lineHeight = parseFloat(cs.lineHeight);
        if (isNaN(lineHeight)) {
          const fontSize = parseFloat(cs.fontSize) || 16;
          lineHeight = Math.round(fontSize * 1.4);
        }
        const minRowsAttr = parseInt(area.getAttribute('rows') || '2', 10);
        const minRows = Number.isFinite(minRowsAttr) && minRowsAttr > 0 ? minRowsAttr : 2;
        const minHeight = Math.max(1, lineHeight * minRows);
        const needed = area.scrollHeight;
        area.style.height = Math.max(minHeight, needed) + 'px';
      };
      // Inicializar y bindear eventos
      requestAnimationFrame(autoGrow);
      area.addEventListener('input', autoGrow);
      area.addEventListener('change', autoGrow);
      area.addEventListener('paste', () => setTimeout(autoGrow, 0));
    });
  } catch {}
}
