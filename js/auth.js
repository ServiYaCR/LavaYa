// サインアップ（メール・パスワード）
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorText = document.getElementById('error-text');
    errorText.style.display = 'none';

    const full_name = document.getElementById('full_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!document.getElementById('accept_privacy').checked) {
      errorText.textContent = 'Debes aceptar la Política de Privacidad para continuar.';
      errorText.style.display = 'block';
      return;
    }

    const { data, error } = await db.auth.signUp({ email, password });

    if (error) {
      errorText.textContent = error.message;
      errorText.style.display = 'block';
      return;
    }

    const userId = data.user.id;

    // profiles テーブルに基本情報を作成（role はこの時点では未定）
    const { error: profileError } = await db.from('profiles').insert({
      id: userId,
      full_name,
      email,
      privacy_policy_version: '2026-09-v1',
      privacy_accepted_at: new Date().toISOString()
    });

    if (profileError) {
      errorText.textContent = profileError.message;
      errorText.style.display = 'block';
      return;
    }

    window.location.href = 'role-select.html';
  });
}

// Googleログイン
const googleBtn = document.getElementById('google-signup');
if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    // Supabase Dashboard > Authentication > Providers で Google を有効化し、
    // Google Cloud Console 側でリダイレクトURLを登録しておく必要があります
    await db.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/role-select.html' }
    });
  });
}
