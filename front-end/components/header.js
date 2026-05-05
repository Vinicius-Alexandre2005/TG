fetch('/components/header.html')
  .then(res => res.text())
  .then(html => {
    document.getElementById('header-container').innerHTML = html

    const token = localStorage.getItem('token')

    const authButtons = document.getElementById('auth-buttons')
    const userMenu = document.getElementById('user-menu')
    const avatar = document.getElementById('avatar')
    const dropdown = document.getElementById('dropdown')
    const logout = document.getElementById('logout')

    if (token) {
      authButtons.style.display = 'none'
      userMenu.style.display = 'flex'
    }

    avatar.addEventListener('click', () => {
      dropdown.style.display =
        dropdown.style.display === 'flex' ? 'none' : 'flex'
    })

    logout.addEventListener('click', () => {
      localStorage.removeItem('token')
      window.location.href = '/login/login.html'
    })
  })