// role: 'customer' | 'provider'
// activeHref: 現在のページのファイル名(メニュー内でハイライトする用)
function renderNav(role, activeHref) {
  const container = document.getElementById('app-nav');
  if (!container) return;

  const links = role === 'customer'
    ? [
        { href: 'dashboard-customer.html', label: 'Mis pedidos' },
        { href: 'order-new.html', label: 'Nuevo pedido' },
        { href: 'profile-customer.html', label: 'Mi perfil' }
      ]
    : [
        { href: 'dashboard-provider.html', label: 'Mis trabajos' },
        { href: 'orders-available.html', label: 'Pedidos disponibles' },
        { href: 'profile-provider.html', label: 'Mi perfil' }
      ];

  const homeHref = role === 'customer' ? 'dashboard-customer.html' : 'dashboard-provider.html';

  const linksHtml = links.map(l =>
    `<a href="${l.href}" class="${l.href === activeHref ? 'active-link' : ''}">${l.label}</a>`
  ).join('');

  container.innerHTML = `
    <a class="brand-mini" href="${homeHref}">ServiYa</a>
    <button class="menu-toggle" id="nav-menu-toggle" aria-label="Menú">☰</button>
    <div class="dropdown" id="nav-dropdown">
      ${linksHtml}
      <a href="#" class="danger" onclick="logout(); return false;">Cerrar sesión</a>
    </div>
  `;

  const toggle = document.getElementById('nav-menu-toggle');
  const dropdown = document.getElementById('nav-dropdown');

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => dropdown.classList.remove('open'));
}
