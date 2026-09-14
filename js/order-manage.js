const STATUS_FLOW = ['awaiting_pickup', 'picked_up', 'washing', 'ready_for_delivery', 'delivered'];

const NEXT_ACTION_LABEL = {
  awaiting_pickup: 'Marcar como recogido',
  picked_up: 'Marcar en lavado',
  washing: 'Ingresar peso y continuar',
  ready_for_delivery: 'Marcar como entregado'
};

function getOrderIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

async function loadOrder() {
  const ok = await requireApprovedProvider();
  if (!ok) return;

  const orderId = getOrderIdFromUrl();
  const card = document.getElementById('order-card');

  if (!orderId) {
    card.innerHTML = '<p class="error-text" style="display:block;">Pedido no especificado.</p>';
    return;
  }

  const { data: order, error } = await db.from('orders').select('*').eq('id', orderId).single();

  if (error || !order) {
    card.innerHTML = '<p class="error-text" style="display:block;">No se encontró el pedido.</p>';
    return;
  }

  let customerProfile = null;
  const isFinished = order.status === 'delivered' || order.status === 'cancelled';

  if (order.provider_id && !isFinished) {
    const { data: cp } = await db
      .from('customer_profiles')
      .select('province, canton, address_notes, access_type, latitude, longitude')
      .eq('id', order.customer_id)
      .single();
    customerProfile = cp;
  }

  renderOrder(order, customerProfile);
}

function renderOrder(order, customerProfile) {
  const card = document.getElementById('order-card');
  const windowLabels = { normal: 'Horario normal', early: 'Madrugada', night: 'Noche' };

  let weightInputHtml = '';
  if (order.status === 'washing') {
    weightInputHtml = `
      <label for="final_weight">Peso real después del lavado (kg)</label>
      <input type="number" id="final_weight" min="0.5" step="0.1" required>
    `;
  }

  const isFinalStep = order.status === 'delivered' || order.status === 'cancelled';
  const actionLabel = NEXT_ACTION_LABEL[order.status];

  const accessTypeLabels = {
    condominio_seguridad: 'Condominio con guarda / seguridad',
    casa_independiente: 'Casa independiente',
    otro: 'Otro'
  };

  const pickupAddressHtml = customerProfile ? `
    <div class="card" style="margin: 16px 0; background: var(--color-bg-soft); border:none;">
      <p class="section-label" style="margin-top:0;">Dirección de recogida</p>
      <p class="hint">${customerProfile.canton}, ${customerProfile.province}</p>
      <p class="hint">${customerProfile.address_notes}</p>
      <p class="hint">Acceso: ${accessTypeLabels[customerProfile.access_type] || customerProfile.access_type}</p>
      ${customerProfile.latitude ? `<a href="https://www.google.com/maps?q=${customerProfile.latitude},${customerProfile.longitude}" target="_blank" class="btn btn-outline" style="margin-top:8px;">Abrir en Google Maps</a>` : ''}
    </div>
  ` : '';

  card.innerHTML = `
    <h1 class="title">Pedido</h1>
    <p class="section-label ${ORDER_STATUS_COLORS[order.status] || ''}" style="margin-top:0;">${ORDER_STATUS_LABELS[order.status] || order.status}</p>
    <p class="hint">${order.estimated_weight_kg || '?'} kg estimado · ${order.express ? 'Express' : 'Estándar'} · ${windowLabels[order.pickup_window] || ''}</p>
    ${order.special_instructions ? `<p class="hint">Instrucciones: "${order.special_instructions}"</p>` : ''}
    ${order.final_weight_kg ? `<p class="hint">Peso confirmado: ${order.final_weight_kg} kg · Monto final: ${formatColones(order.price_colones)}</p>` : ''}

    ${pickupAddressHtml}

    ${weightInputHtml}

    ${!isFinalStep && actionLabel ? `<button class="btn btn-primary" id="advance-btn">${actionLabel}</button>` : ''}
    ${isFinalStep ? `<p class="hint">Este pedido ya está finalizado. Por privacidad, la dirección del cliente ya no está disponible.</p>` : ''}
    <p class="error-text" id="error-text"></p>
  `;

  const advanceBtn = document.getElementById('advance-btn');
  if (advanceBtn) {
    advanceBtn.addEventListener('click', () => advanceStatus(order));
  }
}

async function advanceStatus(order) {
  const errorText = document.getElementById('error-text');
  errorText.style.display = 'none';

  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const nextStatus = STATUS_FLOW[currentIndex + 1];
  const updates = { status: nextStatus };

  if (order.status === 'washing') {
    const finalWeightInput = document.getElementById('final_weight');
    const finalWeight = parseFloat(finalWeightInput.value);

    if (!finalWeight || finalWeight <= 0) {
      errorText.textContent = 'Ingresa el peso real antes de continuar.';
      errorText.style.display = 'block';
      return;
    }

    updates.final_weight_kg = finalWeight;
    updates.price_colones = calculateEstimatedPrice({
      weightKg: finalWeight,
      express: order.express,
      pickupWindow: order.pickup_window
    });
  }

  const { error } = await db.from('orders').update(updates).eq('id', order.id);

  if (error) {
    errorText.textContent = error.message;
    errorText.style.display = 'block';
    return;
  }

  loadOrder();
}

loadOrder();
