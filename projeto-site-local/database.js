const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
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