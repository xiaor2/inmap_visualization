export function renderLegend(min, max) {
  const partial = (max - min) / 5
  document.querySelector('#legend1').innerText = Math.round((min + partial)*100) / 100
  document.querySelector('#legend2').innerText = Math.round((min + 2 * partial) * 100) / 100
  document.querySelector('#legend3').innerText = Math.round((min + 3 * partial) * 100) / 100
  document.querySelector('#legend4').innerText = Math.round((min + 4 * partial) * 100) / 100
  document.querySelector('#legend5').innerText = Math.round((min + 5 * partial) * 100) / 100
}

export function hexToRgba(hex){
  var c;
  if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
      c= hex.substring(1).split('');
      if(c.length== 3){
          c= [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c= '0x'+c.join('');
      return [(c>>16)&255, (c>>8)&255, c&255, 200]
  }
  throw new Error('Bad Hex');
}

export function rgbaToHex(r,g,b,a) {
  var outParts = [
    r.toString(16),
    g.toString(16),
    b.toString(16),
    Math.round(a * 255).toString(16).substring(0, 2)
  ];
  // Pad single-digit output values
  outParts.forEach(function (part, i) {
    if (part.length === 1) {
      outParts[i] = '0' + part;
    }
  })

  return ('#' + outParts.join(''));
}