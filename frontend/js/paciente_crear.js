// ! Crear Paciente (frontend)
// * Propósito: alta de paciente desde página dedicada; soporta prefill desde Turnos y retorno condicional
// * Flujos:
//   - Prefill: acepta ?nombre=&apellido=&cobertura=
//   - Retorno: ?returnTo=turnos redirige a turnos.html; si no, redirige a perfil del paciente creado
// * Validaciones mínimas: DNI y email (si está presente)
// ? Endpoints: POST /api/pacientes

document.addEventListener('DOMContentLoaded', async () => {
  const acceso = await inicializarPagina();
  if (!acceso) return;

  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo');
  // Prefill si viene de Turnos
  const nombrePref = params.get('nombre');
  const apellidoPref = params.get('apellido');
  const coberturaPref = params.get('cobertura');
  if (nombrePref) {
    const el = document.querySelector('#form-crear-paciente [name="nombre"]');
    if (el) el.value = nombrePref;
  }
  if (apellidoPref) {
    const el = document.querySelector('#form-crear-paciente [name="apellido"]');
    if (el) el.value = apellidoPref;
  }
  if (coberturaPref) {
    const el = document.querySelector('#form-crear-paciente [name="cobertura"]');
    if (el) el.value = coberturaPref;
  }

  document.getElementById('btn-cancelar-crear').addEventListener('click', () => {
    if (returnTo === 'turnos') window.location.href = 'turnos.html';
    else window.history.length > 1 ? window.history.back() : window.location.href = 'inicio.html';
  });

  document.getElementById('form-crear-paciente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());

    if (!validarDNI(data.dni)) { mostrarAlerta('DNI inválido', 'error'); return; }
    if (data.email && !validarEmail(data.email)) { mostrarAlerta('Email inválido', 'error'); return; }

    try {
      const resp = await fetch('/api/pacientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(data) });
      const result = await resp.json();
      if (resp.ok) {
        mostrarAlerta('Paciente creado', 'success');
        setTimeout(() => {
          if (returnTo === 'turnos') window.location.href = 'turnos.html';
          else window.location.href = `perfil_paciente.html?id=${result.id_paciente}`;
        }, 500);
      } else {
        manejarErrorAPI(result, resp);
        mostrarAlerta(result.error || 'No se pudo crear', 'error');
      }
    } catch (e) { manejarErrorAPI(e); }
  });

  // Mostrar edad dinámica al lado de la fecha de nacimiento
  const form = document.getElementById('form-crear-paciente');
  const campoFecha = form ? form.querySelector('input[name="fecha_nacimiento"]') : null;
  const spanEdad = document.getElementById('edad-texto-crear');
  const actualizarEdadCrear = () => {
    try {
      if (!campoFecha || !spanEdad) return;
      const fecha = campoFecha.value;
      if (!fecha) { spanEdad.textContent = ''; return; }
      const edad = calcularEdad(fecha);
      if (edad === '' || isNaN(edad) || edad < 0) { spanEdad.textContent = ''; return; }
      spanEdad.textContent = `${edad} años`;
    } catch {}
  };
  if (campoFecha) {
    ['change', 'input'].forEach(ev => campoFecha.addEventListener(ev, actualizarEdadCrear));
    // Inicializar al cargar por si hay prefill
    actualizarEdadCrear();
  }

  // Auto-grow para textareas dentro del formulario de crear paciente
  function inicializarAutoGrowTextareasCrear() {
    try {
      if (!form) return;
      const areas = form.querySelectorAll('textarea');
      areas.forEach((area) => {
        const autoGrow = () => {
          area.style.height = 'auto';
          area.style.overflowY = 'hidden';
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

  // Inicializar auto-grow (después del posible prefill)
  inicializarAutoGrowTextareasCrear();
});
