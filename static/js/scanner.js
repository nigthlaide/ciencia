const teacherLoginForm = document.getElementById('teacher-login');
const teacherMessage = document.getElementById('teacher-login-message');
const scannerMessage = document.getElementById('scanner-message');
const readerElemId = 'reader';
const stopScannerBtn = document.getElementById('stop-scanner');
const scanNextBtn = document.getElementById('scan-next');
const loginSection = document.getElementById('login-section');
const scannerSection = document.getElementById('scanner-section');
let html5QrCode = null;

teacherLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  teacherMessage.textContent = '';
  const username = document.getElementById('teacher-user').value.trim();
  const password = document.getElementById('teacher-pass').value.trim();
  const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'professor', username, password }) });
  const data = await res.json();
  if (!res.ok) {
    teacherMessage.textContent = data.error || 'Falha';
    teacherMessage.style.color = '#b91c1c';
    return;
  }
  localStorage.setItem('role', 'professor');
  loginSection.style.display = 'none';
  scannerSection.style.display = 'block';
  scannerMessage.textContent = '';
  startScanner();
});

function startScanner() {
  console.log('startScanner called, Html5Qrcode:', window.Html5Qrcode);
  if (!window.Html5Qrcode) {
    console.error('Html5Qrcode não carregado');
    scannerMessage.textContent = 'Erro ao carregar scanner. Recarregue a página.';
    scannerMessage.style.color = '#b91c1c';
    return;
  }
  if (html5QrCode) return;
  scanNextBtn.style.display = 'none';
  scannerMessage.textContent = 'Abrindo câmera...';
  scannerMessage.style.color = '#1f2937';
  html5QrCode = new Html5Qrcode(readerElemId);
  const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.33333 };
  
  html5QrCode
    .start(
      { facingMode: 'environment' },
      config,
      (decodedText, decodedResult) => {
        console.log('QR Decodificado:', decodedText);
        // decodedText esperado em formato QR:<token>
        let qrToken = decodedText;
        if (decodedText.startsWith('QR:')) {
          qrToken = decodedText.replace(/^QR:/, '');
        } else {
          scannerMessage.textContent = 'QR Code inválido.';
          scannerMessage.style.color = '#b91c1c';
          scanNextBtn.style.display = 'block';
          return;
        }

        html5QrCode.stop().then(() => {
          html5QrCode = null;
          fetch('/api/presenca', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qr_token: qrToken })
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.success) {
                scannerMessage.textContent = 'Presença marcada!';
                scannerMessage.style.color = '#047857';
              } else {
                scannerMessage.textContent = data.error || 'Erro ao registrar';
                scannerMessage.style.color = '#b91c1c';
              }
              scanNextBtn.style.display = 'block';
            })
            .catch((err) => {
              console.error('Erro:', err);
              scannerMessage.textContent = 'Erro ao registrar presença';
              scannerMessage.style.color = '#b91c1c';
              scanNextBtn.style.display = 'block';
            });
        }).catch((e) => {
          console.error('Erro ao parar scanner:', e);
        });
      }
    )
    .catch((err) => {
      console.error('Scanner start error:', err);
      scannerMessage.textContent = `Erro: ${err.message || 'Não foi possível acessar a câmera. Verifique as permissões.'}`;
      scannerMessage.style.color = '#b91c1c';
      scanNextBtn.style.display = 'block';
    });
}

if (scanNextBtn) {
  scanNextBtn.addEventListener('click', () => {
    startScanner();
  });
}

if (stopScannerBtn) {
  stopScannerBtn.addEventListener('click', () => {
    if (html5QrCode) {
      html5QrCode.stop().then(() => {
        html5QrCode = null;
        scannerMessage.textContent = 'Scanner parado.';
        scanNextBtn.style.display = 'none';
      }).catch(() => {});
    }
  });
}
