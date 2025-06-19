const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const { db, Usuario } = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configurar sessões
app.use(session({
  store: new SQLiteStore({
    db: 'sessoes.sqlite',
    dir: './database'
  }),
  secret: 'seu_secret_para_sessao',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 // 1 dia
  }
}));

// Middleware para verificar autenticação
const autenticado = (req, res, next) => {
  if (req.session.usuarioId) {
    return next();
  }
  
  res.status(401).json({ erro: 'Não autorizado' });
};

// Rotas para páginas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/registro', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'registro.html'));
});

app.get('/painel', (req, res) => {
  if (!req.session.usuarioId) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'painel.html'));
});

// API para usuários
app.post('/api/registro', async (req, res) => {
  const { nome, email, senha, confirmarSenha } = req.body;
  
  // Validações básicas
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
  }
  
  if (senha !== confirmarSenha) {
    return res.status(400).json({ erro: 'As senhas não coincidem' });
  }
  
  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres' });
  }
  
  try {
    const usuario = await Usuario.registrar(nome, email, senha);
    
    // Criar a sessão para o usuário
    req.session.usuarioId = usuario.id;
    req.session.usuarioNome = usuario.nome;
    
    res.status(201).json({ 
      mensagem: 'Usuário registrado com sucesso',
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }
    });
  } catch (error) {
    res.status(400).json({ erro: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
  }
  
  try {
    const usuario = await Usuario.login(email, senha);
    
    // Criar a sessão para o usuário
    req.session.usuarioId = usuario.id;
    req.session.usuarioNome = usuario.nome;
    
    res.json({ 
      mensagem: 'Login realizado com sucesso',
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }
    });
  } catch (error) {
    res.status(401).json({ erro: error.message });
  }
});

app.get('/api/usuario', autenticado, async (req, res) => {
  try {
    const usuario = await Usuario.buscarPorId(req.session.usuarioId);
    res.json(usuario);
  } catch (error) {
    res.status(404).json({ erro: error.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao fazer logout' });
    }
    
    res.json({ mensagem: 'Logout realizado com sucesso' });
  });
});

// API para mensagens (atualizada para incluir usuário_id)
app.post('/api/mensagens', async (req, res) => {
  const { nome, email, mensagem } = req.body;
  
  if (!nome || !email || !mensagem) {
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
  }
  
  const usuarioId = req.session.usuarioId || null;
  
  const query = `INSERT INTO mensagens (nome, email, mensagem, usuario_id) VALUES (?, ?, ?, ?)`;
  
  db.run(query, [nome, email, mensagem, usuarioId], function(err) {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao salvar mensagem' });
    }
    
    res.status(201).json({ 
      mensagem: 'Mensagem enviada com sucesso',
      id: this.lastID 
    });
  });
});

// API para listar mensagens
app.get('/api/mensagens', (req, res) => {
  db.all('SELECT * FROM mensagens ORDER BY data DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao buscar mensagens' });
    }
    res.json(rows);
  });
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});










