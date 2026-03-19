function converterDataParaBanco(dataBR) {
  if (!dataBR || typeof dataBR !== 'string') return null

  const partes = dataBR.split('/')
  if (partes.length !== 3) return null

  const [dia, mes, ano] = partes
  if (!dia || !mes || !ano) return null

  return `${ano}-${mes}-${dia}`
}

module.exports = {
  converterDataParaBanco
}
