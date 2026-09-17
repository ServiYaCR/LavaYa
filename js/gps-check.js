// 注文作成・受注の直前に、その場でGPS(位置情報)が実際に
// オンになっているかを確認する。
// 登録時に保存した住所だけに頼らず、"今まさに位置情報サービスが
// 有効かどうか" をその都度チェックするための共通処理。
// Adminページでは使わない(物理的に移動する操作ではないため)。
function requireLiveGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Tu dispositivo no soporta GPS/ubicación.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => reject(new Error('Debes activar el GPS/ubicación de tu dispositivo para continuar.')),
      { timeout: 8000, maximumAge: 0 }
    );
  });
}
