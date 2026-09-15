// ドラッグ可能なピンで緯度経度を選ぶ共通コンポーネント。
// register/customer.html, register/provider.html, profile-customer.html,
// profile-provider.html から使う。
// 事前に <div id="map-picker"></div> と、緯度経度用のhidden inputが必要。

let _mapPickerInstance = null;
let _mapPickerMarker = null;
let _mapPickerOnChange = null;

function initMapPicker({ mapDivId, latInputId, lngInputId, displayId, defaultLat, defaultLng, onChange }) {
  const startLat = defaultLat || 9.9281;  // フォールバック: サンホセ中心部
  const startLng = defaultLng || -84.0907;
  _mapPickerOnChange = onChange || null;

  _mapPickerInstance = L.map(mapDivId).setView([startLat, startLng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(_mapPickerInstance);

  _mapPickerMarker = L.marker([startLat, startLng], { draggable: true }).addTo(_mapPickerInstance);

  function updateFromLatLng(latlng) {
    document.getElementById(latInputId).value = latlng.lat;
    document.getElementById(lngInputId).value = latlng.lng;
    if (displayId) {
      document.getElementById(displayId).textContent =
        `Ubicación: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)} (arrastra el pin para ajustar)`;
    }
    if (_mapPickerOnChange) _mapPickerOnChange(latlng.lat, latlng.lng);
  }

  _mapPickerMarker.on('dragend', () => updateFromLatLng(_mapPickerMarker.getLatLng()));

  // 地図をクリックしてもピンを移動できるようにする
  _mapPickerInstance.on('click', (e) => {
    _mapPickerMarker.setLatLng(e.latlng);
    updateFromLatLng(e.latlng);
  });

  updateFromLatLng(_mapPickerMarker.getLatLng());
}

// 「📍 現在地を使う」ボタン用: 地図とピンを指定の座標に移動させる
function recenterMapPicker(lat, lng, latInputId, lngInputId, displayId) {
  if (!_mapPickerInstance || !_mapPickerMarker) return;
  _mapPickerInstance.setView([lat, lng], 16);
  _mapPickerMarker.setLatLng([lat, lng]);
  document.getElementById(latInputId).value = lat;
  document.getElementById(lngInputId).value = lng;
  if (displayId) {
    document.getElementById(displayId).textContent =
      `Ubicación: ${lat.toFixed(5)}, ${lng.toFixed(5)} (arrastra el pin para ajustar)`;
  }
  if (_mapPickerOnChange) _mapPickerOnChange(lat, lng);
}
