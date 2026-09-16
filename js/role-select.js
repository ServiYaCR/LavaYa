// role-select.htmlに来た時点で、profiles行がまだ無ければ作る
// (Googleログインの場合、signup.htmlの処理を通らないためこの補完が必要)
async function ensureProfileExists(user) {
  const { data: existing } = await db.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (!existing) {
    await db.from('profiles').insert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
      email: user.email
    });
  }
}

async function setRole(role) {
  const errorText = document.getElementById('error-text');
  errorText.style.display = 'none';

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    window.location.href = 'signup.html';
    return;
  }

  await ensureProfileExists(user);

  // profiles.role にフラグを保存 → 次回ログイン時もこれを見て画面を出し分ける
  const { error } = await db.from('profiles').update({ role }).eq('id', user.id);

  if (error) {
    errorText.textContent = error.message;
    errorText.style.display = 'block';
    return;
  }

  window.location.href = role === 'customer'
    ? 'register/customer.html'
    : 'register/provider.html';
}

document.getElementById('role-customer').addEventListener('click', () => setRole('customer'));
document.getElementById('role-provider').addEventListener('click', () => setRole('provider'));

// 既に役割が決まっている人(Googleログインで戻ってきた既存ユーザーなど)は
// 選択画面を出さず、そのままダッシュボードへ自動的に振り分ける
(async () => {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;

  await ensureProfileExists(user);

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile && profile.role === 'customer') {
    window.location.href = 'dashboard-customer.html';
  } else if (profile && profile.role === 'provider') {
    const { data: providerProfile } = await db
      .from('provider_profiles')
      .select('status')
      .eq('id', user.id)
      .single();

    if (!providerProfile || providerProfile.status !== 'approved') {
      window.location.href = 'pending-review.html';
    } else {
      window.location.href = 'dashboard-provider.html';
    }
  }
})();
