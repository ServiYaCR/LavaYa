document.getElementById('has_hang_dry').addEventListener('change', (e) => {
  document.getElementById('hangers-field').style.display = e.target.checked ? 'block' : 'none';
  updatePreview();
});

['estimated_weight', 'express', 'pickup_window'].forEach(id => {
  document.getElementById(id).addEventListener('input', updatePreview);
  document.getElementById(id).addEventListener('change', updatePreview);
});

function updatePreview() {
  const weightKg = parseFloat(document.getElementById('estimated_weight').value) || 0;
  const express = document.getElementById('express').value === 'true';
  const pickupWindow = document.getElementById('pickup_window').value;

  const price = calculateEstimatedPrice({ weightKg, express, pickupWindow });
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

  const weightKg = parseFloat(document.getElementById('estimated_weight').value);
  const express = document.getElementById('express').value === 'true';
  const pickupWindow = document.getElementById('pickup_window').value;
  const hasHangDry = document.getElementById('has_hang_dry').checked;

  const bagLabels = [{ type: 'machine_dry' }];
  if (hasHangDry) {
    bagLabels.push({
      type: 'hang_dry',
      hangers: parseInt(document.getElementById('hangers_count').value, 10) || 0
    });
  }

  const estimatedPrice = calculateEstimatedPrice({ weightKg, express, pickupWindow });

  const { error } = await db.from('orders').insert({
    customer_id: user.id,
    status: 'placed',
    express,
    pickup_window: pickupWindow,
    bag_labels: bagLabels,
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
