const token = localStorage.getItem('token');
let solicitacoes = [];
let filtroAtual = 'todos';
let solicitacaoParaAvaliar = null;
let notaSelecionada = 0;

if (!token) {
  window.location.href = '/login/login.html';
}

// Decodificar o token para saber o tipo de usuário
const payload = JSON.parse(atob(token.split('.')[1]));
const tipoUsuarioLogado = payload.tipo_usuario;

async function carregarSolicitacoes() {
  try {
    const resposta = await fetch('/solicitacoes/minhas-solicitacoes', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!resposta.ok) {
      throw new Error('Erro ao carregar solicitações');
    }

    solicitacoes = await resposta.json();
    exibirSolicitacoes();
  } catch (error) {
    console.error('Erro ao carregar solicitações:', error);
    document.getElementById('solicitacoes-list').innerHTML = 
      '<p class="erro">Erro ao carregar solicitações</p>';
  }
}

function exibirSolicitacoes() {
  const lista = document.getElementById('solicitacoes-list');
  
  let solicitacoesFiltradas = solicitacoes;
  if (filtroAtual !== 'todos') {
    solicitacoesFiltradas = solicitacoes.filter(s => s.status === filtroAtual);
  }

  if (solicitacoesFiltradas.length === 0) {
    lista.innerHTML = '<p class="vazio">Nenhuma solicitação encontrada</p>';
    return;
  }

  lista.innerHTML = solicitacoesFiltradas.map(solicitacao => `
    <div class="solicitacao-card" data-id="${solicitacao.id}">
      <div class="solicitacao-header">
        <h3>${solicitacao.profissional_nome || solicitacao.cliente_nome}</h3>
        <span class="status-badge status-${solicitacao.status.toLowerCase()}">
          ${traduzirStatus(solicitacao.status)}
        </span>
      </div>

      <div class="solicitacao-info">
        <p><strong>Serviço:</strong> ${solicitacao.servico_nome || 'N/A'}</p>
        <p><strong>Data:</strong> ${formatarData(solicitacao.created_at)}</p>
        ${solicitacao.data_aceite ? `<p><strong>Aceito em:</strong> ${formatarData(solicitacao.data_aceite)}</p>` : ''}
        ${solicitacao.data_finalizacao ? `<p><strong>Finalizado em:</strong> ${formatarData(solicitacao.data_finalizacao)}</p>` : ''}
      </div>

      <div class="solicitacao-contato">
        <p><strong>Contato:</strong> ${solicitacao.profissional_telefone || solicitacao.cliente_telefone || 'N/A'}</p>
        <p><strong>Email:</strong> ${solicitacao.profissional_email || solicitacao.cliente_email || 'N/A'}</p>
      </div>

      <div class="solicitacao-acoes">
        ${gerarBotoesAcao(solicitacao)}
      </div>
    </div>
  `).join('');

  adicionarEventosBotoes();
}

function traduzirStatus(status) {
  const traducoes = {
    'PENDENTE': 'Pendente',
    'EM_ANDAMENTO': 'Em Andamento',
    'FINALIZADO': 'Finalizado',
    'RECUSADO': 'Recusado',
    'CANCELADO': 'Cancelado'
  };
  return traducoes[status] || status;
}

function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR');
}

function gerarBotoesAcao(solicitacao) {
  let botoes = '';

  // Botões para o PROFISSIONAL
  if (tipoUsuarioLogado === 'profissional') {
    if (solicitacao.status === 'PENDENTE') {
      botoes += `
        <button class="btn btn-aceitar" data-id="${solicitacao.id}" data-acao="aceitar">Aceitar</button>
        <button class="btn btn-recusar" data-id="${solicitacao.id}" data-acao="recusar">Recusar</button>
      `;
    }
    if (solicitacao.status === 'EM_ANDAMENTO') {
      botoes += `
        <button class="btn btn-finalizar" data-id="${solicitacao.id}" data-acao="finalizar">Finalizar Serviço</button>
      `;
    }
  }

  // Botões para o CLIENTE
  if (tipoUsuarioLogado === 'cliente') {
    if (solicitacao.status === 'FINALIZADO') {
      botoes += `
        <button class="btn btn-avaliar" data-id="${solicitacao.id}" data-acao="avaliar">Avaliar Profissional</button>
      `;
    }
  }

  // Botão de cancelar aparece para ambos se estiver pendente ou em andamento
  if (solicitacao.status === 'PENDENTE' || solicitacao.status === 'EM_ANDAMENTO') {
    botoes += `
      <button class="btn btn-cancelar" data-id="${solicitacao.id}" data-acao="cancelar">Cancelar</button>
    `;
  }

  return botoes;
}

