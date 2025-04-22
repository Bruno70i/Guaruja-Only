// Modificações ao database.js - Adicionando tabela de usuários
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt'); // Para hash de senhas
const dbPath = path.resolve(__dirname, 'database', 'site.db');

// Criar conexão com o banco
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados', err.message);
  } else {
    console.log('Conectado ao banco SQLite');
    
    // Criar tabela de usuários
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Erro ao criar tabela de usuários:', err.message);
      } else {
        console.log('Tabela de usuários verificada/criada');
      }
    });
    
    // Criar tabela de mensagens se não existir
    db.run(`CREATE TABLE IF NOT EXISTS mensagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      usuario_id INTEGER,
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    )`, (err) => {
      if (err) {
        console.error('Erro ao criar tabela de mensagens:', err.message);
      } else {
        console.log('Tabela de mensagens verificada/criada');
      }
    });
  }
});

// Funções para gerenciar usuários
const Usuario = {
  // Registrar novo usuário
  registrar: async (nome, email, senha) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Verificar se o email já existe
        db.get('SELECT id FROM usuarios WHERE email = ?', [email], async (err, usuario) => {
          if (err) {
            return reject(err);
          }
          
          if (usuario) {
            return reject(new Error('Este email já está cadastrado'));
          }
          
          // Fazer hash da senha
          const salt = await bcrypt.genSalt(10);
          const senhaHash = await bcrypt.hash(senha, salt);
          
          // Inserir usuário
          db.run(
            'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
            [nome, email, senhaHash],
            function(err) {
              if (err) {
                return reject(err);
              }
              resolve({id: this.lastID, nome, email});
            }
          );
        });
      } catch (error) {
        reject(error);
      }
    });
  },
  
  // Autenticar usuário
  login: async (email, senha) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT id, nome, email, senha FROM usuarios WHERE email = ?', [email], 
        async (err, usuario) => {
          if (err) {
            return reject(err);
          }
          
          if (!usuario) {
            return reject(new Error('Email ou senha inválidos'));
          }
          
          try {
            // Comparar senha
            const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
            
            if (!senhaCorreta) {
              return reject(new Error('Email ou senha inválidos'));
            }
            
            // Não retornar a senha
            const { senha: _, ...usuarioSemSenha } = usuario;
            resolve(usuarioSemSenha);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  },
  
  // Buscar usuário por ID
  buscarPorId: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT id, nome, email FROM usuarios WHERE id = ?', [id], (err, usuario) => {
        if (err) {
          return reject(err);
        }
        
        if (!usuario) {
          return reject(new Error('Usuário não encontrado'));
        }
        
        resolve(usuario);
      });
    });
  }
};

module.exports = { db, Usuario };

// Atualização do server.js - Adicionando autenticação e rotas para usuários
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