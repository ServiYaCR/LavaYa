// ============================================================
// admin.js — VERSION CHECK: v2-debug-2026-09-15
// もしGitHub上でこの1行目のコメントが見えないなら、
// それはまだ古いファイルのままです。
// ============================================================
const ACCESS_TYPE_LABELS = {
  condominio_seguridad: 'Condominio con seguridad',
  casa_independiente: 'Casa independiente',
  otro: 'Otro'
};

async function checkAdminAccess() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) { window.location.href = 'signup.html'; return false; }

  const { data: profile } = await db.from('profiles').select('is_admin').eq('id', user.id).single();

  if (!profile || !profile.is_admin) {
    document.getElementById('admin-content').innerHTML =
      `<div class="denied">No tienes acceso a esta página.<br><span style="font-size:0.8rem;">Conectado como: ${user.email}<br>User ID: ${user.id}<br>(is_admin: ${profile ? profile.is_admin : 'perfil no encontrado'})</span></div>`;
    return false;
  }

  document.getElementById('app-nav').innerHTML = `
    <span class="brand-mini">ServiYa Admin</span>
    <a href="#" class="logout-link" onclick="logout(); return false;" style="font-size:0.85rem;">Cerrar sesión</a>
  `;
  return true;
}

async function loadAdminPanel() {
  const ok = await checkAdminAccess();
  if (!ok) return;

  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <div class="admin-section" id="section-providers"><h2>Lavanderos/as pendientes de revisión</h2><p class="hint">Cargando...</p></div>
    <div class="admin-section" id="section-tickets"><h2>Solicitudes de soporte pendientes</h2><p class="hint">Cargando...</p></div>
    <div class="admin-section" id="section-orders"><h2>Pedidos recientes (últimos 50)</h2><p class="hint">Cargando...</p></div>
    <div class="admin-section" id="section-summary"><h2>Resumen financiero</h2><p class="hint">Cargando...</p></div>
    <div class="admin-section" id="section-export"><h2>Exportar datos</h2></div>
  `;

  loadPendingProviders();
  loadPendingTickets();
  loadRecentOrders();
  loadFinancialSummary();
  setupExport();
}

// ------------------------------------------------------------
// プロバイダー審査
// ------------------------------------------------------------
async function loadPendingProviders() {
  const section = document.getElementById('section-providers');
  const { data: providers, error } = await db
    .from('provider_profiles')
    .select('id, cedula, status, created_at, profiles(full_name, phone_whatsapp)')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true });

  if (error) {
    section.innerHTML = `<h2>Lavanderos/as pendientes de revisión</h2><p class="error-text" style="display:block;">${error.message}</p>`;
    return;
  }

  if (!providers || providers.length === 0) {
    section.innerHTML = '<h2>Lavanderos/as pendientes de revisión</h2><p class="hint">No hay solicitudes pendientes.</p>';
    return;
  }

  section.innerHTML = `
    <h2>Lavanderos/as pendientes de revisión (${providers.length})</h2>
    <table>
      <tr><th>Nombre</th><th>WhatsApp</th><th>Cédula</th><th>Fecha</th><th>Acción</th></tr>
      ${providers.map(p => `
        <tr>
          <td>${p.profiles ? p.profiles.full_name : '—'}</td>
          <td>${p.profiles ? p.profiles.phone_whatsapp : '—'}</td>
          <td>${p.cedula}</td>
          <td>${new Date(p.created_at).toLocaleDateString('es-CR')}</td>
          <td>
            <button class="small-btn btn-approve" onclick="resolveProvider('${p.id}', 'approved')">Aprobar</button>
            <button class="small-btn btn-reject" onclick="resolveProvider('${p.id}', 'rejected')">Rechazar</button>
          </td>
        </tr>
      `).join('')}
    </table>
  `;
}

async function resolveProvider(providerId, newStatus) {
  if (!confirm(`¿Confirmar como "${newStatus}"?`)) return;
  const { error } = await db.from('provider_profiles').update({ status: newStatus }).eq('id', providerId);
  if (error) { alert('Error: ' + error.message); return; }
  loadPendingProviders();
}

// ------------------------------------------------------------
// サポート申請
// ------------------------------------------------------------
const CATEGORY_LABELS = {
  cancellation_exception: 'Cancelación excepcional',
  damage_claim: 'Daño / pérdida',
  other: 'Otro'
};

async function loadPendingTickets() {
  const section = document.getElementById('section-tickets');
  const { data: tickets, error } = await db
    .from('support_tickets')
    .select('id, order_id, category, description, created_at, profiles(full_name, phone_whatsapp)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    section.innerHTML = `<h2>Solicitudes de soporte pendientes</h2><p class="error-text" style="display:block;">${error.message}</p>`;
    return;
  }

  if (!tickets || tickets.length === 0) {
    section.innerHTML = '<h2>Solicitudes de soporte pendientes</h2><p class="hint">No hay solicitudes pendientes.</p>';
    return;
  }

  section.innerHTML = `
    <h2>Solicitudes de soporte pendientes (${tickets.length})</h2>
    ${tickets.map(t => `
      <div style="border-top:1px solid var(--color-border); padding:12px 0;">
        <p style="margin:0;"><strong>${CATEGORY_LABELS[t.category] || t.category}</strong> — ${t.profiles ? t.profiles.full_name : '—'} (${t.profiles ? t.profiles.phone_whatsapp : '—'})</p>
        ${t.order_id ? `<p class="hint" style="margin:2px 0;">Pedido: ${t.order_id}</p>` : ''}
        <p style="margin:6px 0;">${t.description}</p>
        <textarea id="note-${t.id}" placeholder="Nota para el solicitante (opcional)" style="min-height:50px;"></textarea>
        <div style="margin-top:6px;">
          <button class="small-btn btn-approve" onclick="resolveTicket('${t.id}', 'approved')">Aprobar</button>
          <button class="small-btn btn-reject" onclick="resolveTicket('${t.id}', 'rejected')">Rechazar</button>
        </div>
      </div>
    `).join('')}
  `;
}

async function resolveTicket(ticketId, newStatus) {
  const note = document.getElementById(`note-${ticketId}`).value.trim();
  if (!confirm(`¿Confirmar como "${newStatus}"?`)) return;
  const { error } = await db.from('support_tickets').update({
    status: newStatus,
    owner_decision_note: note || null,
    resolved_at: new Date().toISOString()
  }).eq('id', ticketId);
  if (error) { alert('Error: ' + error.message); return; }
  loadPendingTickets();
}

// ------------------------------------------------------------
// 注文一覧(直近50件、再割当・キャンセル)
// ------------------------------------------------------------
let _approvedProvidersCache = null;

async function loadRecentOrders() {
  const section = document.getElementById('section-orders');
  const { data: orders, error } = await db
    .from('orders')
    .select('id, status, estimated_weight_kg, final_weight_kg, price_colones, estimated_price_colones, provider_id, scheduled_pickup_date, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    section.innerHTML = `<h2>Pedidos recientes</h2><p class="error-text" style="display:block;">${error.message}</p>`;
    return;
  }

  if (!_approvedProvidersCache) {
    const { data: provs } = await db
      .from('provider_profiles')
      .select('id, profiles(full_name)')
      .eq('status', 'approved');
    _approvedProvidersCache = provs || [];
  }

  const providerOptions = _approvedProvidersCache.map(p =>
    `<option value="${p.id}">${p.profiles ? p.profiles.full_name : p.id.slice(0, 8)}</option>`
  ).join('');

  section.innerHTML = `
    <h2>Pedidos recientes (${orders.length})</h2>
    <table>
      <tr><th>Creado</th><th>Programado</th><th>Estado</th><th>Peso</th><th>Monto</th><th>Lavandero/a</th><th>Acción</th></tr>
      ${orders.map(o => `
        <tr>
          <td>${new Date(o.created_at).toLocaleDateString('es-CR')}</td>
          <td>${o.scheduled_pickup_date ? new Date(o.scheduled_pickup_date + 'T00:00:00').toLocaleDateString('es-CR') : '—'}</td>
          <td>${ORDER_STATUS_LABELS[o.status] || o.status}</td>
          <td>${o.final_weight_kg || o.estimated_weight_kg || '?'} kg</td>
          <td>${o.price_colones ? formatColones(o.price_colones) : (o.estimated_price_colones ? '~' + formatColones(o.estimated_price_colones) : '—')}</td>
          <td>
            <select class="small-select" id="reassign-${o.id}">
              <option value="">${o.provider_id ? 'Reasignar...' : 'Sin asignar'}</option>
              ${providerOptions}
            </select>
            <button class="small-btn btn-approve" onclick="reassignOrder('${o.id}')">OK</button>
          </td>
          <td>
            ${o.status !== 'delivered' && o.status !== 'cancelled' ?
              `<button class="small-btn btn-cancel" onclick="adminCancelOrder('${o.id}')">Cancelar</button>` : '—'}
          </td>
        </tr>
      `).join('')}
    </table>
  `;
}

async function reassignOrder(orderId) {
  const select = document.getElementById(`reassign-${orderId}`);
  const newProviderId = select.value;
  if (!newProviderId) return;
  if (!confirm('¿Reasignar este pedido a este Lavandero/a?')) return;
  const { error } = await db.from('orders').update({ provider_id: newProviderId, status: 'awaiting_pickup' }).eq('id', orderId);
  if (error) { alert('Error: ' + error.message); return; }
  loadRecentOrders();
}

async function adminCancelOrder(orderId) {
  if (!confirm('¿Cancelar este pedido? Esto lo hace como administrador, sin las restricciones normales de cancelación.')) return;
  const { error } = await db.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
  if (error) { alert('Error: ' + error.message); return; }
  loadRecentOrders();
}

// ------------------------------------------------------------
// 財務サマリー
// ------------------------------------------------------------
async function loadFinancialSummary() {
  const section = document.getElementById('section-summary');
  const { data: orders, error } = await db
    .from('orders')
    .select('price_colones')
    .eq('status', 'delivered');

  if (error) {
    section.innerHTML = `<h2>Resumen financiero</h2><p class="error-text" style="display:block;">${error.message}</p>`;
    return;
  }

  const totalGMV = orders.reduce((sum, o) => sum + (o.price_colones || 0), 0);
  let totalPlatformFee = 0;
  let totalProviderPayout = 0;
  orders.forEach(o => {
    const { platformFee, providerPayout } = calculateProviderPayout(o.price_colones || 0);
    totalPlatformFee += platformFee;
    totalProviderPayout += providerPayout;
  });

  section.innerHTML = `
    <h2>Resumen financiero</h2>
    <p>Pedidos entregados: <strong>${orders.length}</strong></p>
    <p>GMV total: <strong>${formatColones(totalGMV)}</strong></p>
    <p>Comisión ServiYa (incl. Trust &amp; Safety): <strong>${formatColones(totalPlatformFee)}</strong></p>
    <p>Total pagado a Lavanderos/as: <strong>${formatColones(totalProviderPayout)}</strong></p>
  `;
}

// ------------------------------------------------------------
// CSVエクスポート
// ------------------------------------------------------------
function setupExport() {
  const section = document.getElementById('section-export');
  section.innerHTML = `
    <h2>Exportar datos</h2>
    <button class="btn btn-primary" id="export-btn" style="max-width:240px;">Descargar pedidos (CSV)</button>
  `;
  document.getElementById('export-btn').addEventListener('click', exportOrdersCSV);
}

async function exportOrdersCSV() {
  const { data: orders, error } = await db
    .from('orders')
    .select('id, status, estimated_weight_kg, final_weight_kg, price_colones, estimated_price_colones, express, pickup_window, customer_id, provider_id, created_at')
    .order('created_at', { ascending: false });

  if (error) { alert('Error: ' + error.message); return; }

  const headers = ['id', 'status', 'estimated_weight_kg', 'final_weight_kg', 'price_colones', 'estimated_price_colones', 'express', 'pickup_window', 'customer_id', 'provider_id', 'created_at'];
  const rows = orders.map(o => headers.map(h => JSON.stringify(o[h] ?? '')).join(','));
  const csv = [headers.join(','), ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `serviya-pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

loadAdminPanel();
