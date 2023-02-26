export const inClick = () => {
  document.querySelector('#waiting').style.display = 'flex'
  document.querySelector('#deploy').disabled = true
}

export const outClick = () => {
  document.querySelector('#waiting').style.display = "none"
  document.querySelector('#deploy').disabled = false
}

