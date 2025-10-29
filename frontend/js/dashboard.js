// * Inicio/Dashboard
// * Muestra estadísticas básicas (pacientes, turnos de hoy, atendidos) y lista los turnos del día.
// * Incluye búsqueda rápida de pacientes en un modal con debounce.

let turnosHoy = [];

// Inicialización de Inicio
document.addEventListener('DOMContentLoaded', async () => {
    const acceso = await inicializarPagina();
    if (!acceso) return;
    
    // Cargar datos de inicio
    await Promise.all([
        cargarEstadisticas(),
        cargarTurnosHoy()
    ]);
    
    // Configurar event listeners
    configurarEventListeners();
});

// * cargarEstadisticas(): solicita totales y calcula métricas del mes actual
async function cargarEstadisticas() {
    try {
        // Cargar total de pacientes
        const pacientesResponse = await fetch('/api/pacientes', {
            credentials: 'include'
        });
        
        if (pacientesResponse.ok) {
            const pacientes = await pacientesResponse.json();
            document.getElementById('total-pacientes').textContent = pacientes.length;
        }
        
        // Cargar turnos de hoy
        const turnosResponse = await fetch('/api/turnos/hoy', {
            credentials: 'include'
        });
        
        if (turnosResponse.ok) {
            const turnos = await turnosResponse.json();
            document.getElementById('turnos-hoy').textContent = turnos.length;
            
            // Contar atendidos hoy
            const atendidos = turnos.filter(turno => turno.situacion === 'atendido').length;
            document.getElementById('pacientes-atendidos').textContent = atendidos;
        }
        
        // Cargar consultas del mes actual
        const fechaInicio = new Date();
        fechaInicio.setDate(1);
        const consultasResponse = await fetch('/api/consultas', {
            credentials: 'include'
        });
        
        if (consultasResponse.ok) {
            const consultas = await consultasResponse.json();
            const consultasMes = consultas.filter(consulta => {
                const fechaConsulta = new Date(consulta.fecha);
                return fechaConsulta.getMonth() === new Date().getMonth() &&
                       fechaConsulta.getFullYear() === new Date().getFullYear();
            });
            document.getElementById('consultas-mes').textContent = consultasMes.length;
        }
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        manejarErrorAPI(error);
    }
}

// * cargarTurnosHoy(): obtiene turnos del día y los muestra en la tabla
async function cargarTurnosHoy() {
    try {
        const response = await fetch('/api/turnos/hoy', {
            credentials: 'include'
        });
        
        if (response.ok) {
            turnosHoy = await response.json();
            mostrarTurnos(turnosHoy);
        } else {
            manejarErrorAPI(null, response);
        }
        
    } catch (error) {
        console.error('Error cargando turnos:', error);
        manejarErrorAPI(error);
    } finally {
        ocultarElemento('loading-turnos');
        mostrarElemento('turnos-container');
    }
}

