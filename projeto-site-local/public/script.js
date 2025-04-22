document.addEventListener('DOMContentLoaded', function() {
    // Menu responsivo
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('nav ul');
    
    menuToggle.addEventListener('click', function() {
      navMenu.classList.toggle('show');
    });
    
    // Suavizar a rolagem para as âncoras
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (navMenu.classList.contains('show')) {
          navMenu.classList.remove('show');
        }
        
        document.querySelector(this.getAttribute('href')).scrollIntoView({
          behavior: 'smooth'
        });
      });
    });
    
    // Formulário de contato
    const formulario = document.getElementById('formulario-contato');
    const mensagemSucesso = document.getElementById('mensagem-sucesso');
    const mensagemErro = document.getElementById('mensagem-erro');
    
    formulario.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = {
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        mensagem: document.getElementById('mensagem').value
      };
      
      fetch('/api/mensagens', {
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
        
        // Limpar formulário
        formulario.reset();
        
        // Mostrar mensagem de sucesso
        mensagemSucesso.style.display = 'block';
        mensagemErro.style.display = 'none';
        
        // Esconder a mensagem após 3 segundos
        setTimeout(() => {
          mensagemSucesso.style.display = 'none';
        }, 3000);
        
        // Atualizar lista de mensagens
        carregarMensagens();
      })
      .catch(error => {
        console.error('Erro:', error);
        mensagemErro.textContent = error.message || 'Erro ao enviar mensagem.';
        mensagemErro.style.display = 'block';
        mensagemSucesso.style.display = 'none';
        
        // Esconder a mensagem após 3 segundos
        setTimeout(() => {
          mensagemErro.style.display = 'none';
        }, 3000);
      });
    });
    
    // Carregar mensagens do banco de dados
    function carregarMensagens() {
      const listaMensagens = document.getElementById('lista-mensagens');
      
      fetch('/api/mensagens')
        .then(response => response.json())
        .then(mensagens => {
          if (mensagens.length === 0) {
            listaMensagens.innerHTML = '<p class="carregando">Nenhuma mensagem encontrada.</p>';
            return;
          }
          
          let html = '';
          mensagens.forEach(msg => {
            const data = new Date(msg.data).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            
            html += `
              <div class="mensagem-item">
                <div class="mensagem-header">
                  <span class="mensagem-nome">${msg.nome}</span>
                  <span class="mensagem-data">${data}</span>
                </div>
                <div class="mensagem-email">${msg.email}</div>
                <div class="mensagem-texto">${msg.mensagem}</div>
              </div>
            `;
          });
          
          listaMensagens.innerHTML = html;
        })
        .catch(error => {
          console.error('Erro ao carregar mensagens:', error);
          listaMensagens.innerHTML = '<p class="carregando">Erro ao carregar mensagens.</p>';
        });
    }
    
    // Carregar mensagens ao iniciar a página
    carregarMensagens();
  });