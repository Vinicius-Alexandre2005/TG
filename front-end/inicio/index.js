document.addEventListener('DOMContentLoaded', () => {

  const heroBtn = document.querySelector('.hero-btn')

  if (heroBtn) {
    heroBtn.addEventListener('click', e => {
      e.preventDefault()

      window.location.href =
        '/pesquisa/index.html'
    })
  }

  const categorias =
    document.querySelectorAll('.categoria-card')

  categorias.forEach(card => {

    card.addEventListener('click', () => {

      const categoria =
        card.dataset.categoria

      window.location.href =
        `/pesquisa/index.html?busca=${encodeURIComponent(categoria)}`

    })

  })

})