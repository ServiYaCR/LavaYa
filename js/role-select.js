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
