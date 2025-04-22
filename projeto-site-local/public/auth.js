document.addEventListener('DOMContentLoaded', function() {
    // Menu responsivo
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('nav ul');
    
    menuToggle.addEventListener('click', function() {
      navMenu.classList.toggle('show');
    });
    
    // Verificar se estamos na página de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
          email: document.getElementById('email').value,
          senha: document.getElementById('senha').value
        };
        
        fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
          if (data.erro) {
            throw new Error(data.erro);
          }
          
          // Redirecionar para o painel
          window.location.href = '/painel';
        })
        .catch(error => {
          const mensagemErro = document.getElementById('mensagem-erro');
          mensagemErro.textContent = error.message;
          mensagemErro.style.display = 'block';
        });
      });
    }
    
    // Verificar se estamos na página de registro
    const registroForm = document.getElementById('registro-form');
    if (registroForm) {
      registroForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const senha = document.getElementById('senha').value;
        const confirmarSenha = document.getElementById('confirmarSenha').value;
        
        if (senha !== confirmarSenha) {
          const mensagemErro = document.getElementById('mensagem-erro');
          mensagemErro.textContent = 'As senhas não coincidem';
          mensagemErro.style.display = 'block';
          return;
        }
        
        const formData = {
          nome: document.getElementById('nome').value,
          email: document.getElementById('email').value,
          senha: senha,
          confirmarSenha: confirmarSenha
        };
        
        fetch('/api/registro', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
          if (data.erro) {
            throw new Error(data.erro);
          }
          
          // Redirecionar para o painel
          window.location.href = '/painel';
        })
        .catch(error => {
          const mensagemErro = document.getElementById('mensagem-erro');
          mensagemErro.textContent = error.message;
          mensagemErro.style.display = 'block';
        });
      });
    }
  });