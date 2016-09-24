var w = 400,
    h = 400;
var svg = d3.select('body')
  .append('svg')
  .attr('width', w)
  .attr('height', h)
  .style('border', '1px solid #d2d2d2');

var line = d3.svg.line.radial()
  .radius(function(d, i){ return 20 + i * 2; })
  .angle(function(d){ return d * (Math.PI/180) ; });

var data = [ -90, -50, 0, 50, 100, 125, 175, 230, 270, 310, 350, 390];

var path = svg.append('path')
  .datum(data)
  .attr('d', line)
  .attr('stroke', 'green')
  .attr('stroke-width', 10)
  .attr('fill', 'white')
  .attr('transform', 'translate(' + w/2 +','+ h/2 +')');

function changeInterpolation(self){
  line.interpolate("linear");
  path.attr('d', line);
}

changeInterpolation();
