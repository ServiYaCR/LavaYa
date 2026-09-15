// cédula 入力マスク: 1-2345-6789 の形式に自動整形
const cedulaInput = document.getElementById('cedula');
cedulaInput.addEventListener('input', () => {
  let digits = cedulaInput.value.replace(/\D/g, '').slice(0, 9);
  let formatted = digits;
  if (digits.length > 5) {
    formatted = `${digits.slice(0,1)}-${digits.slice(1,5)}-${digits.slice(5,9)}`;
  } else if (digits.length > 1) {
    formatted = `${digits.slice(0,1)}-${digits.slice(1,5)}`;
  }
  cedulaInput.value = formatted;
});

function updateServiceAreaMessage(lat, lng) {
  const msg = document.getElementById('service-area-msg');
  if (isWithinServiceArea(lat, lng)) {
    msg.textContent = `✅ Dentro de la zona de servicio (${SERVICE_AREA.name}).`;
    msg.style.color = 'var(--color-success)';
  } else {
    msg.textContent = `⚠️ Esta ubicación está fuera de nuestra zona de servicio actual (${SERVICE_AREA.name}). Por ahora no podemos completar tu registro.`;
    msg.style.color = 'var(--color-danger)';
  }
}

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
        defaultLng: pos.coords.longitude,
        onChange: updateServiceAreaMessage
      });
    },
    () => {
      initMapPicker({
        mapDivId: 'map-picker',
        latInputId: 'latitude',
        lngInputId: 'longitude',
        displayId: 'coords-display',
        onChange: updateServiceAreaMessage
      });
      document.getElementById('coords-display').textContent =
        'No se pudo obtener tu ubicación automáticamente. Arrastra el pin en el mapa.';
    }
  );
} else {
  initMapPicker({
    mapDivId: 'map-picker',
    latInputId: 'latitude',
    lngInputId: 'longitude',
    displayId: 'coords-display',
    onChange: updateServiceAreaMessage
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

async function uploadVerificationFile(file, userId, kind) {
  const path = `${userId}/${kind}-${Date.now()}-${file.name}`;
  const { error } = await db.storage.from('verification-docs').upload(path, file);
  if (error) throw error;
  const { data } = db.storage.from('verification-docs').getPublicUrl(path);
  return data.publicUrl;
}

document.getElementById('provider-form').addEventListener('submit', async (e) => {
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

  if (!isWithinServiceArea(parseFloat(document.getElementById('latitude').value), parseFloat(document.getElementById('longitude').value))) {
    errorText.textContent = `Lo sentimos, por ahora ServiYa solo opera en ${SERVICE_AREA.name}. Tu ubicación está fuera de esa zona.`;
    errorText.style.display = 'block';
    return;
  }

  const cedulaDigits = cedulaInput.value.replace(/\D/g, '');
  if (cedulaDigits.length !== 9) {
    errorText.textContent = 'La cédula debe tener 9 dígitos.';
    errorText.style.display = 'block';
    return;
  }

  if (!document.getElementById('accept_biometric').checked) {
    errorText.textContent = 'Debes autorizar el uso de tu fotografía y cédula para continuar.';
    errorText.style.display = 'block';
    return;
  }

  try {
    // 1) profiles.phone_whatsapp を更新
    await db.from('profiles').update({
      phone_whatsapp: document.getElementById('phone').value.trim()
    }).eq('id', user.id);

    // 2) 写真をSupabase Storageにアップロード
    const facePhotoUrl = await uploadVerificationFile(
      document.getElementById('face_photo').files[0], user.id, 'face'
    );
    const cedulaPhotoUrl = await uploadVerificationFile(
      document.getElementById('cedula_photo').files[0], user.id, 'cedula'
    );

    // 3) TSE照合API連携は次フェーズで有効化予定。
    //    現時点ではcedula_verified=falseのまま保存し、運営側が手動レビューする。
    //    (Supabase Edge Function 'verify-cedula' からDidit/Verifik等を呼び出す設計)
    const { error: providerError } = await db.from('provider_profiles').insert({
      id: user.id,
      cedula: cedulaDigits,
      cedula_verified: false,
      face_photo_url: facePhotoUrl,
      cedula_photo_url: cedulaPhotoUrl,
      sinpe_phone: document.getElementById('sinpe_phone').value.trim(),
      has_washer_dryer: document.getElementById('has_washer_dryer').checked,
      service_radius_km: parseFloat(document.getElementById('service_radius').value),
      latitude: parseFloat(document.getElementById('latitude').value),
      longitude: parseFloat(document.getElementById('longitude').value),
      biometric_consent_at: new Date().toISOString(),
      status: 'pending_review'
    });

    if (providerError) throw providerError;

    window.location.href = '../pending-review.html';
  } catch (err) {
    errorText.textContent = err.message || 'Ocurrió un error. Intenta de nuevo.';
    errorText.style.display = 'block';
  }
});
