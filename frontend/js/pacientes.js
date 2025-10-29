// * Lógica de Pacientes
// * Lista/busca pacientes, permite alta rápida, editar y eliminar.
// * Paginación simple en cliente para listado principal.

let estadoPacientes = { lista: [], pagina: 1, tam: 10, termino: '' };

document.addEventListener('DOMContentLoaded', async () => {
  const acceso = await inicializarPagina();
  if (!acceso) return;

  await cargarPacientes();
  configurarEventosPacientes();

  // Si viene id en la URL, cargar detalle automáticamente
  const { id } = getURLParams();
  if (id) {
    cargarDetallePaciente(id);
  }
});

// * cargarPacientes(termino)
// > GET /api/pacientes (opcional ?buscar=termino) y renderiza listado paginado.
async function cargarPacientes(termino = '') {
  try {
    const url = termino ? `/api/pacientes?buscar=${encodeURIComponent(termino)}` : '/api/pacientes';
    const resp = await fetch(url, { credentials: 'include' });
    if (!resp.ok) return manejarErrorAPI(null, resp);
    const pacientes = await resp.json();

    const tbody = document.getElementById('pacientes-tbody');
    const sin = document.getElementById('sin-pacientes');

    if (!pacientes.length) {
      tbody.innerHTML = '';
      sin.classList.remove('hidden');
      return;
    }
    sin.classList.add('hidden');
    estadoPacientes.lista = pacientes;
    estadoPacientes.termino = termino;
    estadoPacientes.pagina = 1;
    renderPaginaPacientes();
  } catch (e) {
    manejarErrorAPI(e);
  }
}

