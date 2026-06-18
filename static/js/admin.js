const adminLoginForm = document.getElementById('admin-login');
const adminMessage = document.getElementById('admin-login-message');
const attendanceReport = document.getElementById('attendance-report');
const adminLoginCard = document.getElementById('admin-login-card');
const adminLogoutBtn = document.getElementById('admin-logout');
const adminStatus = document.getElementById('admin-status');

function isAdminLoggedIn() {
  return localStorage.getItem('role') === 'admin';
}

function updateAdminUI() {
  const loggedIn = isAdminLoggedIn();
  adminLoginCard.style.display = loggedIn ? 'none' : 'block';
  adminLogoutBtn.style.display = loggedIn ? 'inline-flex' : 'none';
  document.getElementById('admin-report-card').style.display = loggedIn ? 'block' : 'none';
  adminStatus.textContent = loggedIn ? 'Conectado como administrador.' : 'Faça login para acessar o relatório.';
  adminStatus.className = loggedIn ? 'message show success' : 'message show';

  if (loggedIn) {
    fetchPresencas();
  } else {
    attendanceReport.innerHTML = '';
  }
}

adminLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  adminMessage.className = 'message';
  adminMessage.textContent = '';
  const username = document.getElementById('admin-user').value.trim();
  const password = document.getElementById('admin-pass').value.trim();
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'admin', username, password })
  });
  const data = await res.json();
  if (!res.ok) {
    adminMessage.className = 'message show error';
    adminMessage.textContent = data.error || 'Falha na autenticação';
    return;
  }
  localStorage.setItem('role', 'admin');
  adminMessage.className = 'message show success';
  adminMessage.textContent = 'Logado como administrador';
  setTimeout(() => { adminMessage.className = 'message'; }, 3000);
  updateAdminUI();
});

adminLogoutBtn.addEventListener('click', () => {
  localStorage.removeItem('role');
  adminMessage.className = 'message show';
  adminMessage.textContent = 'Sessão de administrador encerrada.';
  updateAdminUI();
});

async function fetchPresencas() {
  const res = await fetch('/api/presencas');
  const data = await res.json();
  attendanceReport.innerHTML = '';
  if (data.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'list-item';
    empty.textContent = 'Nenhuma presença registrada ainda.';
    empty.style.textAlign = 'center';
    attendanceReport.appendChild(empty);
    return;
  }
  data.forEach((r) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const timestamp = new Date(r.timestamp).toLocaleString('pt-BR');
    item.innerHTML = `
      <strong>${escapeHtml(r.nome)}</strong>
      <em>ID Matrícula: ${escapeHtml(r.matricula)} — ${timestamp}</em>
    `;
    attendanceReport.appendChild(item);
  });
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

window.addEventListener('DOMContentLoaded', () => {
  updateAdminUI();
});
