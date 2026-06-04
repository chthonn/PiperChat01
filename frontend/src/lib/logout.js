export function logout() {
  localStorage.clear();
  window.dispatchEvent(new Event("piperchat:auth-token"));
  window.location.replace("/");
}
