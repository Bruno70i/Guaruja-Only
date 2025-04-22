const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota para página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API para receber mensagens do formulário
app.post('/api/mensagens', (req, res) => {
  const { nome, email, mensagem } = req.body;
  
  if (!nome || !email || !mensagem) {
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
  }
  
  const query = `INSERT INTO mensagens (nome, email, mensagem) VALUES (?, ?, ?)`;
  
  db.run(query, [nome, email, mensagem], function(err) {
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
