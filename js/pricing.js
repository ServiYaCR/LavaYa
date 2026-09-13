// ============================================================
// ServiYa 料金設定(全国一律 + 時間帯割増)
// 金額を変更したい場合はこの定数だけ書き換えればOKです
// ============================================================
// プロバイダー1人が同時に受けられる仕事の上限(サーバー側にも同じ値のチェックがあります)
const MAX_ACTIVE_JOBS = 3;

const PRICING = {
  standardPerKg: 1300,      // 標準(翌日便) 1kgあたり
  expressPerKg: 2200,       // Express(即日便) 1kgあたり
  pickupFee: 1000,          // 集配定額
  standardMinimum: 6500,    // 標準の最低合計金額
  expressMinimum: 9500,     // Expressの最低合計金額
  windowSurcharge: {
    normal: 0,
    early: 1500,            // 早朝(5:00-8:00)
    night: 1500             // 夜間(19:00-21:00)
  },
  platformFeeRate: 0.15     // 運営手数料15%
};

function calculateEstimatedPrice({ weightKg, express, pickupWindow }) {
  const perKg = express ? PRICING.expressPerKg : PRICING.standardPerKg;
  const minimum = express ? PRICING.expressMinimum : PRICING.standardMinimum;

  let total = weightKg * perKg + PRICING.pickupFee;
  total = Math.max(total, minimum);
  total += PRICING.windowSurcharge[pickupWindow] || 0;

  return Math.round(total);
}

function calculateProviderPayout(priceColones) {
  const platformFee = Math.round(priceColones * PRICING.platformFeeRate);
  return {
    platformFee,
    providerPayout: priceColones - platformFee
  };
}

function formatColones(amount) {
  return '₡' + Math.round(amount).toLocaleString('es-CR');
}
