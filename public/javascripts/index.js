import { slice } from "https://cdn.skypack.dev/zarr";
import pollutant from "../../pollutant.js";
import { renderLegend, hexToRgba } from "../../utils/legend.js";
import { colors } from "../../utils/colors.js";
import { inClick, outClick } from "../../utils/clickEvents.js";
import { validateInput } from "../../utils/validate.js";
import { getZarr } from "../../utils/getZarr.js";

async function main() {
  let pyodide = await loadPyodide();
  // Pyodide is now ready to use...
  await pyodide.loadPackage("geopandas");
  await pyodide.runPythonAsync(`
    from io import BytesIO, TextIOWrapper
    from zipfile import ZipFile
    import urllib.request
    import csv
    from shapely.geometry import Point
    import geopandas as gpd
    from pyodide.http import pyfetch
    url = await pyfetch("https://gaftp.epa.gov/air/emismod/2016/alpha/2016fd/emissions/2016fd_inputs_point.zip")
    await url.unpack_archive()
    VOC, NOx, NH3, SOx, PM2_5 = [], [], [], [], []
    height, diam, temp, velocity = [], [], [],  []
    coords = []

    def add_record(row):
        """ Process one row of the emissions file """
        pol = row[12] # The pollutant is in the 13th column of the CSV file
                      # (In Python, the first column is called column 0.)
        emis = row[13] # We are only extracting annual total emissions here. 
                      # If monthly emissions are reported, we'll miss them.
                      # Emissions are short tons/year.
        if emis == '': return
        if pol in ['VOC', 'VOC_INV', 'XYL', 'TOL', 'TERP', 'PAR', 'OLE', 'NVOL', 'MEOH', 
                  'ISOP', 'IOLE', 'FORM', 'ETOH', 'ETHA', 'ETH', 'ALD2', 'ALDX', 'CB05_ALD2', 
                  'CB05_ALDX', 'CB05_BENZENE', 'CB05_ETH', 'CB05_ETHA', 'CB05_ETOH', 
                  'CB05_FORM', 'CB05_IOLE', 'CB05_ISOP', 'CB05_MEOH', 'CB05_OLE', 'CB05_PAR', 
                  'CB05_TERP', 'CB05_TOL', 'CB05_XYL', 'ETHANOL', 'NHTOG', 'NMOG', 'VOC_INV']:
            VOC.append(float(emis))
            NOx.append(0)
            NH3.append(0)
            SOx.append(0)
            PM2_5.append(0)
        elif pol in ['PM25-PRI', 'PM2_5', 'DIESEL-PM25', 'PAL', 'PCA', 'PCL', 'PEC', 'PFE', 'PK', 
                    'PMG', 'PMN', 'PMOTHR', 'PNH4', 'PNO3', 'POC', 'PSI', 'PSO4', 'PTI']:
            VOC.append(0)
            NOx.append(0)
            NH3.append(0)
            SOx.append(0)
            PM2_5.append(float(emis))
        elif pol in ['NOX', 'HONO', 'NO', 'NO2']:
            VOC.append(0)
            NOx.append(float(emis))
            NH3.append(0)
            SOx.append(0)
            PM2_5.append(0)
        elif pol == 'NH3':
            VOC.append(0)
            NOx.append(0)
            NH3.append(float(emis))
            SOx.append(0)
            PM2_5.append(0)
        elif pol == 'SO2':
            VOC.append(0)
            NOx.append(0)
            NH3.append(0)
            SOx.append(float(emis))
            PM2_5.append(0)
        else: return
        
        h = row[17]
        height.append(float(h) * 0.3048) if h != '' else height.append(0)
        
        d = row[18]
        diam.append(float(d) * 0.3048) if d != '' else diam.append(0)

        t = row[19]
        temp.append((float(t) - 32) * 5.0/9.0 + 273.15) if t != '' else temp.append(0)
            
        v = row[21]
        velocity.append(float(v) * 0.3048) if v != '' else velocity.append(0)
        
        coords.append(Point(float(row[23]), float(row[24])))

    with ZipFile(BytesIO(url.read())) as zf:
        for contained_file in zf.namelist():
            if "egu" in contained_file: # Only process files with electricity generating unit (EGU) emissions.
                for row in csv.reader(TextIOWrapper(zf.open(contained_file, 'r'), newline='')):
                    if (len(row) == 0) or (len(row[0]) == 0) or (row[0][0] == '#'): continue
                    add_record(row)

    emis = gpd.GeoDataFrame({
        "VOC": VOC, "NOx": NOx, "NH3": NH3, "SOx": SOx, "PM2_5": PM2_5,
        "height": height, "diam": diam, "temp": temp, "velocity": velocity,
    }, geometry=coords, crs={'init': 'epsg:4269'})
  `);

  console.log(pyodide.globals.get("emis").toJs());
}
main();

let SOA = 0;
let pNO3 = 0;
let pNH4 = 0;
let pSO4 = 0;
let PM25 = 0;
let location = -1;
let GLOBAL_ID = 0;
let marker = 0;
let max = 1;
let min = 0;

