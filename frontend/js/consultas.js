// * Lógica de Consultas
// * Permite listar todas, filtrar por fecha/paciente y crear nuevas consultas.
// * Incluye paginación simple en cliente.

let estadoConsultas = { lista: [], pagina: 1, tam: 10 };

document.addEventListener('DOMContentLoaded', async () => {
  const acceso = await inicializarPagina();
  if (!acceso) return;

  await cargarConsultas();
  configurarEventosConsultas();
  integrarSelectorPacientesConsulta();
});

// * cargarConsultas({ tipo, valor }) — tipo ∈ { 'todas', 'fecha', 'paciente' }
async function cargarConsultas(opcion = { tipo: 'todas' }) {
  try {
    let url = '/api/consultas';
    if (opcion.tipo === 'fecha' && opcion.valor) {
      url = `/api/consultas/fecha/${encodeURIComponent(opcion.valor)}`;
    }
    if (opcion.tipo === 'paciente' && opcion.valor) {
      url = `/api/consultas/paciente/${encodeURIComponent(opcion.valor)}`;
    }

    const resp = await fetch(url, { credentials: 'include' });
    if (!resp.ok) return manejarErrorAPI(null, resp);
    const consultas = await resp.json();

    estadoConsultas.lista = consultas;
    estadoConsultas.pagina = 1;
    renderConsultasPagina();
  } catch (e) {
    manejarErrorAPI(e);
  }
}

// * integrarSelectorPacientesConsulta(): usa el modal selector para completar id_paciente
function integrarSelectorPacientesConsulta() {
  const display = document.getElementById('paciente-display-consulta');
  const hidden = document.querySelector('#form-nueva-consulta [name="id_paciente"]');
  const btn = document.getElementById('btn-seleccionar-paciente-consulta');
  if (!display || !hidden || !btn) return;
  btn.addEventListener('click', () => {
    abrirSelectorPacientes({
      onSelect: (p) => {
        display.value = `${p.nombre} ${p.apellido} (DNI ${p.dni})`;
        hidden.value = p.id_paciente;
      }
    });
  });
}

// * configurarEventosConsultas(): wire de botones de filtros y alta inline
function configurarEventosConsultas() {
  document.getElementById('btn-todas').addEventListener('click', () => cargarConsultas());

  document.getElementById('btn-filtrar-fecha').addEventListener('click', () => {
    const fecha = document.getElementById('filtro-fecha').value;
    if (!fecha) {
      mostrarAlerta('Selecciona una fecha', 'warning');
      return;
    }
    cargarConsultas({ tipo: 'fecha', valor: fecha });
  });

  document.getElementById('btn-filtrar-paciente').addEventListener('click', () => {
    const id = document.getElementById('filtro-id-paciente').value.trim();
    if (!id) {
      mostrarAlerta('Ingresa ID de paciente', 'warning');
      return;
    }
    cargarConsultas({ tipo: 'paciente', valor: id });
  });

  document.getElementById('btn-nueva-consulta').addEventListener('click', () => {
    document.getElementById('card-nueva-consulta').classList.remove('hidden');
  });

  document.getElementById('btn-cancelar-consulta').addEventListener('click', () => {
    document.getElementById('card-nueva-consulta').classList.add('hidden');
    limpiarFormulario('form-nueva-consulta');
  });

  document.getElementById('form-nueva-consulta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());

    if (!data.motivo_consulta || !data.id_paciente || !data.fecha) {
      mostrarAlerta('Paciente, fecha y motivo de consulta son requeridos', 'error');
      return;
    }

    if (!data.id_paciente || !data.fecha) {
      mostrarAlerta('ID Paciente y fecha son requeridos', 'error');
      return;
    }

    try {
      // Evitar doble submit
      const btn = document.getElementById('btn-guardar-consulta');
      if (btn && btn.disabled) return;
      setButtonLoading('btn-guardar-consulta', true);
      const resp = await fetch('/api/consultas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const result = await resp.json();
      if (resp.ok) {
        mostrarAlerta('Consulta creada con éxito', 'success');
        document.getElementById('card-nueva-consulta').classList.add('hidden');
        limpiarFormulario('form-nueva-consulta');
        await cargarConsultas();
      } else {
        manejarErrorAPI(result, resp);
        mostrarAlerta(result.error || 'No se pudo crear la consulta', 'error');
      }
    } catch (e) {
      manejarErrorAPI(e);
    } finally {
      setButtonLoading('btn-guardar-consulta', false);
    }
  });
}

