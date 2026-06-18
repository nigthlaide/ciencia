const studentForm = document.getElementById('student-form');
const studentMessage = document.getElementById('student-message');
const studentList = document.getElementById('student-list');

async function fetchAlunos() {
  const res = await fetch('/api/alunos');
  const alunos = await res.json();
  studentList.innerHTML = '';
  alunos.forEach((aluno) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<strong>${escapeHtml(aluno.nome)}</strong><em>ID Matrícula: ${escapeHtml(aluno.matricula)}</em>`;
    studentList.appendChild(item);
  });
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function showMessage(text, isSuccess) {
  studentMessage.className = 'message show ' + (isSuccess ? 'success' : 'error');
  studentMessage.textContent = text;
  setTimeout(() => { studentMessage.className = 'message'; }, 5000);
}

studentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('student-name').value.trim();
  const matricula = document.getElementById('student-matricula').value.trim();

  // Validação local
  if (!name || !matricula) {
    showMessage('Nome e ID Matrícula são obrigatórios.', false);
    return;
  }

  if (name.length < 3) {
    showMessage('Nome deve ter pelo menos 3 caracteres.', false);
    return;
  }

  if (matricula.length < 3) {
    showMessage('ID Matrícula deve ter pelo menos 3 caracteres.', false);
    return;
  }

  const res = await fetch('/api/alunos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: name, matricula })
  });

  const data = await res.json();
  if (!res.ok) {
    showMessage(data.error || 'Erro ao cadastrar.', false);
    return;
  }

  showMessage('Aluno cadastrado com sucesso!', true);
  document.getElementById('student-name').value = '';
  document.getElementById('student-matricula').value = '';
  fetchAlunos();
});

window.addEventListener('DOMContentLoaded', fetchAlunos);
