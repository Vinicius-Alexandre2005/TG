const form = document.getElementById('formLogin')
const mensagem = document.getElementById('mensagem')

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  mensagem.textContent = ''
  mensagem.className = 'mensagem'

  const formData = new FormData(form)
  const dados = Object.fromEntries(formData.entries())

  try {
    const resposta = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    })

    const resultado = await resposta.json()

    if (resposta.status === 200) {
      localStorage.setItem('token', resultado.token)

      window.location.href = '/inicio/index.html'
    } else {
      mensagem.textContent = resultado.mensagem || 'Erro no login'
      mensagem.classList.add('erro')
    }

  } catch (error) {
    console.error(error)
    mensagem.textContent = 'Erro na comunicação com o servidor'
    mensagem.classList.add('erro')
  }
})
