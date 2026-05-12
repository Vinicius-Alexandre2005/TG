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