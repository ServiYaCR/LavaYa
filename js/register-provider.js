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
    errorText.textContent = 'Por favor captura tu ubicación GPS antes de continuar.';
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
