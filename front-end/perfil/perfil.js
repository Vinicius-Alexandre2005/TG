const token = localStorage.getItem('token')

if (!token) {
  window.location.href = '/login'
}

let usuarioAtual = null
let emEdicao = false

// Mapeamento de campos para inputs
const CAMPOS_MAPEAMENTO = {
  nome_completo: 'input_nome',
  telefone: 'input_telefone',
  data_nascimento: 'input_data',
  cep: 'input_cep',
  rua: 'input_rua',
  numero: 'input_numero',
  complemento: 'input_complemento',
  bairro: 'input_bairro',
  cidade: 'input_cidade',
  estado: 'input_estado'
}

// Mapeamento de campos para exibição
const CAMPOS_EXIBICAO = {
  nome_completo: 'nome-display',
  telefone: 'telefone',
  data_nascimento: 'data',
  cep: 'cep',
  rua: 'rua',
  numero: 'numero',
  complemento: 'complemento',
  bairro: 'bairro',
  cidade: 'cidade',
  estado: 'estado'
}

async function carregarPerfil() {
  try {
    const resposta = await fetch('http://localhost:3000/auth/perfil', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (resposta.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return
    }

    if (!resposta.ok) {
      console.error('Erro ao carregar perfil:', resposta.status)
      alert('Erro ao carregar perfil')
      return
    }

    const dados = await resposta.json()
    usuarioAtual = dados.usuario

    preencherPerfil()
  } catch (error) {
    console.error('Erro ao carregar perfil:', error)
    alert('Erro ao carregar perfil')
  }
}

function preencherPerfil() {
  if (!usuarioAtual) return

  // Dados do topo
  document.getElementById('nome').textContent = usuarioAtual.nome_completo || '-'
  document.getElementById('email').textContent = usuarioAtual.email || '-'
  document.getElementById('tipo-usuario').textContent = formatarTipoUsuario(usuarioAtual.tipo_usuario)
  document.getElementById('tipo-usuario-display').textContent = formatarTipoUsuario(usuarioAtual.tipo_usuario)

  // Foto padrão (avatar com iniciais)
  const foto = document.getElementById('foto')
  foto.src = gerarAvatarUrl(usuarioAtual.nome_completo)
  foto.alt = `Avatar de ${usuarioAtual.nome_completo}`

  // Preencher campos de exibição
  for (const [campo, elementId] of Object.entries(CAMPOS_EXIBICAO)) {
    const elemento = document.getElementById(elementId)
    if (elemento) {
      let valor = usuarioAtual[campo]
      
      // Formatação especial para data
      if (campo === 'data_nascimento' && valor) {
        valor = valor || '-'
      }
      
      elemento.textContent = valor || '-'
    }
  }
}

function gerarAvatarUrl(nome) {
  // Usar um serviço de avatar com iniciais
  const iniciais = nome
    ? nome
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(iniciais)}&background=667eea&color=fff&size=120&bold=true`
}

function formatarTipoUsuario(tipo) {
  const tipos = {
    cliente: 'Cliente',
    profissional: 'Profissional'
  }
  return tipos[tipo] || tipo
}

function ativarEdicao() {
  if (emEdicao) return

  emEdicao = true

  // Alternar visibilidade dos botões
  document.getElementById('editar').classList.add('hidden')
  document.getElementById('cancelar').classList.remove('hidden')
  document.getElementById('salvar').classList.remove('hidden')

  // Preencher inputs com valores atuais
  for (const [campo, inputId] of Object.entries(CAMPOS_MAPEAMENTO)) {
    const input = document.getElementById(inputId)
    if (input) {
      let valor = usuarioAtual[campo] || ''

      // Formatação especial para data
      if (campo === 'data_nascimento' && valor) {
        valor = formatarDataInput(valor)
      }

      input.value = valor
    }
  }

  // Alternar visualização de campos
  document.querySelectorAll('.info-box strong').forEach(e => e.classList.add('hidden'))
  document.querySelectorAll('.info-box input').forEach(e => e.classList.remove('hidden'))
}

function cancelarEdicao() {
  if (!emEdicao) return

  emEdicao = false

  // Alternar visibilidade dos botões
  document.getElementById('editar').classList.remove('hidden')
  document.getElementById('cancelar').classList.add('hidden')
  document.getElementById('salvar').classList.add('hidden')

  // Alternar visualização de campos
  document.querySelectorAll('.info-box strong').forEach(e => e.classList.remove('hidden'))
  document.querySelectorAll('.info-box input').forEach(e => e.classList.add('hidden'))
}

function formatarDataInput(data) {
  if (!data) return ''

  // Se vier no formato DD/MM/YYYY → converte pra YYYY-MM-DD
  if (data.includes('/')) {
    const [dia, mes, ano] = data.split('/')
    return `${ano}-${mes}-${dia}`
  }

  return data
}

function formatarDataParaEnvio(data) {
  if (!data) return null

  // Se vier no formato YYYY-MM-DD → converte pra DD/MM/YYYY
  if (data.includes('-')) {
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  return data
}

async function salvar() {
  const dadosAtualizados = {}

  // Coletar apenas campos que foram alterados
  for (const [campo, inputId] of Object.entries(CAMPOS_MAPEAMENTO)) {
    const input = document.getElementById(inputId)
    if (input) {
      let valor = input.value.trim()

      // Formatação especial para data
      if (campo === 'data_nascimento' && valor) {
        valor = formatarDataParaEnvio(valor)
      }

      if (valor) {
        dadosAtualizados[campo] = valor
      }
    }
  }

  // Validação básica
  if (Object.keys(dadosAtualizados).length === 0) {
    alert('Nenhum campo foi alterado')
    return
  }

  try {
    const resposta = await fetch('http://localhost:3000/auth/perfil', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(dadosAtualizados)
    })

    if (resposta.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return
    }

    if (!resposta.ok) {
      const erro = await resposta.json()
      alert(erro.erro || 'Erro ao atualizar perfil')
      return
    }

    // Recarregar perfil após sucesso
    await carregarPerfil()
    cancelarEdicao()
    alert('Perfil atualizado com sucesso!')
  } catch (error) {
    console.error('Erro ao salvar:', error)
    alert('Erro ao salvar perfil')
  }
}

function logout() {
  if (confirm('Tem certeza que deseja sair?')) {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
}

// EVENTOS
document.getElementById('editar').addEventListener('click', ativarEdicao)
document.getElementById('cancelar').addEventListener('click', cancelarEdicao)
document.getElementById('salvar').addEventListener('click', salvar)
document.getElementById('logout').addEventListener('click', logout)

// INICIAR
carregarPerfil()