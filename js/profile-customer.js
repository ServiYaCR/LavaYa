renderNav('customer', 'profile-customer.html');
populateProvinceCantonSelects('province', 'canton');

let currentUser = null;

async function loadProfile() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) { window.location.href = 'signup.html'; return; }
  currentUser = user;

  const { data: profile } = await db
    .from('profiles')
    .select('full_name, phone_whatsapp')
    .eq('id', user.id)
    .single();

  const { data: customerProfile } = await db
    .from('customer_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile) {
    document.getElementById('full_name').value = profile.full_name || '';
    document.getElementById('phone').value = profile.phone_whatsapp || '';
  }

  if (customerProfile) {
    document.getElementById('province').value = customerProfile.province || '';
    document.getElementById('province').dispatchEvent(new Event('change'));
    document.getElementById('canton').value = customerProfile.canton || '';
    document.getElementById('address_notes').value = customerProfile.address_notes || '';
    document.getElementById('access_type').value = customerProfile.access_type || '';
    document.getElementById('payment_method').value = customerProfile.payment_method || '';
    document.getElementById('latitude').value = customerProfile.latitude || '';
    document.getElementById('longitude').value = customerProfile.longitude || '';

    // 保存済みの位置があればそこを中心に、無ければGPS→それも無理ならサンホセ中心部
    initMapPicker({
      mapDivId: 'map-picker',
      latInputId: 'latitude',
      lngInputId: 'longitude',
      displayId: 'coords-display',
      defaultLat: customerProfile.latitude,
      defaultLng: customerProfile.longitude
    });
  } else {
    initMapPicker({
      mapDivId: 'map-picker',
      latInputId: 'latitude',
      lngInputId: 'longitude',
      displayId: 'coords-display'
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

  const { error: profileError } = await db.from('profiles').update({
    full_name: document.getElementById('full_name').value.trim(),
    phone_whatsapp: document.getElementById('phone').value.trim()
  }).eq('id', currentUser.id);

  const { error: customerError } = await db.from('customer_profiles').update({
    province: document.getElementById('province').value,
    canton: document.getElementById('canton').value,
    address_notes: document.getElementById('address_notes').value.trim(),
    access_type: document.getElementById('access_type').value,
    payment_method: document.getElementById('payment_method').value,
    latitude: parseFloat(document.getElementById('latitude').value) || null,
    longitude: parseFloat(document.getElementById('longitude').value) || null
  }).eq('id', currentUser.id);

  if (profileError || customerError) {
    errorText.textContent = (profileError || customerError).message;
    errorText.style.display = 'block';
    return;
  }

  savedMsg.style.display = 'block';
});

loadProfile();
