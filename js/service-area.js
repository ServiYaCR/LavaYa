// ============================================================
// ServiYaの初期サービスエリア: Rohrmoser・Sabana地区
// Parque La Sabana(両地区の境界にある地図上の目印)を中心に、
// 半径で円形にエリアを定義しています。
// 座標出典: Wikipedia「La Sabana Metropolitan Park」(9.935556, -84.104167)
// 半径3.5kmは、Rohrmoser・Sabana Norte/Sur両地区をカバーする目安値です。
// 実際の地区境界とは一致しないので、狭すぎる/広すぎる場合はここを調整してください。
// ============================================================
const SERVICE_AREA = {
  centerLat: 9.935556,
  centerLng: -84.104167,
  radiusKm: 3.5,
  name: 'Rohrmoser / Sabana'
};

// 2点間の距離(km)をHaversine公式で計算
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isWithinServiceArea(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  return distanceKm(lat, lng, SERVICE_AREA.centerLat, SERVICE_AREA.centerLng) <= SERVICE_AREA.radiusKm;
}
