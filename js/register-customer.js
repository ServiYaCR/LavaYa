populateProvinceCantonSelects('province', 'canton');

document.getElementById('use-location').addEventListener('click', () => {
  if (!navigator.geolocation) {
    document.getElementById('coords-display').textContent = 'Tu navegador no soporta geolocalización.';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      document.getElementById('latitude').value = pos.coords.latitude;
      document.getElementById('longitude').value = pos.coords.longitude;
      document.getElementById('coords-display').textContent =
        `Ubicación capturada: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
    },
    () => {
      document.getElementById('coords-display').textContent =
        'No se pudo obtener tu ubicación. Revisa los permisos del navegador.';
    }
  );
});

// Nota de implementación: para un selector de mapa visual (arrastrar el pin
// sobre un mapa en vez de solo un botón de "usar mi ubicación"), se necesita
// una API key de Google Maps o Mapbox. Se puede añadir en una siguiente fase
// reemplazando este bloque por un <div id="map-picker"> interactivo.

document.getElementById('customer-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorText = document.getElementById('error-text');
  errorText.style.display = 'none';

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    window.location.href = '../signup.html';
    return;
  }

  if (!document.getElementById('latitude').value) {
    errorText.textContent = 'Por favor captura tu ubicación GPS antes de continuar.';
    errorText.style.display = 'block';
    return;
  }

  // 1) profiles.phone_whatsapp を更新
  const { error: profileError } = await db.from('profiles')
    .update({ phone_whatsapp: document.getElementById('phone').value.trim() })
    .eq('id', user.id);

  if (profileError) {
    errorText.textContent = profileError.message;
    errorText.style.display = 'block';
    return;
  }

  // 2) customer_profiles を作成
  const { error: customerError } = await db.from('customer_profiles').insert({
    id: user.id,
    latitude: parseFloat(document.getElementById('latitude').value),
    longitude: parseFloat(document.getElementById('longitude').value),
    province: document.getElementById('province').value,
    canton: document.getElementById('canton').value,
    address_notes: document.getElementById('address_notes').value.trim(),
    access_type: document.getElementById('access_type').value,
    payment_method: document.getElementById('payment_method').value
  });

  if (customerError) {
    errorText.textContent = customerError.message;
    errorText.style.display = 'block';
    return;
  }

  window.location.href = '../dashboard-customer.html';
});
