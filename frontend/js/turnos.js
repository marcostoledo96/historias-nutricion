// * Lógica de Turnos (lista agenda por día)
// * Muestra turnos de un día, permite navegar entre fechas y gestionar estados.
// * Alta de turno se abre en nueva ventana (turno_nuevo.html). Sin paginación en el listado.

let estadoTurnos = { lista: [], pagina: 1, tam: Number.MAX_SAFE_INTEGER };

// * labelSituacion(s): transforma identificadores a etiquetas legibles
//   "en_espera" -> "En espera" (sin guiones bajos y con mayúscula inicial)
function labelSituacion(s) {
  const t = String(s || '').replace(/_/g, ' ');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

document.addEventListener('DOMContentLoaded', async () => {
  const acceso = await inicializarPagina();
  if (!acceso) return;

  // * Prefijar el input de día (desde ?dia=YYYY-MM-DD) o usar hoy por defecto
  const diaInput = document.getElementById('dia');
  const params = getURLParams();
  if (params.dia) {
    // Validar y aplicar fecha en local
    if (diaInput) diaInput.value = params.dia;
    await cargarTurnosDia(params.dia);
  } else {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    if (diaInput) diaInput.value = `${yyyy}-${mm}-${dd}`;
    await cargarTurnosHoy();
  }
  configurarEventosTurnos();
  integrarSelectorPacientesTurno();
  integrarAutocompletePaciente();
});

// * recargarVistaActual(): refresca manteniendo el día actual del input
function recargarVistaActual() {
  const diaEl = document.getElementById('dia');
  const val = diaEl && diaEl.value ? diaEl.value : null;
  if (val) return cargarTurnosDia(val);
  return cargarTurnosHoy();
}

async function cargarTurnosHoy() {
  await cargarTurnosDesde('/api/turnos/hoy');
}

// * integrarSelectorPacientesTurno(): conecta input/botón con el modal selector reutilizable
function integrarSelectorPacientesTurno() {
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
      }
    });
  };

  // Abrir con botón
  btn.addEventListener('click', () => abrir(display.value.trim()));

  // Abrir con Enter/Espacio en el input
  // Nota: ya no abrimos el modal con Enter; Enter se maneja en el autocompletado

  // Si el usuario escribe, limpiar la selección previa (id oculto)
  display.addEventListener('input', () => {
    hidden.value = '';
  });
}

// * integrarAutocompletePaciente(): autocompletado inline (consulta /api/pacientes)
function integrarAutocompletePaciente() {
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

  // Eventos
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
      // Elegir la primera opción visible si existe
      e.preventDefault();
      if (opciones.length > 0) {
        const p = opciones[0];
        input.value = `${p.nombre} ${p.apellido} (DNI ${p.dni || '-'})`;
        hidden.value = p.id_paciente;
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
    ocultar();
  });
}

// * cargarTurnosDia(dia): carga turnos de un día específico
async function cargarTurnosDia(dia) {
  await cargarTurnosDesde(`/api/turnos/dia/${encodeURIComponent(dia)}`);
}

// Filtrado en memoria por nombre/apellido
// * filtrarTurnosPorNombreApellido(termino): filtro en memoria sobre nombre+apellido
function filtrarTurnosPorNombreApellido(termino) {
  const q = (termino || '').trim().toLowerCase();
  if (!q) return estadoTurnos.listaOriginal ? [...estadoTurnos.listaOriginal] : [...estadoTurnos.lista];
  const base = estadoTurnos.listaOriginal || estadoTurnos.lista;
  return base.filter(t => `${t.nombre || ''} ${t.apellido || ''}`.toLowerCase().includes(q));
}

