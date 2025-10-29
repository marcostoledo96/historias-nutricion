// * Modal selector de pacientes reutilizable
// * Contrato: abrirSelectorPacientes({ onSelect(paciente), prefill })
// * Internamente maneja su propio estado (lista, paginación) y delega eventos por data-atributos.

(function(){
  // * Crear modal una sola vez
  function ensureModal() {
    if (document.getElementById('modal-selector-pacientes')) return;
    const modal = document.createElement('div');
    modal.id = 'modal-selector-pacientes';
    modal.className = 'modal-overlay hidden';
    modal.innerHTML = `
      <div class="card" style="max-width: 900px; width: 95%;">
        <div class="card-header">
          <h3 class="card-title">Seleccionar Paciente</h3>
        </div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group w-full">
              <label class="form-label">Buscar</label>
              <input id="selpac-busqueda" class="form-input" placeholder="Nombre, apellido o DNI" />
            </div>
            <div class="form-group">
              <label class="form-label">Acciones</label>
              <div class="flex gap-2">
                <button id="selpac-btn-buscar" class="btn btn-primary">Buscar</button>
                <button id="selpac-btn-limpiar" class="btn">Limpiar</button>
              </div>
            </div>
          </div>
          <div class="table-container" style="margin-top: 8px;">
            <table class="table">
              <thead><tr><th>Nombre</th><th>Apellido</th><th>DNI</th><th>Edad</th><th>Cobertura</th><th>Seleccionar</th></tr></thead>
              <tbody id="selpac-tbody"></tbody>
            </table>
          </div>
          <div id="selpac-sin" class="text-center p-4 text-gray-500 hidden">Sin resultados</div>
        </div>
        <div class="card-footer">
          <div id="selpac-paginacion" class="flex gap-2"></div>
          <div style="flex:1"></div>
          <button id="selpac-btn-cerrar" class="btn btn-secondary">Cerrar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  // * Estado interno del selector (no se expone públicamente)
  let selState = { lista: [], pagina: 1, tam: 10, onSelect: null };

  // * renderTabla(): pinta la página actual de resultados
  function renderTabla() {
    const lista = selState.lista;
    const inicio = (selState.pagina - 1) * selState.tam;
    const items = lista.slice(inicio, inicio + selState.tam);
    const tbody = document.getElementById('selpac-tbody');
    const sin = document.getElementById('selpac-sin');
    if (!items.length) { tbody.innerHTML = ''; sin.classList.remove('hidden'); return; }
    sin.classList.add('hidden');
    tbody.innerHTML = items.map(p => `
      <tr>
        <td>${p.nombre}</td>
        <td>${p.apellido}</td>
        <td>${p.dni}</td>
        <td>${calcularEdad(p.fecha_nacimiento) || '-'}</td>
        <td>${p.cobertura || '-'}</td>
        <td><button class="btn btn-sm btn-primary" data-select="${p.id_paciente}">Elegir</button></td>
      </tr>
    `).join('');
  }

  // * renderPaginacion(): crea botones 1..N con ventana de 5
  function renderPaginacion() {
    const total = selState.lista.length;
    const totalPaginas = Math.max(1, Math.ceil(total / selState.tam));
    const cont = document.getElementById('selpac-paginacion');
    const p = selState.pagina;
    const btn = (label, disabled, on) => `<button class="btn btn-sm ${disabled? 'btn-secondary':''}" ${disabled? 'disabled':''} data-page="${on}">${label}</button>`;
    let items = [];
    items.push(btn('« Prev', p===1, p-1));
    const maxNums = 5; let start = Math.max(1, p - Math.floor(maxNums/2)); let end = Math.min(totalPaginas, start + maxNums -1); if (end - start < maxNums -1) start = Math.max(1, end - maxNums + 1);
    for (let i = start; i <= end; i++) items.push(`<button class="btn btn-sm ${i===p?'btn-primary':''}" data-page="${i}">${i}</button>`);
    items.push(btn('Next »', p===totalPaginas, p+1));
    cont.innerHTML = items.join(' ');
  }

  // * buscarPacientes(termino): consulta /api/pacientes (o con ?buscar) y resetea a página 1
  async function buscarPacientes(termino='') {
    try {
      const url = termino? `/api/pacientes?buscar=${encodeURIComponent(termino)}` : '/api/pacientes';
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) return manejarErrorAPI(null, resp);
      const data = await resp.json();
      selState.lista = data;
      selState.pagina = 1;
      renderTabla();
      renderPaginacion();
    } catch (e) { manejarErrorAPI(e); }
  }

  // * abrirSelectorPacientes({ onSelect, prefill }): entrada pública; adjunta callback y abre modal
  function abrirSelectorPacientes({ onSelect, prefill='' }={}) {
    ensureModal();
    selState.onSelect = onSelect || null;
    const modal = document.getElementById('modal-selector-pacientes');
    const input = document.getElementById('selpac-busqueda');
    input.value = prefill || '';
    modal.classList.remove('hidden');
    modal.classList.add('active');
    buscarPacientes(input.value.trim());
  }

  // * cerrarSelector(): oculta el modal sin limpiar resultados
  function cerrarSelector() {
    const modal = document.getElementById('modal-selector-pacientes');
    modal.classList.remove('active');
    modal.classList.add('hidden');
  }

  // * Wire global handlers (delegación de eventos sobre document)
  document.addEventListener('click', (e) => {
    const modal = document.getElementById('modal-selector-pacientes');
    if (!modal) return;
    if (e.target.id === 'selpac-btn-cerrar') { cerrarSelector(); }
    if (e.target.id === 'selpac-btn-buscar') {
      const q = document.getElementById('selpac-busqueda').value.trim(); buscarPacientes(q);
    }
    if (e.target.id === 'selpac-btn-limpiar') {
      document.getElementById('selpac-busqueda').value=''; buscarPacientes('');
    }
    if (e.target.dataset.page) {
      const p = parseInt(e.target.dataset.page, 10);
      if (!Number.isNaN(p) && p>=1) { selState.pagina = p; renderTabla(); renderPaginacion(); }
    }
    if (e.target.dataset.select) {
      const id = parseInt(e.target.dataset.select, 10);
      const p = selState.lista.find(x => x.id_paciente === id);
      if (p && typeof selState.onSelect === 'function') {
        selState.onSelect(p);
        cerrarSelector();
      }
    }
    // Cerrar por click fuera
    if (e.target === modal) { cerrarSelector(); }
  });

  // * Exponer globalmente la función de apertura
  window.abrirSelectorPacientes = abrirSelectorPacientes;
})();
