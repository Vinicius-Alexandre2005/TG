const formCadastro = document.getElementById('formCadastro')
const mensagem = document.getElementById('mensagem')

formCadastro.addEventListener('submit', async (event) => {
  event.preventDefault()

  mensagem.textContent = ''
  mensagem.className = 'mensagem'

  const formData = new FormData(formCadastro)
  const dados = Object.fromEntries(formData.entries())

  //VALIDAÇÃO DOS CAMPOS OBRIGATÓRIOS
  const camposObrigatorios = {
    nome_completo: 'Nome completo',
    email: 'Email',
    telefone: 'Telefone',
    senha: 'Senha',
    cep: 'CEP',
    rua: 'Rua',
    bairro: 'Bairro',
    numero: 'Número'
  }

  for (let campo in camposObrigatorios) {
    if (!dados[campo]) {
      mensagem.textContent = `Preencha o campo: ${camposObrigatorios[campo]}`
      mensagem.classList.add('erro')
      return
    }
  }

  try {
    const resposta = await fetch('http://localhost:3000/usuarios/cadastro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    })

    let resultado = {}

    try {
      resultado = await resposta.json()
    } catch {
      resultado = {}
    }

    if (resposta.status === 201) {
      mensagem.textContent = 'Usuário cadastrado com sucesso.'
      mensagem.classList.add('sucesso')
      formCadastro.reset()

    } else if (resposta.status === 400) {
      mensagem.textContent = 'Este e-mail já está cadastrado.'
      mensagem.classList.add('erro')

    } else {
      mensagem.textContent = 'Erro ao cadastrar usuário.'
      mensagem.classList.add('erro')
    }

  } catch (error) {
    console.error(error)
    mensagem.textContent = 'Erro na comunicação com o servidor.'
    mensagem.classList.add('erro')
  }
})