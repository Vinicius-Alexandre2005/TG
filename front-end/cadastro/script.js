const formCadastro = document.getElementById('formCadastro')
const mensagem = document.getElementById('mensagem')

const inputData = document.getElementById('data_nascimento')
const selectTipoUso = document.getElementById('tipo_uso')
const camposProfissional = document.getElementById('camposProfissional')

const inputCpf = document.getElementById('cpf')
const inputServico = document.getElementById('inputServico')
const tagsContainer = document.getElementById('tagsContainer')
const inputServicosHidden = document.getElementById('servicos_prestados')
const inputSobre = document.getElementById('sobre_profissional')

const inputCep = document.getElementById('cep')
const inputRua = document.getElementById('rua')
const inputBairro = document.getElementById('bairro')
const inputCidade = document.getElementById('cidade')
const inputEstado = document.getElementById('estado')

const servicos = []

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function dataValida(data) {
  if (!data) return true

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    return false
  }

  const [dia, mes, ano] = data.split('/').map(Number)
  const dataObj = new Date(ano, mes - 1, dia)

  return (
    dataObj.getFullYear() === ano &&
    dataObj.getMonth() === mes - 1 &&
    dataObj.getDate() === dia
  )
}

function cpfValido(cpf) {
  const cpfLimpo = cpf.replace(/\D/g, '')

  if (cpfLimpo.length !== 11) return false
  if (/^(\d)\1+$/.test(cpfLimpo)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += Number(cpfLimpo[i]) * (10 - i)
  }

  let resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== Number(cpfLimpo[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += Number(cpfLimpo[i]) * (11 - i)
  }

  resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== Number(cpfLimpo[10])) return false

  return true
}

function atualizarInputServicos() {
  inputServicosHidden.value = JSON.stringify(servicos)
}

function renderizarServicos() {
  tagsContainer.innerHTML = ''

  servicos.forEach((servico, index) => {
    const tag = document.createElement('div')
    tag.className = 'tag-servico'

    const texto = document.createElement('span')
    texto.textContent = servico

    const botaoRemover = document.createElement('button')
    botaoRemover.type = 'button'
    botaoRemover.textContent = '×'
    botaoRemover.addEventListener('click', () => {
      servicos.splice(index, 1)
      renderizarServicos()
      atualizarInputServicos()
    })

    tag.appendChild(texto)
    tag.appendChild(botaoRemover)
    tagsContainer.appendChild(tag)
  })
}

function adicionarServico(servico) {
  const valor = servico.trim()

  if (!valor) return
  if (servicos.length >= 10) return
  if (servicos.some(item => item.toLowerCase() === valor.toLowerCase())) return

  servicos.push(valor)
  renderizarServicos()
  atualizarInputServicos()
}

selectTipoUso.addEventListener('change', () => {
  const ehProfissional = selectTipoUso.value === 'divulgar'

  camposProfissional.classList.toggle('oculto', !ehProfissional)

  if (!ehProfissional) {
    inputCpf.value = ''
    inputSobre.value = ''
    servicos.length = 0
    renderizarServicos()
    atualizarInputServicos()
  }
})

inputData.addEventListener('input', (event) => {
  let valor = event.target.value.replace(/\D/g, '')

  if (valor.length > 2) {
    valor = valor.slice(0, 2) + '/' + valor.slice(2)
  }

  if (valor.length > 5) {
    valor = valor.slice(0, 5) + '/' + valor.slice(5, 9)
  }

  event.target.value = valor
})

inputCpf.addEventListener('input', (event) => {
  let valor = event.target.value.replace(/\D/g, '')

  if (valor.length > 3) {
    valor = valor.slice(0, 3) + '.' + valor.slice(3)
  }

  if (valor.length > 7) {
    valor = valor.slice(0, 7) + '.' + valor.slice(7)
  }

  if (valor.length > 11) {
    valor = valor.slice(0, 11) + '-' + valor.slice(11)
  }

  event.target.value = valor.slice(0, 14)
})