// * mostrarTurnos(turnos): pinta filas del listado de turnos del día
function mostrarTurnos(turnos) {
    const tbody = document.getElementById('turnos-tbody');
    const sinTurnos = document.getElementById('sin-turnos');
    
    if (turnos.length === 0) {
        tbody.innerHTML = '';
        mostrarElemento('sin-turnos');
        return;
    }
    
    ocultarElemento('sin-turnos');
    
    tbody.innerHTML = turnos.map(turno => `
        <tr>
            <td><strong>${turno.horario.substring(0, 5)}</strong></td>
            <td>${turno.nombre} ${turno.apellido}</td>
            <td>${turno.dni}</td>
            <td>${turno.cobertura || 'Sin cobertura'}</td>
            <td>${getBadgeSituacion(turno.situacion)}</td>
            <td>${turno.primera_vez ? '✅ Sí' : '-'}</td>
            <td>
                <div class="flex gap-2">
                    <button onclick="verPaciente(${turno.id_paciente})" class="btn btn-sm btn-primary">
                        <span class="material-symbols-outlined" aria-hidden="true">visibility</span> Ver
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// * marcarLlegada(idTurno): setea situacion=en_espera con hora actual
async function marcarLlegada(idTurno) {
    try {
        const response = await fetch(`/api/turnos/${idTurno}/situacion`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                situacion: 'en_espera',
                hora_llegada: new Date().toTimeString().substring(0, 8)
            })
        });
        
        if (response.ok) {
            mostrarAlerta('Paciente marcado como llegado', 'success');
            await cargarTurnosHoy();
            await cargarEstadisticas();
        } else {
            const error = await response.json();
            mostrarAlerta(error.error || 'Error al marcar llegada', 'error');
        }
        
    } catch (error) {
        console.error('Error marcando llegada:', error);
        manejarErrorAPI(error);
    }
}

// * marcarAtendido(idTurno)
async function marcarAtendido(idTurno) {
    try {
        const response = await fetch(`/api/turnos/${idTurno}/situacion`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                situacion: 'atendido'
            })
        });
        
        if (response.ok) {
            mostrarAlerta('Paciente marcado como atendido', 'success');
            await cargarTurnosHoy();
            await cargarEstadisticas();
        } else {
            const error = await response.json();
            mostrarAlerta(error.error || 'Error al marcar como atendido', 'error');
        }
        
    } catch (error) {
        console.error('Error marcando como atendido:', error);
        manejarErrorAPI(error);
    }
}

// * verPaciente(idPaciente): abre perfil en nueva pestaña
function verPaciente(idPaciente) {
    abrirPerfilPaciente(idPaciente);
}

// * configurarEventListeners(): wire del modal de búsqueda rápida y sus eventos
function configurarEventListeners() {
    // Botón búsqueda rápida
    document.getElementById('btn-buscar-paciente').addEventListener('click', () => {
        const modal = document.getElementById('modal-busqueda');
        modal.classList.remove('hidden');
        modal.classList.add('active');
        document.getElementById('busqueda-input').focus();
    });
    
    // Cerrar modal
    document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModalBusqueda);
    
    // Búsqueda en tiempo real
    const busquedaInput = document.getElementById('busqueda-input');
    busquedaInput.addEventListener('input', debounce(realizarBusqueda, 300));
    
    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cerrarModalBusqueda();
        }
    });
    
    // Cerrar modal al hacer click fuera
    const modalOverlay = document.getElementById('modal-busqueda');
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            cerrarModalBusqueda();
        }
    });
}

// * cerrarModalBusqueda(): oculta y limpia el modal
function cerrarModalBusqueda() {
    const modal = document.getElementById('modal-busqueda');
    modal.classList.remove('active');
    modal.classList.add('hidden');
    const input = document.getElementById('busqueda-input');
    if (input) input.value = '';
    const resultados = document.getElementById('resultados-busqueda');
    if (resultados) resultados.innerHTML = '';
}

// * realizarBusqueda(): fetch a /api/pacientes?buscar=... con debounce
async function realizarBusqueda() {
    const termino = document.getElementById('busqueda-input').value.trim();
    const resultadosContainer = document.getElementById('resultados-busqueda');
    
    if (termino.length < 2) {
        resultadosContainer.innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`/api/pacientes?buscar=${encodeURIComponent(termino)}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const pacientes = await response.json();
            mostrarResultadosBusqueda(pacientes);
        }
        
    } catch (error) {
        console.error('Error en búsqueda:', error);
        resultadosContainer.innerHTML = '<p class="text-error">Error en la búsqueda</p>';
    }
}

// * mostrarResultadosBusqueda(pacientes): renderiza ítems clicables del modal
function mostrarResultadosBusqueda(pacientes) {
    const resultadosContainer = document.getElementById('resultados-busqueda');
    
    if (pacientes.length === 0) {
        resultadosContainer.innerHTML = '<p class="text-gray-500">No se encontraron pacientes</p>';
        return;
    }
    
    resultadosContainer.innerHTML = `
        <div class="results-scroll">
            ${pacientes.map(paciente => `
                <div class="card-body result-item"
                     onclick="seleccionarPaciente(${paciente.id_paciente})">
                    <div class="flex justify-between items-center">
                        <div>
                            <strong>${paciente.nombre} ${paciente.apellido}</strong>
                            <br>
                            <small>DNI: ${paciente.dni} | ${calcularEdad(paciente.fecha_nacimiento)} años</small>
                        </div>
                        <span class="badge badge-secondary">${paciente.cobertura || 'Sin cobertura'}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// * seleccionarPaciente(idPaciente): cierra modal y abre perfil
function seleccionarPaciente(idPaciente) {
    cerrarModalBusqueda();
    abrirPerfilPaciente(idPaciente);
}