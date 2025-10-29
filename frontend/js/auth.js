// ! Autenticación (frontend)
// * Este módulo expone utilidades comunes para páginas protegidas:
//   - verificarAutenticacion: consulta al backend si hay sesión activa
//   - cerrarSesion: cierra la sesión y redirige a login
//   - verificarAcceso: middleware de páginas protegidas; redirige a login si no hay sesión
//   - actualizarInfoUsuario: refresca el nombre visible en el header
//   - configurarLogout: ata el botón de cerrar sesión del header
//   - registrarUsuario: alta de usuario (sólo administradores)
//   - inicializarPaginaProtegida: bootstrap común (auth + header + navegación activa)
// ? Dependencias: utils.js (mostrarAlerta, manejarErrorAPI, confirmarAccion)
// TODO: Unificar mensajes de error/success vía una capa central de notificaciones

// Verificar si el usuario está autenticado
async function verificarAutenticacion() {
  try {
    const response = await fetch('/api/auth/verificar', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    
    return { autenticado: false };
  } catch (error) {
    console.error('Error verificando autenticación:', error);
    return { autenticado: false };
  }
}

// Cerrar sesión
async function cerrarSesion() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      // * UX: feedback + pequeña espera para que el usuario lo perciba
      mostrarAlerta('Sesión cerrada exitosamente', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } else {
      mostrarAlerta('Error al cerrar sesión', 'error');
    }
  } catch (error) {
    console.error('Error cerrando sesión:', error);
    mostrarAlerta('Error de conexión', 'error');
  }
}

// Middleware para verificar autenticación en páginas protegidas
async function verificarAcceso() {
  const authStatus = await verificarAutenticacion();
  
  if (!authStatus.autenticado) {
    // ! Seguridad: cortar navegación de inmediato y redirigir a login
    mostrarAlerta('Debes iniciar sesión para acceder', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
    return false;
  }
  
  // Actualizar información del usuario en el header
  actualizarInfoUsuario(authStatus.usuario);
  
  return true;
}

// Actualizar información del usuario en el header
function actualizarInfoUsuario(usuario) {
  const usuarioNombre = document.getElementById('usuario-nombre');
  if (usuarioNombre && usuario) {
    // ? Backend envía nombre_completo; aquí usamos .nombre si está normalizado en responses
    usuarioNombre.textContent = usuario.nombre || 'Usuario';
  }
  // * Actualizar etiqueta visible del botón de usuario (nuevo diseño: nombre + chevron)
  const userMenuLabel = document.getElementById('user-menu-label');
  if (userMenuLabel && usuario) {
    userMenuLabel.textContent = usuario.nombre || 'Usuario';
  }
  // * Iniciales para vista responsive (móvil)
  const initialsEl = document.getElementById('user-menu-initials');
  const getInitials = (nombreCompleto, email) => {
    const norm = (s) => String(s || '').trim();
    const n = norm(nombreCompleto);
    if (n) {
      const parts = n.split(/\s+/).filter(Boolean);
      const first = parts[0] ? parts[0][0] : '';
      const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
      const ini = (first + last) || first;
      return ini ? ini.toUpperCase() : 'US';
    }
    const em = norm(email);
    if (em) {
      const local = em.split('@')[0] || '';
      const a = (local[0] || 'U') + (local[1] || 'S');
      return a.toUpperCase();
    }
    return 'US';
  };
  if (initialsEl && usuario) {
    initialsEl.textContent = getInitials(usuario.nombre, usuario.email);
  }
  // * Actualizar iniciales del avatar dinámicamente (fallback: primeras letras del email)
  try {
    const avatar = document.querySelector('.avatar-iniciales');
    if (avatar && usuario) {
      avatar.textContent = getInitials(usuario.nombre, usuario.email);
    }
    const btn = document.getElementById('user-menu-button');
    if (btn && usuario?.nombre) btn.setAttribute('title', `Menú de ${usuario.nombre}`);
  } catch {}
}

// Configurar event listener para el botón de logout
function configurarLogout() {
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      // ? Confirmación simple; puedes reemplazar por un modal si prefieres
      if (confirmarAccion('¿Estás seguro que deseas cerrar sesión?')) {
        cerrarSesion();
      }
    });
  }
}

// Función para registrar nuevo usuario (solo admins)
async function registrarUsuario(datosUsuario) {
  try {
    const response = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(datosUsuario)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      mostrarAlerta(result.mensaje || 'Usuario registrado exitosamente', 'success');
      return { exito: true, data: result };
    } else {
      mostrarAlerta(result.error || 'Error al registrar usuario', 'error');
      return { exito: false, error: result.error };
    }
  } catch (error) {
    console.error('Error registrando usuario:', error);
    manejarErrorAPI(error);
    return { exito: false, error: 'Error de conexión' };
  }
}

// Inicialización común para páginas protegidas
async function inicializarPaginaProtegida() {
  // Verificar acceso
  const tieneAcceso = await verificarAcceso();
  if (!tieneAcceso) {
    // ! Importante: cortar flujo de inicialización del resto de la página
    return false;
  }
  
  // Configurar logout
  configurarLogout();
  
  // Marcar enlace activo en navegación
  marcarEnlaceActivo();
  
  return true;
}

// Marcar enlace activo en navegación
function marcarEnlaceActivo() {
  const currentPage = window.location.pathname.split('/').pop();
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });
}