// * cargarTurnosDesde(url): obtiene desde API, guarda en estado y renderiza
async function cargarTurnosDesde(url) {
  try {
    const resp = await fetch(url, { credentials: 'include' });
    if (!resp.ok) return manejarErrorAPI(null, resp);
    const turnos = await resp.json();
    estadoTurnos.lista = turnos;
    estadoTurnos.listaOriginal = [...turnos];
    estadoTurnos.pagina = 1;
    renderTurnosPagina();
  } catch (e) {
    manejarErrorAPI(e);
  }
}

// * renderTurnosPagina(): renderiza todos los turnos del día (sin paginación)
function renderTurnosPagina() {
  const { lista } = estadoTurnos;
  const items = lista; // Sin paginación: mostrar todo
  const tbody = document.getElementById('turnos-tbody');
  const sin = document.getElementById('sin-turnos');

  if (!items.length) {
    tbody.innerHTML = '';
    sin.classList.remove('hidden');
    return;
  }
  sin.classList.add('hidden');

  tbody.innerHTML = items.map(t => `
      <tr>
        <td><strong>${t.horario?.substring(0,5) || '-'}</strong></td>
        <td>
          <span>${t.nombre} ${t.apellido}</span>
            ${t.id_paciente ? `
              <button class="btn btn-sm ml-2" onclick="abrirPerfilPaciente(${t.id_paciente}, ${t.dni ? 'false' : 'true'})">${t.dni ? 'Ver perfil' : 'Completar perfil'}</button>
            ` : `
              <button class="btn btn-sm btn-secondary ml-2" onclick="crearPerfilDesdeTurno('${(t.nombre||'').replace(/'/g, "&#39;")}', '${(t.apellido||'').replace(/'/g, "&#39;")}', '${(t.cobertura||'').replace(/'/g, "&#39;")}')">Crear perfil</button>
            `}
        </td>
        <td>${t.dni}</td>
        <td>${t.cobertura || '-'}</td>
        <td>${getBadgeSituacion(t.situacion)}</td>
        <td>${t.hora_llegada ? t.hora_llegada.substring(0,5) : '-'}</td>
  <td>${t.primera_vez ? '✅' : '-'}</td>
        <td>
          <div class="flex gap-2">
            <select onchange="cambiarSituacion(${t.id_turno}, this.value)" class="form-select select-accion">
              ${['programado','en_espera','atendido','ausente','cancelado'].map(s => {
                const lbl = labelSituacion(s);
                return `<option value="${s}" ${s===t.situacion?'selected':''}>${lbl}</option>`;
              }).join('')}
            </select>
            <button class="btn btn-sm" onclick="editarTurno(${t.id_turno})"><span class=\"material-symbols-outlined\" aria-hidden=\"true\">edit</span> Editar</button>
            <button class="btn btn-sm btn-error" onclick="eliminarTurno(${t.id_turno})">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join('');
  // Sin paginación
}

// Paginación deshabilitada

// * configurarEventosTurnos(): wire de botones y navegación de fechas (local TZ safe)
function configurarEventosTurnos() {
  // Helper para actualizar el parámetro ?dia en la URL sin recargar
  const setParametroDia = (dia) => {
    const url = new URL(window.location);
    if (dia) url.searchParams.set('dia', dia);
    else url.searchParams.delete('dia');
    window.history.replaceState({}, '', url);
  };

  // Botón Hoy: setea input de fecha a hoy, limpia filtro en URL y carga
  document.getElementById('btn-ver-hoy').addEventListener('click', () => {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const diaHoy = `${yyyy}-${mm}-${dd}`;
    const diaEl = document.getElementById('dia');
    if (diaEl) diaEl.value = diaHoy;
    setParametroDia('');
    cargarTurnosHoy();
  });

  document.getElementById('btn-ver-dia').addEventListener('click', () => {
    const dia = document.getElementById('dia').value;
    if (!dia) {
      mostrarAlerta('Selecciona un día', 'warning');
      return;
    }
    // Persistir selección en URL y cargar
    const url = new URL(window.location);
    url.searchParams.set('dia', dia);
    window.history.replaceState({}, '', url);
    cargarTurnosDia(dia);
  });

  // Recarga automática al cambiar la fecha en el input
  const diaInput = document.getElementById('dia');
  if (diaInput) {
    diaInput.addEventListener('change', () => {
      const dia = diaInput.value;
      if (dia) {
        // Al cambiar de fecha, limpiar filtro de paciente para no ocultar resultados
        const filtro = document.getElementById('paciente-filtro');
        if (filtro) filtro.value = '';
        const url = new URL(window.location);
        url.searchParams.set('dia', dia);
        window.history.replaceState({}, '', url);
        cargarTurnosDia(dia);
      }
    });
    // Navegación día anterior / siguiente
    const btnPrev = document.getElementById('btn-dia-anterior');
    const btnNext = document.getElementById('btn-dia-siguiente');
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const parseLocalDate = (str) => {
      if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
      const [y, m, d] = str.split('-').map(Number);
      return new Date(y, m - 1, d); // construcción en horario local, evita shift por UTC
    };
    const mover = (delta) => {
      const base = diaInput.value ? parseLocalDate(diaInput.value) : parseLocalDate(fmt(new Date()));
      const d = base || new Date();
      d.setDate(d.getDate() + delta);
      const nuevo = fmt(d);
      diaInput.value = nuevo;
      const filtro = document.getElementById('paciente-filtro');
      if (filtro) filtro.value = '';
      setParametroDia(nuevo);
      cargarTurnosDia(nuevo);
    };
    if (btnPrev) btnPrev.addEventListener('click', () => mover(-1));
    if (btnNext) btnNext.addEventListener('click', () => mover(1));
  }

  // Ya manejado arriba: input permite escribir y abrir selector con Enter; botón también abre.

  document.getElementById('btn-filtrar-paciente').addEventListener('click', () => {
    const termino = document.getElementById('paciente-filtro').value;
    const filtrados = filtrarTurnosPorNombreApellido(termino);
    estadoTurnos.lista = filtrados;
    estadoTurnos.pagina = 1;
    renderTurnosPagina();
  });

  document.getElementById('btn-nuevo-turno').addEventListener('click', () => {
    // Abrir nueva ventana con la página de creación, prefijando el día actual del listado
    const diaAgenda = document.getElementById('dia')?.value || '';
    const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
    const url = new URL(base + 'turno_nuevo.html');
    if (diaAgenda) url.searchParams.set('dia', diaAgenda);
    window.open(url.toString(), '_blank');
  });

  const btnCancelar = document.getElementById('btn-cancelar-turno');
  if (btnCancelar) {
    btnCancelar.addEventListener('click', () => {
      document.getElementById('card-nuevo-turno').classList.add('hidden');
      limpiarFormulario('form-nuevo-turno');
    });
  }

  const formNuevo = document.getElementById('form-nuevo-turno');
  if (formNuevo) {
    // Si aún existe el formulario inline en el HTML, lo deshabilitamos para este flujo
    formNuevo.addEventListener('submit', (e) => {
      e.preventDefault();
      // Redirigir al modo ventana nueva
      const diaAgenda = document.getElementById('dia')?.value || '';
      const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
      const url = new URL(base + 'turno_nuevo.html');
      if (diaAgenda) url.searchParams.set('dia', diaAgenda);
      window.open(url.toString(), '_blank');
    });
  }

  // Selector de tamaño de página
    const selTam = document.getElementById('tam-pagina-turnos');
    if (selTam) {
      selTam.value = String(estadoTurnos.tam);
      selTam.addEventListener('change', () => {
        const nuevo = parseInt(selTam.value, 10);
        if (!isNaN(nuevo) && nuevo > 0) {
          estadoTurnos.tam = nuevo;
          estadoTurnos.pagina = 1;
          renderTurnosPagina();
        }
      });
    }
  }

// * marcarLlegada(idTurno): pone situacion=en_espera con hora_llegada=ahora
async function marcarLlegada(idTurno) {
  try {
    const resp = await fetch(`/api/turnos/${idTurno}/situacion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ situacion: 'en_espera', hora_llegada: new Date().toTimeString().substring(0,8) })
    });
    if (resp.ok) {
      mostrarAlerta('Paciente marcado como en espera', 'success');
      await recargarVistaActual();
    } else {
      const result = await resp.json();
      mostrarAlerta(result.error || 'No se pudo marcar llegada', 'error');
    }
  } catch (e) {
    manejarErrorAPI(e);
  }
}