const map = new mapboxgl.Map({
  container: "map",
  accessToken:
    "pk.eyJ1Ijoic2hhd25yYW4xODIiLCJhIjoiY2w5NXRvMDRjMmhhYzN3dDUyOGo0ZmdpeCJ9.RuSR6FInH2tUyctzdnilrw",
  style: "mapbox://styles/mapbox/dark-v10",
  center: [-95.41, 30.0],
  zoom: 2.5,
  bearing: 0,
});

let PM25Map = new Map();
for (let p of pollutant.features) {
  PM25Map.set(p.id, 0);
}

const onClick = (info) => {
  document.getElementById("location").value = info.index;
  if (!marker) {
    marker = new mapboxgl.Marker({
      color: "#eb343a",
    })
      .setLngLat(info.coordinate)
      .addTo(map);
  } else {
    marker.remove();
    marker = new mapboxgl.Marker({
      color: "#eb343a",
    })
      .setLngLat(info.coordinate)
      .addTo(map);
  }
};

const pollutantOptions = {
  data: pollutant,
  pickable: true,
  stroked: true,
  filled: true,
  extruded: true,
  lineWidthUnits: "pixels",
  getFillColor: (data) =>
    hexToRgba(
      colors[Math.round((255 * (PM25Map.get(data.id) - min)) / (max - min))],
      Math.round((255 * (PM25Map.get(data.id) - min)) / (max - min))
    ),
  getLineColor: [255, 0, 0, 20],
  getPointRadius: 100,
  getLineWidth: 0,
  onClick,
  updateTriggers: {
    getFillColor: PM25Map,
  },
};

const deckOverlay = new deck.MapboxOverlay({
  layers: [
    new deck.GeoJsonLayer({
      id: "pollutant",
      ...pollutantOptions,
    }),
  ],
  getTooltip: ({ object }) =>
    object && {
      html: `<div>TotalPM25: ${
        Math.round(object.properties.TotalPM25 * 100) / 100
      } μg/m³</div>`,
      style: {
        backgroundColor: "#f00",
        fontSize: "1.5em",
        color: "white",
        padding: "5px",
      },
    },
});

map.addControl(deckOverlay);
map.addControl(new mapboxgl.NavigationControl());

function handleUpdate(myDeck, layer_id) {
  myDeck.setProps({
    layers: [
      new deck.GeoJsonLayer({
        id: layer_id,
        ...pollutantOptions,
      }),
    ],
  });
  console.log(PM25Map);
}

document.getElementById("deploy").onclick = async () => {
  inClick();
  // validate the input
  if (
    !validateInput("SOA") ||
    !validateInput("pNO3") ||
    !validateInput("pNH4") ||
    !validateInput("pSO4") ||
    !validateInput("PM25") ||
    !validateInput("location")
  ) {
    return;
  }

  // initialization
  if (location !== document.getElementById("location").value) {
    location = document.getElementById("location").value;
    SOA = 0;
    pNO3 = 0;
    pNH4 = 0;
    pSO4 = 0;
    PM25 = 0;
  }

  // unit
  let unit = 1;
  switch (document.getElementById("inputGroupSelect01").value) {
    case "tons/year":
      unit = 28766.639;
      break;
    case "kilograms/year":
      unit = 31.7098;
      break;
    case "micrograms/sec":
      unit = 1;
      break;
    default:
      alert("Unit is required.");
      outClick();
      return;
  }

  const id = parseInt(document.getElementById("location").value);

  const SOA_ = await getZarr("SOA");
  const pNH4_ = await getZarr("pNH4");
  const pNO3_ = await getZarr("pNO3");
  const pSO4_ = await getZarr("pSO4");
  const PM25_ = await getZarr("PrimaryPM25");

  if (!SOA) {
    SOA = await SOA_.get([0, id, slice(null, 52411)]).then(
      async (data) => await data.data
    );
    pNO3 = await pNO3_
      .get([0, id, slice(null, 52411)])
      .then(async (data) => await data.data);
    pNH4 = await pNH4_
      .get([0, id, slice(null, 52411)])
      .then(async (data) => await data.data);
    pSO4 = await pSO4_
      .get([0, id, slice(null, 52411)])
      .then(async (data) => await data.data);
    PM25 = await PM25_.get([0, id, slice(null, 52411)]).then(
      async (data) => await data.data
    );
  }

  for (let i = 0; i < SOA.length; i++) {
    let currentPM25 =
      unit *
      (SOA[i] * document.getElementById("SOA").value +
        pNO3[i] * document.getElementById("pNO3").value +
        pNH4[i] * document.getElementById("pNH4").value +
        pSO4[i] * document.getElementById("pSO4").value +
        PM25[i] * document.getElementById("PM25").value);
    pollutant.features[i].properties.TotalPM25 += currentPM25;
    PM25Map.set(i.toString(), PM25Map.get(i.toString()) + currentPM25);
  }

  GLOBAL_ID += 1;
  handleUpdate(deckOverlay, GLOBAL_ID);
  max = Math.max(...PM25Map.values());
  min = Math.min(...PM25Map.values());
  renderLegend(min, max);
  outClick();
};
