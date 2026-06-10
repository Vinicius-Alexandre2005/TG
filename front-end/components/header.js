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

    let notificationsDropdown = null

    if (token) {
      authButtons.style.display = 'none'
      userMenu.style.display = 'flex'

      const notificationsArea =
        document.getElementById('notifications-area')

      notificationsArea.style.display = 'flex'

      const notificationCount =
        document.getElementById('notification-count')

      const notificationsList =
        document.getElementById('notifications-list')

      const notificationBell =
        document.getElementById('notification-bell')

      notificationsDropdown =
        document.getElementById('notifications-dropdown')

      const markAllAsReadButton =
        document.getElementById('mark-all-as-read')

      try {
        const notificacoesResposta = await fetch('/notificacoes', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const notificacoes = await notificacoesResposta.json()

        if (notificacoes.length > 0) {
          notificationCount.textContent = notificacoes.length
          notificationCount.style.display = 'inline-flex'

          notificationsList.innerHTML = ''

          notificacoes.forEach(notificacao => {
            const li = document.createElement('li')

            li.textContent = notificacao.mensagem
            li.style.cursor = 'pointer'

            if (!notificacao.lida) {
              li.classList.add('unread')
            }

            li.addEventListener('click', () => {
              window.location.href =
                '/solicitacoes/index.html'
            })

            notificationsList.appendChild(li)
          })
        } else {
          notificationsList.innerHTML =
            '<li>Nenhuma notificação.</li>'
        }
      } catch (error) {
        console.error(
          'Erro ao carregar notificações:',
          error
        )
      }

      notificationBell.addEventListener('click', e => {
        e.stopPropagation()

        dropdown.style.display = 'none'

        notificationsDropdown.style.display =
          notificationsDropdown.style.display === 'block'
            ? 'none'
            : 'block'
      })

      markAllAsReadButton.addEventListener('click', async () => {
        try {
          const response = await fetch(
            '/notificacoes/marcar-todas-lidas',
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          )

          if (response.ok) {
            window.location.reload()
          }
        } catch (error) {
          console.error(error)
        }
      })

      try {
        const resposta = await fetch('/auth/perfil', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const { usuario } = await resposta.json()

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
        console.error(
          'Erro ao carregar usuário:',
          error
        )
      }
    }

    avatar.addEventListener('click', e => {
      e.stopPropagation()

      if (notificationsDropdown) {
        notificationsDropdown.style.display = 'none'
      }

      dropdown.style.display =
        dropdown.style.display === 'flex'
          ? 'none'
          : 'flex'
    })

    logout.addEventListener('click', () => {
      localStorage.removeItem('token')
      window.location.href = '/login/login.html'
    })

    document.addEventListener('click', e => {
      if (!e.target.closest('.user-menu')) {
        dropdown.style.display = 'none'
      }

      if (
        notificationsDropdown &&
        !e.target.closest('#notifications-area')
      ) {
        notificationsDropdown.style.display = 'none'
      }
    })

    if (searchInput) {
      searchInput.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return

        const termo = searchInput.value.trim()

        if (!termo) return

        window.location.href =
          `/pesquisa/index.html?busca=${encodeURIComponent(termo)}`
      })
    }
  })