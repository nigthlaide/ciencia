const studentsContainer = document.getElementById('students-container');
const qrSection = document.getElementById('qr-section');
const qrDisplay = document.getElementById('qr-display');
const qrImg = document.getElementById('qr-img');
const printQrBtn = document.getElementById('print-qr');
const downloadQrBtn = document.getElementById('download-qr');
const qrStudentName = document.getElementById('qr-student-name');
const qrStudentId = document.getElementById('qr-student-id');

let selectedStudentId = null;

async function fetchAlunos() {
  const res = await fetch('/api/alunos');
  const alunos = await res.json();
  
  if (alunos.length === 0) {
    studentsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <p>Nenhum aluno cadastrado ainda.</p>
        <p><a href="/cadastro" style="color: #6366f1; text-decoration: none; font-weight: 600;">Ir para Cadastro →</a></p>
      </div>
    `;
    return;
  }

  studentsContainer.innerHTML = '';
  alunos.forEach((aluno) => {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <div class="student-card-content">
        <div class="student-info">
          <h3>${escapeHtml(aluno.nome)}</h3>
          <p>ID Matrícula: <strong>${escapeHtml(aluno.matricula)}</strong></p>
        </div>
        <div class="student-badge">Selecionar</div>
      </div>
    `;
    card.addEventListener('click', () => selectStudent(aluno));
    studentsContainer.appendChild(card);
  });
}

function selectStudent(aluno) {
  selectedStudentId = aluno.id;
  
  // Atualizar visual dos cards
  document.querySelectorAll('.student-card').forEach(card => {
    card.classList.remove('active');
  });
  event.currentTarget.classList.add('active');

  // Mostrar QR e gerar
  qrSection.style.display = 'block';
  generateQR(aluno);
}

async function generateQR(aluno) {
  try {
    // Buscar QR image do servidor
    const response = await fetch(`/api/qrcode?aluno_id=${aluno.id}`);
    
    if (!response.ok) {
      const error = await response.json();
      showError(error.error || 'Erro ao gerar QR');
      return;
    }

    // Converter para blob e criar URL
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    qrImg.src = url;
    qrStudentName.textContent = escapeHtml(aluno.nome);
    qrStudentId.textContent = escapeHtml(aluno.matricula);
    
    // Guardar blob para download
    qrImg.dataset.blob = url;
    qrImg.dataset.filename = `qrcode_${aluno.matricula}.png`;

  } catch (err) {
    console.error('Erro:', err);
    showError('Erro ao carregar QR Code');
  }
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function showError(message) {
  qrDisplay.innerHTML = `
    <div style="color: #dc2626; padding: 20px; background: #fee2e2; border-radius: 8px;">
      <strong>❌ Erro:</strong> ${escapeHtml(message)}
    </div>
  `;
}

printQrBtn.addEventListener('click', () => {
  window.print();
});

downloadQrBtn.addEventListener('click', () => {
  if (!qrImg.src) return;
  
  const link = document.createElement('a');
  link.href = qrImg.src;
  link.download = qrImg.dataset.filename || 'qrcode.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

window.addEventListener('DOMContentLoaded', fetchAlunos);
