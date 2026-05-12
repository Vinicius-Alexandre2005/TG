fetch('/components/header.html')
  .then(res => res.text())
  .then(async html => {
    document.getElementById('header-container').innerHTML = html

    const token = localStorage.getItem('token')

    const authButtons = document.getElementById('auth-buttons')
    const userMenu = document.getElementById('user-menu')
    const avatar = document.getElementById('avatar')
    const dropdown = document.getElementById('dropdown')
    const logout = document.getElementById('logout')
    const searchInput = document.getElementById('searchInput')

    if (token) {
      authButtons.style.display = 'none'
      userMenu.style.display = 'flex'

      try {
        const resposta = await fetch('/auth/perfil', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const usuario = await resposta.json()

        if (usuario.nome_completo) {
          const iniciais = usuario.nome_completo
            .split(' ')
            .map(nome => nome[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()

          avatar.textContent = iniciais
        }

      } catch (error) {
        console.error('Erro ao carregar usuário:', error)
      }
    }

    avatar.addEventListener('click', () => {
      dropdown.style.display =
        dropdown.style.display === 'flex'
          ? 'none'
          : 'flex'
    })

    logout.addEventListener('click', () => {
      localStorage.removeItem('token')
      window.location.href = '/login/login.html'
    })

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-menu')) {
        dropdown.style.display = 'none'
      }
    })

    // BUSCA DE PROFISSIONAIS
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return

        const termo = searchInput.value.trim()

        if (!termo) return

        window.location.href =
          `/pesquisa/index.html?busca=${encodeURIComponent(termo)}`
      })
    }
  })