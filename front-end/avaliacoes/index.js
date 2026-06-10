const params = new URLSearchParams(window.location.search);
const profissionalId = params.get('id');

async function carregarAvaliacoes() {
  try {
    // Carregar informações do profissional
    const respProfissional = await fetch(`/profissionais/${profissionalId}`);
    const profissional = await respProfissional.json();

    document.getElementById('nomeProfissional').textContent = profissional.nome_completo;

    // Exibir avatar
    const avatar = document.getElementById('avatar');
    const nomes = profissional.nome_completo.split(' ');
    const iniciais = nomes[0][0] + (nomes[1] ? nomes[1][0] : '');
    avatar.textContent = iniciais.toUpperCase();

    // Exibir média de avaliações
    if (profissional.media_avaliacoes) {
      document.getElementById('mediaAvaliacoes').textContent = 
        parseFloat(profissional.media_avaliacoes).toFixed(1) + ' ⭐';
    } else {
      document.getElementById('mediaAvaliacoes').textContent = 'Sem avaliações';
    }

    // Carregar avaliações
    const respAvaliacoes = await fetch(`/avaliacoes/profissional/${profissionalId}`);
    const avaliacoes = await respAvaliacoes.json();

    exibirAvaliacoes(avaliacoes);
  } catch (error) {
    console.error('Erro ao carregar avaliações:', error);
    document.getElementById('avaliacoes-list').innerHTML = 
      '<p class="erro">Erro ao carregar avaliações</p>';
  }
}

function exibirAvaliacoes(avaliacoes) {
  const lista = document.getElementById('avaliacoes-list');

  if (avaliacoes.length === 0) {
    lista.innerHTML = '<p class="vazio">Nenhuma avaliação recebida ainda</p>';
    return;
  }

  lista.innerHTML = avaliacoes.map(avaliacao => `
    <div class="avaliacao-card">
      <div class="avaliacao-header">
        <div class="cliente-info">
          <h3>${avaliacao.cliente_nome}</h3>
          <span class="data">${formatarData(avaliacao.created_at)}</span>
        </div>
        <div class="nota">
          ${gerarEstrelas(avaliacao.nota)}
          <span class="valor-nota">${avaliacao.nota.toFixed(1)}</span>
        </div>
      </div>
      ${avaliacao.comentario ? `
        <div class="comentario">
          <p>${avaliacao.comentario}</p>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function gerarEstrelas(nota) {
  let estrelas = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= nota) {
      estrelas += '⭐';
    } else if (i - nota < 1) {
      estrelas += '✨'; // Meia estrela
    } else {
      estrelas += '☆';
    }
  }
  return estrelas;
}

// Carregar avaliações ao iniciar
carregarAvaliacoes();
