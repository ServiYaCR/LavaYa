async function logout() {
  await db.auth.signOut();
  window.location.href = 'index.html';
}
