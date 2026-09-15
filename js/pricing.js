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
  standardMinimum: 10000,   // 最低合計金額(標準・Express共通)
  expressMinimum: 10000,
  windowSurcharge: {
    normal: 0,
    early: 1500,            // 早朝(5:00-8:00)
    night: 1500             // 夜間(19:00-21:00)
  },
  oversizedItemFee: 4000,   // 大型・特殊品(掛け布団・厚手コート等)1点あたり
  trustSafetyFee: 1500,     // Trust & Safetyフィー: 破損・紛失補償の原資。手数料の分配対象外、全額運営が保持
  platformFeeRate: 0.30     // 運営手数料30%(Trust & Safetyフィーを除いた金額に対して)
};

function calculateEstimatedPrice({ weightKg, express, pickupWindow, oversizedItems = 0 }) {
  const perKg = express ? PRICING.expressPerKg : PRICING.standardPerKg;
  const minimum = express ? PRICING.expressMinimum : PRICING.standardMinimum;

  let subtotal = weightKg * perKg + PRICING.pickupFee;
  subtotal = Math.max(subtotal, minimum);
  subtotal += PRICING.windowSurcharge[pickupWindow] || 0;
  subtotal += oversizedItems * PRICING.oversizedItemFee;

  const total = subtotal + PRICING.trustSafetyFee;
  return Math.round(total);
}

function calculateProviderPayout(priceColones) {
  // priceColones には Trust & Safetyフィーが含まれているので、
  // 分配計算からは除外する(全額運営保持のため)
  const subtotal = Math.max(0, priceColones - PRICING.trustSafetyFee);
  const platformFee = Math.round(subtotal * PRICING.platformFeeRate) + PRICING.trustSafetyFee;
  return {
    platformFee,
    providerPayout: priceColones - platformFee
  };
}

function formatColones(amount) {
  return '₡' + Math.round(amount).toLocaleString('es-CR');
}