inputCep.addEventListener('input', (event) => {
  let valor = event.target.value.replace(/\D/g, '')

  if (valor.length > 5) {
    valor = valor.slice(0, 5) + '-' + valor.slice(5, 8)
  }

  event.target.value = valor.slice(0, 9)
})

inputCep.addEventListener('blur', async () => {
  const cep = inputCep.value.replace(/\D/g, '')

  if (cep.length !== 8) return

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const data = await response.json()

    if (data.erro) {
      mensagem.textContent = 'CEP não encontrado.'
      mensagem.className = 'mensagem erro'
      return
    }

    inputRua.value = data.logradouro || ''
    inputBairro.value = data.bairro || ''
    inputCidade.value = data.localidade || ''
    inputEstado.value = data.uf || ''

    mensagem.textContent = ''
    mensagem.className = 'mensagem'
  } catch (error) {
    console.error(error)
    mensagem.textContent = 'Erro ao buscar o CEP.'
    mensagem.className = 'mensagem erro'
  }
})

inputServico.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    adicionarServico(inputServico.value)
    inputServico.value = ''
  }
})

formCadastro.addEventListener('submit', async (event) => {
  event.preventDefault()

  mensagem.textContent = ''
  mensagem.className = 'mensagem'

  const formData = new FormData(formCadastro)
  const dados = Object.fromEntries(formData.entries())

  const camposObrigatorios = {
    nome_completo: 'Nome completo',
    email: 'Email',
    telefone: 'Telefone',
    senha: 'Senha',
    tipo_uso: 'Como deseja utilizar a plataforma',
    cep: 'CEP',
    rua: 'Rua',
    bairro: 'Bairro',
    cidade: 'Cidade',
    estado: 'Estado',
    numero: 'Número'
  }

  for (const campo in camposObrigatorios) {
    if (!dados[campo] || !dados[campo].trim()) {
      mensagem.textContent = `Preencha o campo: ${camposObrigatorios[campo]}`
      mensagem.classList.add('erro')
      return
    }
  }

  if (!emailValido(dados.email)) {
    mensagem.textContent = 'Digite um email válido.'
    mensagem.classList.add('erro')
    return
  }

  if (!dataValida(dados.data_nascimento)) {
    mensagem.textContent = 'Digite uma data válida no formato DD/MM/AAAA.'
    mensagem.classList.add('erro')
    return
  }

  if (dados.tipo_uso === 'divulgar') {
    if (!dados.cpf || !dados.cpf.trim()) {
      mensagem.textContent = 'Preencha o campo: CPF'
      mensagem.classList.add('erro')
      return
    }

    if (!cpfValido(dados.cpf)) {
      mensagem.textContent = 'Digite um CPF válido.'
      mensagem.classList.add('erro')
      return
    }

    if (servicos.length === 0) {
      mensagem.textContent = 'Adicione pelo menos um serviço prestado.'
      mensagem.classList.add('erro')
      return
    }

    if (!dados.sobre_profissional || !dados.sobre_profissional.trim()) {
      mensagem.textContent = 'Fale um pouco sobre você.'
      mensagem.classList.add('erro')
      return
    }
  }

  dados.tipo_usuario = selectTipoUso.value === 'divulgar' ? 'profissional' : 'cliente'
  dados.sobre = dados.sobre_profissional || ''
  dados.servicos = [...servicos]

  delete dados.tipo_uso
  delete dados.sobre_profissional
  delete dados.servicos_prestados

  try {
    const resposta = await fetch('/usuarios/cadastro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    })

    try {
      await resposta.json()
    } catch {}

    if (resposta.status === 201) {
      mensagem.textContent = 'Usuário cadastrado com sucesso.'
      mensagem.classList.add('sucesso')
      formCadastro.reset()
      camposProfissional.classList.add('oculto')
      servicos.length = 0
      renderizarServicos()
      atualizarInputServicos()
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