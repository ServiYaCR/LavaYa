renderNav('provider', 'profile-provider.html');

let currentUser = null;

async function loadEarnings(userId) {
  const { data: deliveredOrders, error } = await db
    .from('orders')
    .select('price_colones')
    .eq('provider_id', userId)
    .eq('status', 'delivered');

  const totalEl = document.getElementById('earnings-total');
  const detailEl = document.getElementById('earnings-detail');

  if (error) {
    detailEl.textContent = 'No se pudo cargar tus ganancias.';
    return;
  }

  const jobCount = deliveredOrders.length;
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.price_colones || 0), 0);
  const totalEarnings = deliveredOrders.reduce((sum, o) => {
    const { providerPayout } = calculateProviderPayout(o.price_colones || 0);
    return sum + providerPayout;
  }, 0);

  totalEl.textContent = formatColones(totalEarnings);
  detailEl.textContent = `De ${jobCount} trabajo${jobCount === 1 ? '' : 's'} entregado${jobCount === 1 ? '' : 's'} (después de la comisión de ServiYa)`;
}

const STATUS_BADGE_LABELS = {
  pending_review: 'Estado: En revisión',
  approved: 'Estado: Aprobado',
  rejected: 'Estado: Rechazado',
  suspended: 'Estado: Suspendido'
};

function updateServiceAreaMessage(lat, lng) {
  const msg = document.getElementById('service-area-msg');
  if (isWithinServiceArea(lat, lng)) {
    msg.textContent = `✅ Dentro de la zona de servicio (${SERVICE_AREA.name}).`;
    msg.style.color = 'var(--color-success)';
  } else {
    msg.textContent = `⚠️ Esta ubicación está fuera de nuestra zona de servicio actual (${SERVICE_AREA.name}).`;
    msg.style.color = 'var(--color-danger)';
  }
}

async function loadProfile() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) { window.location.href = 'signup.html'; return; }
  currentUser = user;

  loadEarnings(user.id);

  const { data: profile } = await db
    .from('profiles')
    .select('full_name, phone_whatsapp')
    .eq('id', user.id)
    .single();

  const { data: providerProfile } = await db
    .from('provider_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile) {
    document.getElementById('full_name').value = profile.full_name || '';
    document.getElementById('phone').value = profile.phone_whatsapp || '';
  }

  if (providerProfile) {
    document.getElementById('cedula').value = providerProfile.cedula || '';
    document.getElementById('sinpe_phone').value = providerProfile.sinpe_phone || '';
    document.getElementById('has_washer_dryer').checked = !!providerProfile.has_washer_dryer;
    document.getElementById('service_radius').value = providerProfile.service_radius_km || 5;
    document.getElementById('latitude').value = providerProfile.latitude || '';
    document.getElementById('longitude').value = providerProfile.longitude || '';
    document.getElementById('status-badge').textContent =
      STATUS_BADGE_LABELS[providerProfile.status] || providerProfile.status;

    initMapPicker({
      mapDivId: 'map-picker',
      latInputId: 'latitude',
      lngInputId: 'longitude',
      displayId: 'coords-display',
      defaultLat: providerProfile.latitude,
      defaultLng: providerProfile.longitude,
      onChange: updateServiceAreaMessage
    });
  } else {
    initMapPicker({
      mapDivId: 'map-picker',
      latInputId: 'latitude',
      lngInputId: 'longitude',
      displayId: 'coords-display',
      onChange: updateServiceAreaMessage
    });
  }
}

document.getElementById('use-location').addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition(
    (pos) => recenterMapPicker(pos.coords.latitude, pos.coords.longitude, 'latitude', 'longitude', 'coords-display'),
    () => {
      document.getElementById('coords-display').textContent = 'No se pudo obtener tu ubicación.';
    }
  );
});

document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorText = document.getElementById('error-text');
  const savedMsg = document.getElementById('saved-msg');
  errorText.style.display = 'none';
  savedMsg.style.display = 'none';

  const lat = parseFloat(document.getElementById('latitude').value) || null;
  const lng = parseFloat(document.getElementById('longitude').value) || null;

  if (lat !== null && lng !== null && !isWithinServiceArea(lat, lng)) {
    errorText.textContent = `Lo sentimos, por ahora ServiYa solo opera en ${SERVICE_AREA.name}. Esa ubicación está fuera de esa zona.`;
    errorText.style.display = 'block';
    return;
  }

  const { error: profileError } = await db.from('profiles').update({
    full_name: document.getElementById('full_name').value.trim(),
    phone_whatsapp: document.getElementById('phone').value.trim()
  }).eq('id', currentUser.id);

  // 注意: cedula, status, cedula_verified, rating はここから送らない
  // (DB側のトリガーでも保護されているが、そもそも送信しない設計にしている)
  const { error: providerError } = await db.from('provider_profiles').update({
    sinpe_phone: document.getElementById('sinpe_phone').value.trim(),
    has_washer_dryer: document.getElementById('has_washer_dryer').checked,
    service_radius_km: parseFloat(document.getElementById('service_radius').value),
    latitude: lat,
    longitude: lng
  }).eq('id', currentUser.id);

  if (profileError || providerError) {
    errorText.textContent = (profileError || providerError).message;
    errorText.style.display = 'block';
    return;
  }

  savedMsg.style.display = 'block';
});

loadProfile();