function adicionarEventosBotoes() {
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      const acao = e.target.dataset.acao;

      if (acao === 'aceitar' || acao === 'recusar') {
        await responderSolicitacao(id, acao);
      } else if (acao === 'finalizar') {
        await finalizarSolicitacao(id);
      } else if (acao === 'avaliar') {
        abrirModalAvaliacao(id);
      } else if (acao === 'cancelar') {
        await cancelarSolicitacao(id);
      }
    });
  });
}

// Lógica do Modal de Estrelas
const modal = document.getElementById('modal-avaliacao');
const estrelas = document.querySelectorAll('.estrela');
const btnCancelar = document.getElementById('cancelar-avaliacao');
const btnEnviar = document.getElementById('enviar-avaliacao');

estrelas.forEach(estrela => {
  estrela.addEventListener('mouseover', () => {
    const valor = estrela.dataset.valor;
    destacarEstrelas(valor);
  });

  estrela.addEventListener('click', () => {
    notaSelecionada = parseInt(estrela.dataset.valor);
    destacarEstrelas(notaSelecionada);
  });
});

document.getElementById('estrelas-rating').addEventListener('mouseleave', () => {
  destacarEstrelas(notaSelecionada);
});

function destacarEstrelas(valor) {
  estrelas.forEach(s => {
    if (parseInt(s.dataset.valor) <= valor) {
      s.classList.add('ativo');
      s.textContent = '★';
    } else {
      s.classList.remove('ativo');
      s.textContent = '☆';
    }
  });
}

function abrirModalAvaliacao(id) {
  solicitacaoParaAvaliar = id;
  notaSelecionada = 0;
  destacarEstrelas(0);
  document.getElementById('comentario-avaliacao').value = '';
  modal.style.display = 'flex';
}

btnCancelar.onclick = () => {
  modal.style.display = 'none';
};

btnEnviar.onclick = async () => {
  if (notaSelecionada === 0) {
    alert('Por favor, selecione uma nota clicando nas estrelas.');
    return;
  }
  const comentario = document.getElementById('comentario-avaliacao').value;
  await enviarAvaliacao(solicitacaoParaAvaliar, notaSelecionada, comentario);
  modal.style.display = 'none';
};

async function enviarAvaliacao(id, nota, comentario) {
  try {
    const resposta = await fetch('/solicitacoes/avaliar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        solicitacao_id: parseInt(id),
        nota: nota,
        comentario: comentario
      })
    });

    if (resposta.ok) {
      alert('Avaliação enviada com sucesso!');
      carregarSolicitacoes();
    } else {
      const erro = await resposta.json();
      alert('Erro: ' + erro.erro);
    }
  } catch (error) {
    console.error('Erro ao avaliar:', error);
  }
}

// ... Restante das funções (responderSolicitacao, finalizarSolicitacao, cancelarSolicitacao) permanecem as mesmas
async function responderSolicitacao(id, acao) {
  try {
    const resposta = await fetch('/solicitacoes/responder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        solicitacao_id: parseInt(id),
        acao: acao
      })
    });

    if (resposta.ok) {
      alert(`Solicitação ${acao === 'aceitar' ? 'aceita' : 'recusada'} com sucesso!`);
      carregarSolicitacoes();
    } else {
      const erro = await resposta.json();
      alert('Erro: ' + erro.erro);
    }
  } catch (error) {
    console.error('Erro ao responder:', error);
  }
}

async function finalizarSolicitacao(id) {
  try {
    const resposta = await fetch('/solicitacoes/finalizar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        solicitacao_id: parseInt(id)
      })
    });

    if (resposta.ok) {
      alert('Serviço finalizado com sucesso!');
      carregarSolicitacoes();
    } else {
      const erro = await resposta.json();
      alert('Erro: ' + erro.erro);
    }
  } catch (error) {
    console.error('Erro ao finalizar:', error);
  }
}

async function cancelarSolicitacao(id) {
  if (!confirm('Tem certeza que deseja cancelar esta solicitação?')) return;
  try {
    const resposta = await fetch(`/solicitacoes/${id}/cancelar`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (resposta.ok) {
      alert('Solicitação cancelada!');
      carregarSolicitacoes();
    }
  } catch (error) {
    console.error('Erro ao cancelar:', error);
  }
}

document.querySelectorAll('.filtro-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('ativo'));
    e.target.classList.add('ativo');
    filtroAtual = e.target.dataset.status;
    exibirSolicitacoes();
  });
});

carregarSolicitacoes();