// * marcarAtendido(idTurno)
async function marcarAtendido(idTurno) {
  try {
    const resp = await fetch(`/api/turnos/${idTurno}/situacion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ situacion: 'atendido' })
    });
    if (resp.ok) {
      mostrarAlerta('Turno marcado como atendido', 'success');
      await recargarVistaActual();
    } else {
      const result = await resp.json();
      mostrarAlerta(result.error || 'No se pudo marcar atendido', 'error');
    }
  } catch (e) {
    manejarErrorAPI(e);
  }
}

// * marcarCancelado(idTurno)
async function marcarCancelado(idTurno) {
  try {
    const resp = await fetch(`/api/turnos/${idTurno}/situacion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ situacion: 'cancelado' })
    });
    if (resp.ok) {
      mostrarAlerta('Turno cancelado', 'success');
      await recargarVistaActual();
    } else {
      const result = await resp.json();
      mostrarAlerta(result.error || 'No se pudo cancelar', 'error');
    }
  } catch (e) {
    manejarErrorAPI(e);
  }
}

// * cambiarSituacion(idTurno, situacion): actualiza select; si en_espera setea hora_llegada
async function cambiarSituacion(idTurno, situacion) {
  try {
    const data = { situacion };
    if (situacion === 'en_espera') {
      data.hora_llegada = new Date().toTimeString().substring(0,8);
    }
    const resp = await fetch(`/api/turnos/${idTurno}/situacion`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(data) });
    if (resp.ok) {
      mostrarAlerta('Situación actualizada', 'success');
      // Actualizar en memoria sin refetch completo
      const idx = estadoTurnos.lista.findIndex(t => t.id_turno === idTurno);
      if (idx > -1) { estadoTurnos.lista[idx].situacion = situacion; }
      renderTurnosPagina();
    } else {
      const result = await resp.json();
      mostrarAlerta(result.error || 'No se pudo actualizar situación', 'error');
    }
  } catch (e) { manejarErrorAPI(e); }
}

