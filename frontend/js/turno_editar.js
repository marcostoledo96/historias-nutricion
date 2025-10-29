// * Editar Turno
// * Carga un turno por id y permite actualizar campos. Normaliza cadenas vacías a null para evitar errores de DB.

document.addEventListener('DOMContentLoaded', async () => {
  const acceso = await inicializarPagina();
  if (!acceso) return;

  const { id, dia } = getURLParams();
  if (!id) { mostrarAlerta('Falta ID de turno', 'error'); return; }

  await cargarTurno(id);
  configurarEventos(id, dia);
});

// * cargarTurno(id): obtiene datos y prellena el formulario
async function cargarTurno(id) {
  try {
    const resp = await fetch(`/api/turnos/${id}`, { credentials: 'include' });
    if (!resp.ok) return manejarErrorAPI(null, resp);
    const t = await resp.json();

    const form = document.getElementById('form-editar-turno');
    form.paciente.value = `${t.nombre} ${t.apellido}`;
    form.dia.value = t.dia ? t.dia.substring(0,10) : '';
    form.horario.value = t.horario ? t.horario.substring(0,5) : '';
    form.cobertura.value = t.cobertura || '';
    form.hora_llegada.value = t.hora_llegada ? t.hora_llegada.substring(0,5) : '';
    form.situacion.value = t.situacion || 'programado';
    form.primera_vez.checked = !!t.primera_vez;
    form.detalle.value = t.detalle || '';

    form.dataset.id = id;
  } catch (e) { manejarErrorAPI(e); }
}

// * configurarEventos(id, dia): wire del submit y navegación de retorno (preserva ?dia)
function configurarEventos(id, dia) {
  document.getElementById('btn-volver-turno').addEventListener('click', () => {
    window.location.href = `turnos.html${dia ? `?dia=${dia}`:''}`;
  });

  document.getElementById('form-editar-turno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    data.primera_vez = form.primera_vez.checked;

    // Normalizar opcionales: enviar null si están vacíos (evita errores de TIME en backend/DB)
    if (data.hora_llegada !== undefined && String(data.hora_llegada).trim() === '') {
      data.hora_llegada = null;
    }
    if (data.cobertura !== undefined && String(data.cobertura).trim() === '') {
      data.cobertura = null;
    }
    if (data.detalle !== undefined && String(data.detalle).trim() === '') {
      data.detalle = null;
    }

    if (!data.dia || !data.horario) {
      mostrarAlerta('Día y horario son requeridos', 'error');
      return;
    }

    try {
      const resp = await fetch(`/api/turnos/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(data)
      });
      const result = await resp.json();
      if (resp.ok) {
        mostrarAlerta('Turno actualizado', 'success');
      } else {
        manejarErrorAPI(result, resp);
        mostrarAlerta(result.error || 'No se pudo actualizar', 'error');
      }
    } catch (e) { manejarErrorAPI(e); }
  });
}