// * configurarEventosPacientes(): conecta búsqueda con debounce, alta y validaciones
function configurarEventosPacientes() {
  const input = document.getElementById('busqueda');
  document.getElementById('btn-buscar').addEventListener('click', () => {
    const termino = input.value.trim();
    cargarPacientes(termino);
  });
  input.addEventListener('input', debounce(() => {
    const termino = input.value.trim();
    cargarPacientes(termino);
  }, 300));

  document.getElementById('btn-nuevo').addEventListener('click', () => {
    document.getElementById('card-nuevo').classList.remove('hidden');
    document.getElementById('panel-listado').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('btn-cancelar-nuevo').addEventListener('click', () => {
    document.getElementById('card-nuevo').classList.add('hidden');
    limpiarFormulario('form-nuevo-paciente');
  });

  document.getElementById('form-nuevo-paciente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    
    // Validaciones mínimas
    if (!validarDNI(data.dni)) {
      mostrarAlerta('DNI inválido', 'error');
      return;
    }
    if (data.email && !validarEmail(data.email)) {
      mostrarAlerta('Email inválido', 'error');
      return;
    }

    try {
      const resp = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const result = await resp.json();
      if (resp.ok) {
        mostrarAlerta('Paciente creado con éxito', 'success');
        document.getElementById('card-nuevo').classList.add('hidden');
        limpiarFormulario('form-nuevo-paciente');
        await cargarPacientes();
        if (result.id_paciente) cargarDetallePaciente(result.id_paciente);
      } else {
        manejarErrorAPI(result, resp);
        mostrarAlerta(result.error || 'No se pudo crear el paciente', 'error');
      }
    } catch (e) {
      manejarErrorAPI(e);
    }
  });
}

// * renderPaginaPacientes(): pagina en cliente y genera filas de tabla
function renderPaginaPacientes() {
  const { lista, pagina, tam } = estadoPacientes;
  const inicio = (pagina - 1) * tam;
  const paginaItems = lista.slice(inicio, inicio + tam);

  const tbody = document.getElementById('pacientes-tbody');
  tbody.innerHTML = paginaItems.map(p => `
    <tr>
      <td>${p.nombre}</td>
      <td>${p.apellido}</td>
      <td>${p.dni}</td>
      <td>${p.telefono || '-'}</td>
      <td>${p.cobertura || '-'}</td>
      <td>
        <div class="flex gap-4">
          <button class="btn btn-sm btn-primary" onclick="abrirPerfilPaciente(${p.id_paciente})">Ver</button>
          <button class="btn btn-sm btn-error" onclick="eliminarPaciente(${p.id_paciente})">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');

  renderPaginacion();
}

// Abre el perfil del paciente en una nueva pestaña. Si editar=true, abre con ?edit=1
// * abrirPerfilPaciente(id, editar): abre nueva pestaña a perfil_paciente.html
function abrirPerfilPaciente(id, editar = false) {
  const url = new URL(window.location.origin + window.location.pathname.replace(/[^/]*$/, 'perfil_paciente.html'));
  url.searchParams.set('id', id);
  if (editar) url.searchParams.set('edit', '1');
  window.open(url.toString(), '_blank');
}

// * renderPaginacion(): genera paginador simple con ventana de 5
function renderPaginacion() {
  const { lista, pagina, tam } = estadoPacientes;
  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tam));
  const cont = document.getElementById('paginacion');
  if (!cont) return;

  const btn = (label, disabled, onClick) => `<button class="btn btn-sm ${disabled ? 'btn-secondary' : ''}" ${disabled ? 'disabled' : ''} onclick="${onClick}">${label}</button>`;

  const items = [];
  items.push(btn('« Anterior', pagina === 1, `cambiarPagina(${pagina - 1})`));
  const maxNums = 5;
  let start = Math.max(1, pagina - Math.floor(maxNums / 2));
  let end = Math.min(totalPaginas, start + maxNums - 1);
  if (end - start < maxNums - 1) start = Math.max(1, end - maxNums + 1);
  for (let i = start; i <= end; i++) {
    items.push(`<button class="btn btn-sm ${i === pagina ? 'btn-primary' : ''}" onclick="cambiarPagina(${i})">${i}</button>`);
  }
  items.push(btn('Siguiente »', pagina === totalPaginas, `cambiarPagina(${pagina + 1})`));

  cont.innerHTML = items.join(' ');

  // Exponer handler
  window.cambiarPagina = (p) => {
    if (p < 1) return;
    if (p > totalPaginas) return;
    estadoPacientes.pagina = p;
    renderPaginaPacientes();
  };
}

// * cargarDetallePaciente(id): muestra card con datos y prepara edición
async function cargarDetallePaciente(id) {
  try {
    const resp = await fetch(`/api/pacientes/${id}`, { credentials: 'include' });
    if (!resp.ok) return manejarErrorAPI(null, resp);
    const p = await resp.json();

    const card = document.getElementById('card-detalle');
    card.classList.remove('hidden');
    document.getElementById('detalle-paciente').innerHTML = `
      <div class="form-row">
        <div>
          <p><strong>${p.nombre} ${p.apellido}</strong></p>
          <p>DNI: ${p.dni}</p>
          <p>Edad: ${calcularEdad(p.fecha_nacimiento)} años</p>
          <p>Cobertura: ${p.cobertura || '-'}</p>
          <p>Tel: ${p.telefono || '-'}</p>
          <p>Email: ${p.email || '-'}</p>
        </div>
      </div>
    `;
    // Pre cargar edición
    prepararEdicionPaciente(p);
  } catch (e) {
    manejarErrorAPI(e);
  }
}

// * editarPaciente(id): obtiene datos y abre card de edición prellenada
async function editarPaciente(id) {
  try {
    const resp = await fetch(`/api/pacientes/${id}`, { credentials: 'include' });
    if (!resp.ok) return manejarErrorAPI(null, resp);
    const p = await resp.json();
    prepararEdicionPaciente(p, true);
  } catch (e) {
    manejarErrorAPI(e);
  }
}

// * prepararEdicionPaciente(paciente, abrir): setea valores en form y registra submit
function prepararEdicionPaciente(paciente, abrir = false) {
  const card = document.getElementById('card-editar');
  const form = document.getElementById('form-editar-paciente');
  if (!form) return;

  // Setear dataset con id
  form.dataset.id = paciente.id_paciente;

  // Setear valores
  form.nombre.value = paciente.nombre || '';
  form.apellido.value = paciente.apellido || '';
  form.dni.value = paciente.dni || '';
  form.fecha_nacimiento.value = paciente.fecha_nacimiento ? paciente.fecha_nacimiento.substring(0,10) : '';
  form.sexo.value = paciente.sexo || 'otro';
  form.telefono.value = paciente.telefono || '';
  form.email.value = paciente.email || '';
  form.cobertura.value = paciente.cobertura || '';
  form.plan.value = paciente.plan || '';
  form.numero_afiliado.value = paciente.numero_afiliado || '';
  form.direccion.value = paciente.direccion || '';

  if (abrir) card.classList.remove('hidden');

  // Wire eventos una sola vez
  if (!form._wired) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.id;
      const data = Object.fromEntries(new FormData(form).entries());

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
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        });
        const result = await resp.json();
        if (resp.ok) {
          mostrarAlerta('Paciente actualizado', 'success');
          card.classList.add('hidden');
          await cargarPacientes();
          await cargarDetallePaciente(id);
        } else {
          manejarErrorAPI(result, resp);
          mostrarAlerta(result.error || 'No se pudo actualizar', 'error');
        }
      } catch (e) {
        manejarErrorAPI(e);
      }
    });
    document.getElementById('btn-cancelar-editar').addEventListener('click', () => {
      document.getElementById('card-editar').classList.add('hidden');
    });
    form._wired = true;
  }
}

// * eliminarPaciente(id)
async function eliminarPaciente(id) {
  if (!confirmarAccion('¿Eliminar paciente?')) return;
  try {
    const resp = await fetch(`/api/pacientes/${id}`, { method: 'DELETE', credentials: 'include' });
    if (resp.ok) {
      mostrarAlerta('Paciente eliminado', 'success');
      await cargarPacientes();
    } else {
      const result = await resp.json();
      mostrarAlerta(result.error || 'No se pudo eliminar', 'error');
    }
  } catch (e) {
    manejarErrorAPI(e);
  }
}
