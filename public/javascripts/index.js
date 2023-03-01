import { slice } from "https://cdn.skypack.dev/zarr";
import pollutant from '../../pollutant.js';
import { renderLegend, hexToRgba } from '../../utils/legend.js';
import { colors } from '../../utils/colors.js';
import { inClick, outClick } from "../../utils/clickEvents.js";
import { validateInput } from "../../utils/validate.js"
import { getZarr } from "../../utils/getZarr.js";

let SOA = 0
let pNO3 = 0
let pNH4 = 0
let pSO4 = 0
let PM25 = 0
let location = -1
let GLOBAL_ID = 0
let marker = 0
let max = 1
let min = 0

const map = new mapboxgl.Map({
  container: 'map',
  accessToken: 'pk.eyJ1Ijoic2hhd25yYW4xODIiLCJhIjoiY2w5NXRvMDRjMmhhYzN3dDUyOGo0ZmdpeCJ9.RuSR6FInH2tUyctzdnilrw',
  style: 'mapbox://styles/mapbox/dark-v10',
  center: [-95.41, 30.00],
  zoom: 2.5,
  bearing: 0,
});

let PM25Map = new Map();
for (let p of pollutant.features) {
  PM25Map.set(p.id, 0);
}

const onClick = (info) => {
  document.getElementById("location").value = info.index
  if (!marker) {
    marker = new mapboxgl.Marker({
      color: "#eb343a"
    })
      .setLngLat(info.coordinate)
      .addTo(map);
  } else{
    marker.remove()
    marker = new mapboxgl.Marker({
      color: "#eb343a"
    })
      .setLngLat(info.coordinate)
      .addTo(map);
  }
}

const pollutantOptions = {
  data: pollutant,
  pickable: true,
  stroked: true,
  filled: true,
  extruded: true,
  lineWidthUnits: 'pixels',
  getFillColor: (data) => hexToRgba(colors[Math.round(255 * (PM25Map.get(data.id) - min) / (max - min))], Math.round(255 * (PM25Map.get(data.id) - min) / (max - min))),
  getLineColor: [255, 0, 0, 20],
  getPointRadius: 100,
  getLineWidth: 0,
  onClick,
  updateTriggers: {
    getFillColor: PM25Map
  },
}

const deckOverlay = new deck.MapboxOverlay({
  layers: [
    new deck.GeoJsonLayer({
      id: "pollutant",
      ...pollutantOptions
    })
  ],
  getTooltip: ({object}) => object && {
    html: `<div>TotalPM25: ${Math.round(object.properties.TotalPM25 * 100)/100} μg/m³</div>`,
    style: {
      backgroundColor: '#f00',
      fontSize: '1.5em',
      color: 'white',
      padding: '5px'
    }
  }
});

map.addControl(deckOverlay);
map.addControl(new mapboxgl.NavigationControl());

function handleUpdate(myDeck, layer_id) {
  myDeck.setProps({layers: [
    new deck.GeoJsonLayer({
      id: layer_id,
      ...pollutantOptions
      }),
  ]})
  console.log(PM25Map)
}

document.getElementById("deploy").onclick =  async () => {
  inClick()
  // validate the input
  if (!validateInput("SOA") || !validateInput("pNO3") 
  || !validateInput("pNH4") || !validateInput("pSO4") 
  || !validateInput("PM25") || !validateInput("location")) {
    return
  }

  // initialization
  if (location !== document.getElementById("location").value) {
    location = document.getElementById("location").value
    SOA = 0
    pNO3 = 0
    pNH4 = 0
    pSO4 = 0
    PM25 = 0
  }

  // unit
  let unit = 1
  switch(document.getElementById("inputGroupSelect01").value) {
    case "tons/year":
      unit = 28766.639
      break;
    case "kilograms/year":
      unit = 31.7098
      break;
    case "micrograms/sec":
      unit = 1
      break;
    default:
      alert("Unit is required.")
      outClick()
      return
  }

  const id = parseInt(document.getElementById("location").value)

  const SOA_ = await getZarr("SOA")
  const pNH4_ = await getZarr("pNH4")
  const pNO3_ = await getZarr("pNO3")
  const pSO4_ = await getZarr("pSO4")
  const PM25_ = await getZarr("PrimaryPM25")

  if (!SOA) {
    SOA = await SOA_.get([0, id, slice(null, 52411)]).then(async data => await data.data)
    pNO3 = await pNO3_.get([0, id, slice(null, 52411)]).then(async data => await data.data)
    pNH4 = await pNH4_.get([0, id, slice(null, 52411)]).then(async data => await data.data)
    pSO4 = await pSO4_.get([0, id, slice(null, 52411)]).then(async data => await data.data)
    PM25 = await PM25_.get([0, id, slice(null, 52411)]).then(async data => await data.data)
  }

  for (let i = 0; i < SOA.length; i++) {
    let currentPM25 = unit * (SOA[i] * document.getElementById("SOA").value
      + pNO3[i] * document.getElementById("pNO3").value
      + pNH4[i] * document.getElementById("pNH4").value
      + pSO4[i] * document.getElementById("pSO4").value
      + PM25[i] * document.getElementById("PM25").value)
    pollutant.features[i].properties.TotalPM25 += currentPM25
    PM25Map.set(i.toString(), PM25Map.get(i.toString()) + currentPM25)
  }

  GLOBAL_ID += 1
  handleUpdate(deckOverlay, GLOBAL_ID)
  max = Math.max(...PM25Map.values())
  min = Math.min(...PM25Map.values())
  renderLegend(min, max)
  outClick()
}
