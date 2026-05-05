const userArea = document.getElementById('userArea')
const token = localStorage.getItem('token')

if (!token) {
  userArea.innerHTML = `
    <div class="auth-buttons">
      <a href="/login/login.html">Login</a>
      <a href="/cadastro/index.html">Cadastro</a>
    </div>
  `
} else {
  userArea.innerHTML = `
    <div class="user-menu">
      <img 
        src="https://cdn-icons-png.flaticon.com/512/149/149071.png" 
        class="user-avatar" 
        id="avatar"
      >

      <div class="dropdown" id="dropdown">
        <a href="/perfil/perfil.html">Painel do usuário</a>
        <a href="#" id="logout">Sair</a>
      </div>
    </div>
  `

  const avatar = document.getElementById('avatar')
  const dropdown = document.getElementById('dropdown')

  avatar.addEventListener('click', () => {
    dropdown.style.display =
      dropdown.style.display === 'flex' ? 'none' : 'flex'
  })

  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('token')
    window.location.reload()
  })

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
      dropdown.style.display = 'none'
    }
  })
}