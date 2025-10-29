// * Nuevo Turno (página separada)
// * Crea un turno sin forzar creación de paciente. Si no hay id_paciente, usa nombre/apellido temporales.
// * Autocompleta cobertura si se selecciona un paciente existente.

document.addEventListener('DOMContentLoaded', async () => {
  const acceso = await inicializarPagina();
  if (!acceso) return;

  const params = getURLParams();
  const form = document.getElementById('form-nuevo-turno');

  // * Prefill día si viene por query (?dia=YYYY-MM-DD). Si no, hoy.
  if (params.dia && form && form.dia) {
    form.dia.value = params.dia;
  } else if (form && form.dia) {
    // por defecto hoy
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    form.dia.value = `${yyyy}-${mm}-${dd}`;
  }

  integrarSelectorPacientesTurno_Nuevo();
  integrarAutocompletePaciente_Nuevo();
  configurarEventos_Nuevo();
});

// * integrarSelectorPacientesTurno_Nuevo(): usa el modal selector y autocompleta cobertura
function integrarSelectorPacientesTurno_Nuevo() {
  const display = document.getElementById('paciente-input');
  const hidden = document.querySelector('#form-nuevo-turno [name="id_paciente"]');
  const btn = document.getElementById('btn-seleccionar-paciente-turno');
  if (!display || !hidden || !btn) return;

  const abrir = (prefill='') => {
    abrirSelectorPacientes({
      prefill,
      onSelect: (p) => {
        display.value = `${p.nombre} ${p.apellido} (DNI ${p.dni})`;
        hidden.value = p.id_paciente;
        // Autocompletar cobertura si existe en el paciente
        const coberturaInput = document.querySelector('#form-nuevo-turno [name="cobertura"]');
        if (coberturaInput) coberturaInput.value = p.cobertura || '';
      }
    });
  };

  btn.addEventListener('click', () => abrir(display.value.trim()));
  display.addEventListener('input', () => { hidden.value = ''; });
}

// * integrarAutocompletePaciente_Nuevo(): autocompletado con carga de cobertura en selección
function integrarAutocompletePaciente_Nuevo() {
  const input = document.getElementById('paciente-input');
  const menu = document.getElementById('paciente-sugerencias');
  const hidden = document.querySelector('#form-nuevo-turno [name="id_paciente"]');
  if (!input || !menu || !hidden) return;

  let timer = null;
  let opciones = [];
  const ocultar = () => { menu.classList.add('hidden'); menu.innerHTML=''; };
  const mostrar = (items) => {
    if (!items.length) { ocultar(); return; }
    menu.innerHTML = items.map(p => `
      <div class="item-sugerencia" data-id="${p.id_paciente}" style="padding:8px; cursor:pointer; display:flex; justify-content:space-between;">
        <span>${p.nombre} ${p.apellido}</span>
        <span style="color: var(--color-gray-600);">DNI ${p.dni || '-'}</span>
      </div>
    `).join('');
    menu.classList.remove('hidden');
  };

  const buscar = async (q) => {
    try {
      const url = q ? `/api/pacientes?buscar=${encodeURIComponent(q)}` : '/api/pacientes';
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) { manejarErrorAPI(null, resp); return; }
      const data = await resp.json();
      opciones = data.slice(0, 20);
      mostrar(opciones);
    } catch (e) { manejarErrorAPI(e); }
  };

  input.addEventListener('input', () => {
    hidden.value = '';
    const q = input.value.trim();
    if (timer) clearTimeout(timer);
    if (!q) { ocultar(); return; }
    timer = setTimeout(() => buscar(q), 200);
  });

  input.addEventListener('focus', () => {
    const q = input.value.trim();
    if (q) buscar(q);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { ocultar(); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (opciones.length > 0) {
        const p = opciones[0];
        input.value = `${p.nombre} ${p.apellido} (DNI ${p.dni || '-'})`;
        hidden.value = p.id_paciente;
        // Autocompletar cobertura
        const coberturaInput = document.querySelector('#form-nuevo-turno [name="cobertura"]');
        if (coberturaInput) coberturaInput.value = p.cobertura || '';
        ocultar();
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#paciente-sugerencias') || e.target === input) return;
    ocultar();
  });

  menu.addEventListener('click', (e) => {
    const row = e.target.closest('.item-sugerencia');
    if (!row) return;
    const id = parseInt(row.dataset.id, 10);
    const p = opciones.find(x => x.id_paciente === id);
    if (!p) return;
    input.value = `${p.nombre} ${p.apellido} (DNI ${p.dni || '-'})`;
    hidden.value = p.id_paciente;
    // Autocompletar cobertura
    const coberturaInput = document.querySelector('#form-nuevo-turno [name="cobertura"]');
    if (coberturaInput) coberturaInput.value = p.cobertura || '';
    ocultar();
  });
}

// * configurarEventos_Nuevo(): navegación de retorno, cancelar y submit con normalización
function configurarEventos_Nuevo() {
  // Volver a Turnos (mantiene día si existe)
  const btnVolver = document.getElementById('btn-volver-turnos');
  if (btnVolver) {
    btnVolver.addEventListener('click', () => {
      try {
        const dia = document.querySelector('#form-nuevo-turno [name="dia"]').value;
        const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
        const url = new URL(base + 'turnos.html');
        if (dia) url.searchParams.set('dia', dia);
        window.location.href = url.toString();
      } catch (e) { window.location.href = 'turnos.html'; }
    });
  }

  document.getElementById('btn-cancelar-turno').addEventListener('click', () => {
    window.close();
  });

  document.getElementById('form-nuevo-turno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.primera_vez = formData.get('primera_vez') ? true : false;

    if (!data.dia || !data.horario) {
      mostrarAlerta('Día y horario son requeridos', 'error');
      return;
    }

    // ? Si no hay paciente seleccionado: NO crear paciente. Usar nombre/apellido temporales.
    if (!data.id_paciente) {
      const nombreCompleto = (document.getElementById('paciente-input')?.value || '').trim();
      const partes = nombreCompleto.split(/\s+/).filter(Boolean);
      if (partes.length < 2) {
        mostrarAlerta('Ingresa nombre y apellido del paciente (mínimo) para crear el turno', 'warning');
        return;
      }
      data.paciente_nombre_tmp = partes.slice(0, -1).join(' ');
      data.paciente_apellido_tmp = partes.slice(-1).join(' ');
    }

    // Normalizar cadenas vacías a null cuando aplique
    if (data.cobertura !== undefined && String(data.cobertura).trim() === '') data.cobertura = null;
    if (data.detalle !== undefined && String(data.detalle).trim() === '') data.detalle = null;

    try {
      setButtonLoading('btn-guardar-turno', true);
      const resp = await fetch('/api/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const result = await resp.json();
      if (resp.ok) {
        mostrarAlerta('Turno creado con éxito', 'success');
        // Si se abrió desde turnos, refrescar día y cerrar
        try {
          if (window.opener && !window.opener.closed) {
            const dia = data.dia;
            const base = window.opener.location.origin + window.opener.location.pathname.replace(/[^/]*$/, '');
            const url = new URL(base + 'turnos.html');
            if (dia) url.searchParams.set('dia', dia);
            window.opener.location.href = url.toString();
          }
        } catch (err) {
          // no-op
        }
        setTimeout(() => window.close(), 400);
      } else {
        manejarErrorAPI(result, resp);
        mostrarAlerta(result.error || 'No se pudo crear el turno', 'error');
      }
    } catch (e) {
      manejarErrorAPI(e);
    } finally {
      setButtonLoading('btn-guardar-turno', false);
    }
  });
}
