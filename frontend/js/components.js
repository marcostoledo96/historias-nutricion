// ! Componentes reutilizables (header/footer + helpers de UI)
// * Este módulo carga fragmentos HTML comunes (header/footer) y configura:
//   - Menú de usuario accesible (click fuera/Escape cierran)
//   - Toggle de tema persistente en localStorage
//   - Menú de navegación responsive
//   - Heurísticas para reducir autofill/guardar contraseñas en inputs sensibles
// ? Requerido por: todas las páginas con layout principal
// TODO: incorporar lazy-loading del footer si pesa o tiene recursos costosos

// Cargar header en la página
async function cargarHeader() {
  try {
    const response = await fetch('components/header.html');
    const headerHTML = await response.text();
    
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
      headerContainer.innerHTML = headerHTML;
    }
  } catch (error) {
    console.error('Error cargando header:', error);
  }
}

// Cargar footer en la página
async function cargarFooter() {
  try {
    const response = await fetch('components/footer.html');
    const footerHTML = await response.text();
    
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
      footerContainer.innerHTML = footerHTML;
    }
  } catch (error) {
    console.error('Error cargando footer:', error);
  }
}

// Cargar todos los componentes
async function cargarComponentes() {
  await Promise.all([
    cargarHeader(),
    cargarFooter()
  ]);
}

// Inicialización común de la página
async function inicializarPagina() {
  // Cargar componentes
  await cargarComponentes();
  // Configurar interacciones del header
  configurarHeaderInteractivo();
  // Intentar desactivar prompts de autocompletado/guardar datos del navegador
  desactivarAutocompletadoNavegador();
  aplicarNoAutofill();
  
  // Inicializar página protegida
  const accesoConcedido = await inicializarPaginaProtegida();
  
  return accesoConcedido;
}

function configurarHeaderInteractivo() {
  // Dropdown usuario
  const btnUser = document.getElementById('user-menu-button');
  const dropdown = document.getElementById('user-menu-dropdown');
  const userMenuContainer = btnUser ? btnUser.closest('.user-menu') : null;
  if (btnUser && dropdown) {
    btnUser.addEventListener('click', (e) => {
      // Evitar que el click burbujee al document y cierre al instante
      e.stopPropagation();
      const willOpen = dropdown.classList.contains('hidden');
      dropdown.classList.toggle('hidden');
      btnUser.setAttribute('aria-expanded', String(willOpen));
    });

    // Cerrar al hacer click fuera de todo el contenedor del menú de usuario
    document.addEventListener('click', (e) => {
      if (!dropdown.classList.contains('hidden')) {
        if (userMenuContainer && !userMenuContainer.contains(e.target)) {
          dropdown.classList.add('hidden');
          btnUser.setAttribute('aria-expanded', 'false');
        }
      }
    });

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !dropdown.classList.contains('hidden')) {
        dropdown.classList.add('hidden');
        btnUser.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Toggle tema
  const btnTheme = document.getElementById('btn-toggle-theme');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const actual = document.documentElement.getAttribute('data-theme') === 'dark' ? 'oscuro' : 'claro';
      const nuevo = actual === 'oscuro' ? 'claro' : 'oscuro';
      document.documentElement.setAttribute('data-theme', nuevo === 'oscuro' ? 'dark' : 'light');
      try {
        const prefs = JSON.parse(localStorage.getItem('preferencias') || '{}');
        prefs.tema = nuevo;
        localStorage.setItem('preferencias', JSON.stringify(prefs));
      } catch {}
    });
  }

  // Toggle menú navegación (responsive)
  const btnNav = document.getElementById('btn-nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  if (btnNav && navMenu) {
    btnNav.addEventListener('click', () => {
      const abierto = navMenu.classList.toggle('open');
      btnNav.setAttribute('aria-expanded', String(abierto));
    });
  }
}

// Mejor esfuerzo para desactivar prompts de guardado/autocompletado del navegador
function desactivarAutocompletadoNavegador() {
  try {
    // Formularios
    document.querySelectorAll('form').forEach(f => {
      f.setAttribute('autocomplete', 'off');
    });
    // Entradas y textareas
    document.querySelectorAll('input, textarea').forEach(el => {
      el.setAttribute('autocomplete', 'off');
      el.setAttribute('autocorrect', 'off');
      el.setAttribute('autocapitalize', 'off');
      el.setAttribute('spellcheck', 'false');
      // Para algunos navegadores, forzar un valor inválido ayuda a inhibir heurísticas
      // Sin romper la UX: sólo si el campo no tiene autocomplete definido específico
      if (!el.getAttribute('autocomplete')) {
        el.setAttribute('autocomplete', 'off');
      }
    });
  } catch {}
}

// Truco adicional: marcar inputs como readonly hasta focus para evitar heurísticas de guardado/autofill
function aplicarNoAutofill() {
  try {
    const inputs = document.querySelectorAll('input[data-no-autofill="true"], textarea[data-no-autofill="true"]');
    inputs.forEach((el) => {
      // Sólo si no está deshabilitado y permite edición
      if (el.readOnly === false && !el.disabled) {
        el.readOnly = true;
        const enable = () => { el.readOnly = false; };
        const disable = () => { el.readOnly = true; };
        el.addEventListener('focus', enable);
        el.addEventListener('mousedown', enable, { once: true });
        el.addEventListener('touchstart', enable, { once: true });
        el.addEventListener('blur', disable);
      }
    });
  } catch {}
}