// * eliminarConsulta(id)
async function eliminarConsulta(id) {
  if (!confirmarAccion('¿Eliminar consulta?')) return;
  try {
    const resp = await fetch(`/api/consultas/${id}`, { method: 'DELETE', credentials: 'include' });
    if (resp.ok) {
      mostrarAlerta('Consulta eliminada', 'success');
      await cargarConsultas();
    } else {
      const result = await resp.json();
      mostrarAlerta(result.error || 'No se pudo eliminar', 'error');
    }
  } catch (e) {
    manejarErrorAPI(e);
  }
}

// * renderConsultasPagina(): aplica paginación y pinta tabla
function renderConsultasPagina() {
  const { lista, pagina, tam } = estadoConsultas;
  const inicio = (pagina - 1) * tam;
  const items = lista.slice(inicio, inicio + tam);
  const tbody = document.getElementById('consultas-tbody');
  const sin = document.getElementById('sin-consultas');

  if (!items.length) {
    tbody.innerHTML = '';
    sin.classList.remove('hidden');
  } else {
    sin.classList.add('hidden');
    tbody.innerHTML = items.map(c => `
      <tr>
        <td>${formatearFecha(c.fecha)}</td>
        <td>
          <span>${c.nombre} ${c.apellido} (DNI ${c.dni})</span>
          <button class="btn btn-sm ml-2" onclick="abrirPerfilPaciente(${c.id_paciente || c.paciente_id})">Ver perfil</button>
        </td>
        <td>${c.motivo_consulta || '-'}</td>
        <td>${c.diagnostico || '-'}</td>
        <td>${c.tratamiento || '-'}</td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-sm" onclick="verConsulta(${c.id_consulta})"><span class="material-symbols-outlined" aria-hidden="true">visibility</span> Ver</button>
            <button class="btn btn-sm btn-error" onclick="eliminarConsulta(${c.id_consulta})">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join('');
  }
  renderPaginacionConsultas();
}

// * verConsulta(id): navega a consulta.html?id=...
function verConsulta(id) {
  if (!id) return;
  window.location.href = `consulta.html?id=${id}`;
}

// * renderPaginacionConsultas(): genera paginador (máx. 5 páginas visibles)
function renderPaginacionConsultas() {
  const { lista, pagina, tam } = estadoConsultas;
  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tam));
  const cont = document.getElementById('paginacion-consultas');
  if (!cont) return;
  const btn = (label, disabled, onClick) => `<button class="btn btn-sm ${disabled ? 'btn-secondary' : ''}" ${disabled ? 'disabled' : ''} onclick="${onClick}">${label}</button>`;
  const items = [];
  items.push(btn('« Anterior', pagina === 1, `cambiarPaginaConsultas(${pagina - 1})`));
  const maxNums = 5; let start = Math.max(1, pagina - Math.floor(maxNums/2)); let end = Math.min(totalPaginas, start + maxNums - 1); if (end - start < maxNums - 1) start = Math.max(1, end - maxNums + 1);
  for (let i = start; i <= end; i++) items.push(`<button class="btn btn-sm ${i===pagina?'btn-primary':''}" onclick="cambiarPaginaConsultas(${i})">${i}</button>`);
  items.push(btn('Siguiente »', pagina === totalPaginas, `cambiarPaginaConsultas(${pagina + 1})`));
  cont.innerHTML = items.join(' ');
  window.cambiarPaginaConsultas = (p) => { if (p<1 || p>totalPaginas) return; estadoConsultas.pagina = p; renderConsultasPagina(); };
}
