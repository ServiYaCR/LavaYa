populateProvinceCantonSelects('province', 'canton');

// 地図の初期化: まずGPSでの現在地取得を試み、取れなければサンホセ中心部を表示
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      initMapPicker({
        mapDivId: 'map-picker',
        latInputId: 'latitude',
        lngInputId: 'longitude',
        displayId: 'coords-display',
        defaultLat: pos.coords.latitude,
        defaultLng: pos.coords.longitude
      });
    },
    () => {
      initMapPicker({
        mapDivId: 'map-picker',
        latInputId: 'latitude',
        lngInputId: 'longitude',
        displayId: 'coords-display'
      });
      document.getElementById('coords-display').textContent =
        'No se pudo obtener tu ubicación automáticamente. Arrastra el pin en el mapa hasta tu casa.';
    }
  );
} else {
  initMapPicker({
    mapDivId: 'map-picker',
    latInputId: 'latitude',
    lngInputId: 'longitude',
    displayId: 'coords-display'
  });
}

document.getElementById('use-location').addEventListener('click', () => {
  if (!navigator.geolocation) {
    document.getElementById('coords-display').textContent = 'Tu navegador no soporta geolocalización.';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => recenterMapPicker(pos.coords.latitude, pos.coords.longitude, 'latitude', 'longitude', 'coords-display'),
    () => {
      document.getElementById('coords-display').textContent =
        'No se pudo obtener tu ubicación. Revisa los permisos del navegador.';
    }
  );
});

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
    errorText.textContent = 'Por favor confirma tu ubicación en el mapa antes de continuar.';
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
