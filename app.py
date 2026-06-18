import os
from flask import Flask, jsonify, redirect, render_template, request, url_for, send_file
from flask_cors import CORS
import sqlite3
from pathlib import Path
import io
import qrcode
import uuid
import secrets
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / 'data.sqlite'

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'super-secret-key'

CREATE_ALUNOS = '''
CREATE TABLE IF NOT EXISTS alunos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    matricula TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
'''

CREATE_PRESENCAS = '''
CREATE TABLE IF NOT EXISTS presencas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    qrcode_id INTEGER,
    FOREIGN KEY(aluno_id) REFERENCES alunos(id),
    FOREIGN KEY(qrcode_id) REFERENCES qrcodes(id)
);
'''

CREATE_QRCODES = '''
CREATE TABLE IF NOT EXISTS qrcodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    used_at TEXT,
    FOREIGN KEY(aluno_id) REFERENCES alunos(id)
);
'''

ADMIN_USER = 'admin'
ADMIN_PASS = 'admin'
TEACHER_USER = 'professor'
TEACHER_PASS = 'Liceusospolitecnico'
STUDENT_REGISTRATION_PASSWORD = 'NATALIA'


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db_connection() as conn:
        conn.execute(CREATE_ALUNOS)
        conn.execute(CREATE_PRESENCAS)
        conn.execute(CREATE_QRCODES)
        conn.commit()


def generate_qr_token():
    """Gera um token único e seguro para cada QR Code"""
    return secrets.token_urlsafe(32)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/cadastro')
def cadastro_page():
    return render_template('register.html')


@app.route('/gerar')
def gerar_page():
    return render_template('generate.html')


@app.route('/scanner')
def scanner_page():
    return render_template('scanner.html')


@app.route('/admin')
def admin_page():
    return render_template('admin.html')


@app.route('/api/alunos', methods=['GET'])
def get_alunos():
    with get_db_connection() as conn:
        alunos = conn.execute('SELECT id, nome, matricula FROM alunos ORDER BY id DESC').fetchall()
        return jsonify([dict(aluno) for aluno in alunos])


@app.route('/api/alunos', methods=['POST'])
def create_aluno():
    payload = request.json or {}
    nome = payload.get('nome', '').strip()
    matricula = payload.get('matricula', '').strip()

    # Validações de segurança
    if not nome or not matricula:
        return jsonify({'error': 'Nome e ID matrícula são obrigatórios.'}), 400

    if len(nome) < 3 or len(nome) > 100:
        return jsonify({'error': 'Nome deve ter entre 3 e 100 caracteres.'}), 400

    if len(matricula) < 3 or len(matricula) > 50:
        return jsonify({'error': 'ID matrícula deve ter entre 3 e 50 caracteres.'}), 400

    senha = payload.get('senha', '').strip()
    if senha != STUDENT_REGISTRATION_PASSWORD:
        return jsonify({'error': 'Senha de cadastro incorreta.'}), 401

    # Validar caracteres permitidos na matrícula (alphanuméricos e hífen)
    if not all(c.isalnum() or c == '-' for c in matricula):
        return jsonify({'error': 'ID matrícula contém caracteres inválidos.'}), 400

    with get_db_connection() as conn:
        try:
            conn.execute('INSERT INTO alunos (nome, matricula) VALUES (?, ?)', (nome, matricula))
            conn.commit()
        except sqlite3.IntegrityError:
            return jsonify({'error': 'Este ID matrícula já está cadastrado.'}), 400

    return jsonify({'success': True})


@app.route('/api/presenca', methods=['POST'])
def criar_presenca():
    payload = request.json or {}
    qr_token = payload.get('qr_token', '').strip()

    if not qr_token:
        return jsonify({'error': 'Token QR obrigatório.'}), 400

    with get_db_connection() as conn:
        # Verificar se o token QR existe e recuperar o aluno
        qrcode_record = conn.execute(
            'SELECT id, aluno_id FROM qrcodes WHERE token = ?',
            (qr_token,)
        ).fetchone()

        if not qrcode_record:
            return jsonify({'error': 'QR Code inválido ou não encontrado.'}), 404

        aluno_id = qrcode_record['aluno_id']
        qrcode_id = qrcode_record['id']

        # Registrar presença
        try:
            conn.execute(
                'INSERT INTO presencas (aluno_id, timestamp, qrcode_id) VALUES (?, datetime("now", "localtime"), ?)',
                (aluno_id, qrcode_id)
            )
            conn.commit()
        except Exception as e:
            return jsonify({'error': 'Erro ao registrar presença.'}), 500

    return jsonify({'success': True})


@app.route('/api/presencas', methods=['GET'])
def get_presencas():
    with get_db_connection() as conn:
        presencas = conn.execute(
            '''SELECT p.id, a.id as aluno_id, a.nome, a.matricula, p.timestamp 
               FROM presencas p 
               JOIN alunos a ON a.id = p.aluno_id 
               ORDER BY p.timestamp DESC'''
        ).fetchall()
        return jsonify([dict(p) for p in presencas])


@app.route('/api/login', methods=['POST'])
def login():
    payload = request.json or {}
    role = payload.get('role')
    username = payload.get('username', '').strip()
    password = payload.get('password', '').strip()

    if role == 'professor':
        if username == TEACHER_USER and password == TEACHER_PASS:
            return jsonify({'success': True})
        return jsonify({'error': 'Credenciais de professor incorretas.'}), 401

    if role == 'admin':
        if username == ADMIN_USER and password == ADMIN_PASS:
            return jsonify({'success': True})
        return jsonify({'error': 'Credenciais de administrador incorretas.'}), 401

    return jsonify({'error': 'Role inválido.'}), 400


@app.route('/api/qrcode')
def qrcode_image():
    aluno_id = request.args.get('aluno_id', '').strip()
    if not aluno_id:
        return jsonify({'error': 'ID do aluno requerido'}), 400

    try:
        aluno_id = int(aluno_id)
    except (ValueError, TypeError):
        return jsonify({'error': 'ID do aluno inválido'}), 400

    with get_db_connection() as conn:
        # Verificar se aluno existe
        aluno = conn.execute('SELECT id, matricula FROM alunos WHERE id = ?', (aluno_id,)).fetchone()
        if not aluno:
            return jsonify({'error': 'Aluno não encontrado.'}), 404

        # Verificar se já existe um QR para este aluno
        existing_qr = conn.execute(
            'SELECT token FROM qrcodes WHERE aluno_id = ?',
            (aluno_id,)
        ).fetchone()

        if existing_qr:
            # Reutilizar token existente
            token = existing_qr['token']
        else:
            # Gerar novo token único
            token = generate_qr_token()
            try:
                conn.execute(
                    'INSERT INTO qrcodes (aluno_id, token) VALUES (?, ?)',
                    (aluno_id, token)
                )
                conn.commit()
            except sqlite3.IntegrityError:
                return jsonify({'error': 'Erro ao gerar QR Code.'}), 500

        # Gerar QR com o token
        payload = f"QR:{token}"
        img = qrcode.make(payload)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        return send_file(buf, mimetype='image/png', download_name=f'qrcode_{aluno["matricula"]}.png')


# Inicializa o banco de dados ao iniciar a aplicação
init_db()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
