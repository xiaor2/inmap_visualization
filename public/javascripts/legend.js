import { colors } from "../../utils/colors.js";
window.onload = function () {
	const scale = []
	for (let i = 0; i < 256; i++) {
		scale.push(i)
	}
	var colorScale = d3.scaleLinear()
		.domain(scale)
		.range(colors);

	// append a defs (for definition) element to your SVG
	var svgLegend = d3.select('#legend').append('svg')
		.attr("width", 600).attr("class", "axis");
	var defs = svgLegend.append('defs');

	// append a linearGradient element to the defs and give it a unique id
	var linearGradient = defs.append('linearGradient')
		.attr('id', 'linear-gradient');

	// horizontal gradient
	linearGradient
		.attr("x1", "0%")
		.attr("y1", "0%")
		.attr("x2", "100%")
		.attr("y2", "0%");

	// append multiple color stops by using D3's data/enter step
	linearGradient.selectAll("stop")
		.data(colorScale.domain())
		.enter().append("stop")
		.attr("offset", function (d) {
			return d * 100 / 255 + "%";
		})
		.attr("stop-color", function (d) {
			return colorScale(d);
		});

	// draw the rectangle and fill with gradient
	svgLegend.append("rect")
		.attr("x", 0)
		.attr("y", 10)
		.attr("width", 420)
		.attr("height", 15)
		.style("fill", "url(#linear-gradient)");
}