// * editarTurno(idTurno): navega a la vista de edición preservando ?dia
function editarTurno(idTurno) {
  const dia = document.getElementById('dia');
  const currentDay = dia && dia.value ? dia.value : '';
  window.location.href = `turno_editar.html?id=${idTurno}${currentDay ? `&dia=${currentDay}`:''}`;
}

// Crear perfil a partir de un turno que no tiene paciente asociado
window.crearPerfilDesdeTurno = function(nombre, apellido, cobertura) {
  const params = new URLSearchParams();
  if (nombre) params.set('nombre', nombre);
  if (apellido) params.set('apellido', apellido);
  if (cobertura) params.set('cobertura', cobertura);
  params.set('returnTo', 'turnos');
  window.location.href = `paciente_crear.html?${params.toString()}`;
}

// * eliminarTurno(idTurno)
async function eliminarTurno(idTurno) {
  if (!confirmarAccion('¿Eliminar turno?')) return;
  try {
    const resp = await fetch(`/api/turnos/${idTurno}`, { method: 'DELETE', credentials: 'include' });
    if (resp.ok) {
      mostrarAlerta('Turno eliminado', 'success');
      await recargarVistaActual();
    } else {
      const result = await resp.json();
      mostrarAlerta(result.error || 'No se pudo eliminar', 'error');
    }
  } catch (e) {
    manejarErrorAPI(e);
  }
}
