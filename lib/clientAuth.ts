export function getStoredUser() {
    try { return JSON.parse(localStorage.getItem('user') ?? 'null'); }
    catch { return null; }
}
export function isLoggedIn() {
    return !!localStorage.getItem('isLoggedIn');
}
export function logoutClient() {
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
}