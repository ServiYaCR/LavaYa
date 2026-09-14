const ORDER_STATUS_LABELS = {
  placed: 'Buscando Lavandero/a',
  awaiting_pickup: 'Recogida programada',
  picked_up: 'Recogido',
  washing: 'En lavado',
  ready_for_delivery: 'Listo para entrega',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  disputed: 'En revisión'
};

// 状態ごとの色分け(dashboardの緑一色を避けるため)
// neutral=待機中(グレー) progress=作業中(ティール) warning=もうすぐ完了(オレンジ)
// success=完了(緑) danger=問題あり(赤)
const ORDER_STATUS_COLORS = {
  placed: 'status-neutral',
  awaiting_pickup: 'status-neutral',
  picked_up: 'status-progress',
  washing: 'status-progress',
  ready_for_delivery: 'status-warning',
  delivered: 'status-success',
  cancelled: 'status-danger',
  disputed: 'status-danger'
};
