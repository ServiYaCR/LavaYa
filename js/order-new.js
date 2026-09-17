document.getElementById('has_hang_dry').addEventListener('change', (e) => {
  document.getElementById('hangers-field').style.display = e.target.checked ? 'block' : 'none';
  updatePreview();
});

document.getElementById('scheduling_type').addEventListener('change', (e) => {
  const dateField = document.getElementById('scheduled-date-field');
  const dateInput = document.getElementById('scheduled_pickup_date');
  if (e.target.value === 'scheduled') {
    dateField.style.display = 'block';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
    dateInput.required = true;
  } else {
    dateField.style.display = 'none';
    dateInput.required = false;
    dateInput.value = '';
  }
});

['estimated_weight', 'express', 'pickup_window', 'oversized_items'].forEach(id => {
  document.getElementById(id).addEventListener('input', updatePreview);
  document.getElementById(id).addEventListener('change', updatePreview);
});

function updatePreview() {
  const weightKg = parseFloat(document.getElementById('estimated_weight').value) || 0;
  const express = document.getElementById('express').value === 'true';
  const pickupWindow = document.getElementById('pickup_window').value;
  const oversizedItems = parseInt(document.getElementById('oversized_items').value, 10) || 0;

  const price = calculateEstimatedPrice({ weightKg, express, pickupWindow, oversizedItems });
  document.getElementById('price-preview').textContent = formatColones(price);
}

updatePreview();

document.getElementById('order-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorText = document.getElementById('error-text');
  errorText.style.display = 'none';

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    window.location.href = 'signup.html';
    return;
  }

  try {
    await requireLiveGPS();
  } catch (gpsError) {
    errorText.textContent = gpsError.message;
    errorText.style.display = 'block';
    return;
  }

  const weightKg = parseFloat(document.getElementById('estimated_weight').value);
  const express = document.getElementById('express').value === 'true';
  const pickupWindow = document.getElementById('pickup_window').value;
  const hasHangDry = document.getElementById('has_hang_dry').checked;
  const oversizedItems = parseInt(document.getElementById('oversized_items').value, 10) || 0;

  const bagLabels = [{ type: 'machine_dry' }];
  if (hasHangDry) {
    bagLabels.push({
      type: 'hang_dry',
      hangers: parseInt(document.getElementById('hangers_count').value, 10) || 0
    });
  }

  const estimatedPrice = calculateEstimatedPrice({ weightKg, express, pickupWindow, oversizedItems });

  const isScheduled = document.getElementById('scheduling_type').value === 'scheduled';
  const scheduledDate = isScheduled ? document.getElementById('scheduled_pickup_date').value : null;

  if (isScheduled && !scheduledDate) {
    errorText.textContent = 'Selecciona la fecha en la que quieres el servicio.';
    errorText.style.display = 'block';
    return;
  }

  const { error } = await db.from('orders').insert({
    customer_id: user.id,
    status: 'placed',
    express,
    pickup_window: pickupWindow,
    scheduled_pickup_date: scheduledDate,
    bag_labels: bagLabels,
    oversized_items: oversizedItems,
    estimated_weight_kg: weightKg,
    estimated_price_colones: estimatedPrice,
    special_instructions: document.getElementById('special_instructions').value.trim()
  });

  if (error) {
    errorText.textContent = error.message;
    errorText.style.display = 'block';
    return;
  }

  window.location.href = 'dashboard-customer.html';
});
