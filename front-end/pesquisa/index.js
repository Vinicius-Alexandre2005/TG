const params = new URLSearchParams(window.location.search)

const termo = params.get('busca')

const container = document.getElementById('resultado-profissionais')

async function carregarProfissionais() {
  try {
    const resposta = await fetch(
      `/profissionais?busca=${encodeURIComponent(termo)}`
    )

    const profissionais = await resposta.json()

    if (profissionais.length === 0) {
      container.innerHTML = `
        <p class="nenhum-profissional">
          Nenhum profissional encontrado
        </p>
      `
      return
    }

    profissionais.forEach(profissional => {
    const card = document.createElement('div')

    card.classList.add('profissional-card')

    card.innerHTML = `
        <h3>${profissional.nome_completo}</h3>

        <p class="profissao">
        <strong>Serviços:</strong>
        ${profissional.servicos || 'Não informado'}
        </p>

        <p class="descricao">
        ${profissional.sobre || 'Sem descrição'}
        </p>

        <p class="telefone">
        <strong>Contato:</strong>
        ${profissional.telefone || 'Não informado'}
        </p>
    `

    card.addEventListener('click', () => {
        window.location.href =
        `/profissional/index.html?id=${profissional.id}`
    })

    container.appendChild(card)
    })

  } catch (error) {
    console.error(error)
  }
}

carregarProfissionais()