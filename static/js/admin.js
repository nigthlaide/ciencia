const adminLoginForm = document.getElementById('admin-login');
const adminMessage = document.getElementById('admin-login-message');
const attendanceReport = document.getElementById('attendance-report');

adminLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  adminMessage.className = '';
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
  fetchPresencas();
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
  const role = localStorage.getItem('role');
  if (role === 'admin') fetchPresencas();
});
