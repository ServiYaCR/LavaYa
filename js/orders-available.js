async function loadAvailableOrders() {
  const ok = await requireApprovedProvider();
  if (!ok) return;

  const { data: { user } } = await db.auth.getUser();

  const { data: providerProfile } = await db
    .from('provider_profiles')
    .select('latitude, longitude')
    .eq('id', user.id)
    .single();

  const list = document.getElementById('orders-list');

  if (!providerProfile || !providerProfile.latitude) {
    list.innerHTML = '<p class="error-text" style="display:block;">No se encontró tu ubicación registrada.</p>';
    return;
  }

  const { count: activeCount } = await db
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', user.id)
    .in('status', ['awaiting_pickup', 'picked_up', 'washing', 'ready_for_delivery']);

  const atLimit = (activeCount || 0) >= MAX_ACTIVE_JOBS;

  const { data: orders, error } = await db.rpc('get_available_orders_with_distance', {
    provider_lat: providerProfile.latitude,
    provider_lng: providerProfile.longitude
  });

  if (error) {
    list.innerHTML = `<p class="error-text" style="display:block;">${error.message}</p>`;
    return;
  }

  if (atLimit) {
    list.innerHTML = `<div class="empty-state">Ya tienes ${MAX_ACTIVE_JOBS} trabajos activos, el máximo permitido. Termina uno para aceptar más.</div>`;
    return;
  }

  if (!orders || orders.length === 0) {
    list.innerHTML = '<div class="empty-state">No hay pedidos disponibles en este momento.</div>';
    return;
  }

  const windowLabels = {
    normal: 'Horario normal (8:00 a.m. – 7:00 p.m.)',
    early: 'Madrugada (5:00 a.m. – 8:00 a.m.)',
    night: 'Noche (7:00 p.m. – 9:00 p.m.)'
  };

  list.innerHTML = orders.map(o => {
    const price = o.estimated_price_colones || calculateEstimatedPrice({
      weightKg: o.estimated_weight_kg || 0,
      express: o.express,
      pickupWindow: o.pickup_window
    });
    const { providerPayout } = calculateProviderPayout(price);

    return `
      <div class="order-row" data-order-id="${o.id}">
        <div class="order-top">
          <div>
            <strong>${o.estimated_weight_kg || '?'} kg</strong> · ${o.express ? 'Express' : 'Estándar'}
          </div>
          <div class="payout">${formatColones(providerPayout)}</div>
        </div>
        <div class="order-meta">📍 ${o.canton}, ${o.province} · ${o.distance_km} km de ti</div>
        <div class="order-meta">${windowLabels[o.pickup_window] || o.pickup_window}</div>
        ${o.scheduled_pickup_date ? `<div class="order-meta">📅 Recogida programada para hoy</div>` : ''}
        ${o.special_instructions ? `<div class="order-meta">"${o.special_instructions}"</div>` : ''}
        <button class="btn btn-primary accept-btn" onclick="acceptOrder('${o.id}')">Aceptar pedido</button>
      </div>
    `;
  }).join('');
}

async function acceptOrder(orderId) {
  const { data: { user } } = await db.auth.getUser();

  const { error } = await db
    .from('orders')
    .update({ provider_id: user.id, status: 'awaiting_pickup' })
    .eq('id', orderId)
    .eq('status', 'placed')
    .is('provider_id', null);

  if (error) {
    alert('No se pudo aceptar el pedido (puede que otro Lavandero/a ya lo tomó). Intenta con otro.');
    loadAvailableOrders();
    return;
  }

  window.location.href = 'dashboard-provider.html';
}

loadAvailableOrders();
