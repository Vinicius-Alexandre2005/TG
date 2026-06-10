const params = new URLSearchParams(window.location.search)

const id = params.get('id')

async function carregarProfissional() {
  try {
    const resposta = await fetch(`/profissionais/${id}`)

    const profissional = await resposta.json()

    document.getElementById('nomeProfissional').textContent =
      profissional.nome_completo

    document.getElementById('telefone').textContent =
      profissional.telefone || 'Não informado'

    document.getElementById('email').textContent =
      profissional.email || 'Não informado'

    document.getElementById('sobre').textContent =
      profissional.sobre || 'Sem descrição'

    document.getElementById('servicos').textContent =
      profissional.servicos || 'Não informado'

    // Exibir média de avaliações
    const linkAvaliacoes = document.getElementById('link-avaliacoes');
    if (profissional.media_avaliacoes) {
      linkAvaliacoes.textContent = parseFloat(profissional.media_avaliacoes).toFixed(1) + ' ⭐';
      linkAvaliacoes.href = `/avaliacoes/index.html?id=${id}`;
    } else {
      linkAvaliacoes.textContent = 'Sem avaliações';
      linkAvaliacoes.href = `/avaliacoes/index.html?id=${id}`;
    }

    // AVATAR DINÂMICO
    const avatar = document.getElementById('avatarProfissional')

    const nomes =
      profissional.nome_completo.split(' ')

    const iniciais =
      nomes[0][0] +
      (nomes[1] ? nomes[1][0] : '')

    avatar.textContent =
      iniciais.toUpperCase()

  } catch (error) {
    console.error(error)
  }
}

carregarProfissional()

// Requisitar serviço
const requisitarBtn = document.getElementById('requisitar-servico')
const token = localStorage.getItem('token')

if (requisitarBtn) {
  requisitarBtn.addEventListener('click', async () => {
    if (!token) {
      alert('Você precisa estar logado para requisitar um serviço')
      window.location.href = '/login/login.html'
      return
    }

    try {
      const resposta = await fetch('/solicitacoes/requisitar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          profissional_id: parseInt(id)
        })
      })

      if (resposta.ok) {
        const resultado = await resposta.json()
        alert('Solicitação enviada com sucesso!')
      } else {
        const erro = await resposta.json()
        alert('Erro ao enviar solicitação: ' + erro.erro)
      }
    } catch (error) {
      console.error('Erro ao requisitar serviço:', error)
      alert('Erro ao enviar solicitação')
    }
  })
}