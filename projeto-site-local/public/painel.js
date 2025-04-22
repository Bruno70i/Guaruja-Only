// Arquivo public/painel.js - JavaScript para o painel do usuário
document.addEventListener('DOMContentLoaded', function() {
    // Menu responsivo
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('nav ul');
    
    menuToggle.addEventListener('click', function() {
      navMenu.classList.toggle('show');
    });
    
    // Buscar informações do usuário
    fetch('/api/usuario')
      .then(response => {
        // Se não estiver autenticado, redirecionar para login
        if (response.status === 401) {
          window.location.href = '/login';
          throw new Error('Não autenticado');
        }
        return response.json();
      })
      .then(usuario => {
        const usuarioInfo = document.getElementById('usuario-info');
        usuarioInfo.innerHTML = `<p>Bem-vindo, <strong>${usuario.nome}</strong> | ${usuario.email}</p>`;
        
        // Agora que confirmamos autenticação, carregamos as mensagens
        carregarMinhasMensagens();
      })
      .catch(error => {
        console.error('Erro:', error);
      });
    
    // Logout
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
      logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        fetch('/api/logout', {
          method: 'POST',
        })
        .then(response => response.json())
        .then(() => {
          window.location.href = '/login';
        })
        .catch(error => {
          console.error('Erro ao fazer logout:', error);
        });
      });
    }
    
    // Formulário de mensagem no painel
    const formularioMensagem = document.getElementById('formulario-mensagem-painel');
    if (formularioMensagem) {
      formularioMensagem.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Buscar o nome e email do usuário atual da API
        fetch('/api/usuario')
          .then(response => response.json())
          .then(usuario => {
            const formData = {
              nome: usuario.nome,
              email: usuario.email,
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
              formularioMensagem.reset();
              
              // Mostrar mensagem de sucesso
              const mensagemSucesso = document.getElementById('mensagem-sucesso');
              mensagemSucesso.style.display = 'block';
              document.getElementById('mensagem-erro').style.display = 'none';
              
              // Esconder a mensagem após 3 segundos
              setTimeout(() => {
                mensagemSucesso.style.display = 'none';
              }, 3000);
              
              // Atualizar lista de mensagens
              carregarMinhasMensagens();
            })
            .catch(error => {
              console.error('Erro:', error);
              const mensagemErro = document.getElementById('mensagem-erro');
              mensagemErro.textContent = error.message || 'Erro ao enviar mensagem.';
              mensagemErro.style.display = 'block';
              document.getElementById('mensagem-sucesso').style.display = 'none';
            });
          });
      });
    }
    
    // Carregar mensagens do usuário
    function carregarMinhasMensagens() {
      const listaMensagens = document.getElementById('minhas-mensagens');
      if (!listaMensagens) return;
      
      fetch('/api/usuario')
        .then(response => response.json())
        .then(usuario => {
          // Buscar todas as mensagens e filtrar pelo email do usuário atual
          fetch('/api/mensagens')
            .then(response => response.json())
            .then(mensagens => {
              const minhasMensagens = mensagens.filter(msg => msg.email === usuario.email);
              
              if (minhasMensagens.length === 0) {
                listaMensagens.innerHTML = '<p class="carregando">Você ainda não enviou nenhuma mensagem.</p>';
                return;
              }
              
              let html = '';
              minhasMensagens.forEach(msg => {
                const data = new Date(msg.data).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });