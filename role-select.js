async function setRole(role) {
  const errorText = document.getElementById('error-text');
  errorText.style.display = 'none';

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    window.location.href = 'signup.html';
    return;
  }

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

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile && profile.role === 'customer') {
    window.location.href = 'dashboard-customer.html';
  } else if (profile && profile.role === 'provider') {
    window.location.href = 'dashboard-provider.html';
  }
})();
