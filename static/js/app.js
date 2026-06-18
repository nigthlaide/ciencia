const state = {
  role: null,
  selectedStudent: null,
};

const sectionHome = document.getElementById('home');
const sectionScanner = document.getElementById('scanner');
const sectionAdmin = document.getElementById('admin');
const navButtons = document.querySelectorAll('.nav-buttons button');
const studentList = document.getElementById('student-list');
const chooseStudent = document.getElementById('choose-student');
const qrBox = document.getElementById('qr-box');
const studentForm = document.getElementById('student-form');
const studentMessage = document.getElementById('student-message');
const teacherLoginForm = document.getElementById('teacher-login');
const teacherMessage = document.getElementById('teacher-login-message');
const adminLoginForm = document.getElementById('admin-login');
const adminMessage = document.getElementById('admin-login-message');
const scanMatricula = document.getElementById('scan-matricula');
const registerPresenceButton = document.getElementById('register-presence');
const scannerMessage = document.getElementById('scanner-message');
const attendanceReport = document.getElementById('attendance-report');
const generateQrButton = document.getElementById('generate-qr');
const printQrButton = document.getElementById('print-qr');

function setView(target) {
  [sectionHome, sectionScanner, sectionAdmin].forEach((section) => {
    section.classList.toggle('active', section.id === target);
  });
}

function getLoggedRole() {
  return localStorage.getItem('role');
}

function setLoggedRole(role) {
  state.role = role;
  localStorage.setItem('role', role);
}

function logout() {
  localStorage.removeItem('role');
  state.role = null;
  studentMessage.textContent = '';
  teacherMessage.textContent = '';
  adminMessage.textContent = '';
  scannerMessage.textContent = '';
}

async function fetchAlunos() {
  const response = await fetch('/api/alunos');
  const alunos = await response.json();
  studentList.innerHTML = '';
  chooseStudent.innerHTML = '';

  alunos.forEach((aluno) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<strong>${aluno.nome}</strong><span>Matrícula: ${aluno.matricula}</span>`;
    studentList.appendChild(item);

    const option = document.createElement('option');
    option.value = aluno.matricula;
    option.textContent = `${aluno.nome} — ${aluno.matricula}`;
    chooseStudent.appendChild(option);
  });

  if (alunos.length > 0) {
    state.selectedStudent = alunos[0];
  }
}

async function refreshAttendance() {
  const response = await fetch('/api/presencas');
  const records = await response.json();
  attendanceReport.innerHTML = '';
  records.forEach((record) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<strong>${record.nome}</strong><span>${record.matricula} — ${new Date(record.timestamp).toLocaleString('pt-BR')}</span>`;
    attendanceReport.appendChild(item);
  });
}

studentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  studentMessage.textContent = '';

  const name = document.getElementById('student-name').value.trim();
  const matricula = document.getElementById('student-matricula').value.trim();

  const response = await fetch('/api/alunos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: name, matricula }),
  });

  const data = await response.json();
  if (!response.ok) {
    studentMessage.textContent = data.error || 'Erro ao cadastrar aluno.';
    studentMessage.style.color = '#b91c1c';
    return;
  }

  studentMessage.textContent = 'Aluno cadastrado com sucesso!';
  studentMessage.style.color = '#047857';
  document.getElementById('student-name').value = '';
  document.getElementById('student-matricula').value = '';
  await fetchAlunos();
});

teacherLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  teacherMessage.textContent = '';

  const username = document.getElementById('teacher-user').value.trim();
  const password = document.getElementById('teacher-pass').value.trim();

  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'professor', username, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    teacherMessage.textContent = data.error || 'Login falhou.';
    teacherMessage.style.color = '#b91c1c';
    return;
  }

  setLoggedRole('professor');
  teacherMessage.textContent = 'Professor logado com sucesso!';
  teacherMessage.style.color = '#047857';
});

adminLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  adminMessage.textContent = '';

  const username = document.getElementById('admin-user').value.trim();
  const password = document.getElementById('admin-pass').value.trim();

  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'admin', username, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    adminMessage.textContent = data.error || 'Login falhou.';
    adminMessage.style.color = '#b91c1c';
    return;
  }

  setLoggedRole('admin');
  adminMessage.textContent = 'Admin logado com sucesso!';
  adminMessage.style.color = '#047857';
  await refreshAttendance();
});

registerPresenceButton.addEventListener('click', async () => {
  scannerMessage.textContent = '';
  if (getLoggedRole() !== 'professor') {
    scannerMessage.textContent = 'Faça login como professor para registrar presença.';
    scannerMessage.style.color = '#b91c1c';
    return;
  }

  const matricula = scanMatricula.value.trim();
  if (!matricula) {
    scannerMessage.textContent = 'Digite a matrícula do aluno.';
    scannerMessage.style.color = '#b91c1c';
    return;
  }

  const response = await fetch('/api/presenca', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matricula }),
  });

  const data = await response.json();
  if (!response.ok) {
    scannerMessage.textContent = data.error || 'Falha ao registrar presença.';
    scannerMessage.style.color = '#b91c1c';
    return;
  }

  scannerMessage.textContent = 'Presença registrada com sucesso!';
  scannerMessage.style.color = '#047857';
  scanMatricula.value = '';
});

generateQrButton.addEventListener('click', () => {
  const matricula = chooseStudent.value;
  if (!matricula) {
    qrBox.innerHTML = '<p>Selecione um aluno para gerar QR.</p>';
    return;
  }
  qrBox.innerHTML = `<div class="qr-code">${matricula}</div><p class="qr-text">QR gerado para matrícula <strong>${matricula}</strong></p>`;
});

printQrButton.addEventListener('click', () => {
  if (!qrBox.innerHTML.trim()) {
    qrBox.innerHTML = '<p>Gere o QR antes de imprimir.</p>';
    return;
  }
  window.print();
});

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setView(button.dataset.target);
  });
});

window.addEventListener('DOMContentLoaded', async () => {
  const savedRole = getLoggedRole();
  if (savedRole) {
    state.role = savedRole;
  }
  setView('home');
  await fetchAlunos();
  await refreshAttendance();
});