import { outClick } from "./clickEvents.js"
export const validateInput = (pol) => {
  if (!document.getElementById(pol).value) {
    alert(`${pol} is required.`)
    outClick()
    return false
  }
  return true
}