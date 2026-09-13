// プロバイダー向けページの入口で呼び出す。
// 未ログイン → signup.htmlへ、承認待ち/却下/停止中 → pending-review.htmlへ
// 承認済みならtrueを返す
async function requireApprovedProvider() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    window.location.href = 'signup.html';
    return false;
  }

  const { data: profile } = await db
    .from('provider_profiles')
    .select('status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.status !== 'approved') {
    window.location.href = 'pending-review.html';
    return false;
  }

  return true;
}
