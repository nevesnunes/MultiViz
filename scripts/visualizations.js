var moduleIndex = angular.module('moduleIndex');
var moduleUtils = angular.module('moduleUtils');
var moduleVisualizations = angular.module('moduleVisualizations',
        ['moduleIndex', 'moduleUtils']);

moduleVisualizations.factory('visualizations',
        ['patientData', 'retrievePatientData', 'utils', 'nodes',
        function(patientData, retrievePatientData, utils, nodes) {
    var customDarkGreys = 
            ["#bdbdbd","#969696","#737373","#525252","#252525","#000000"],
        buckets = customDarkGreys.length,
        colors = customDarkGreys;

    var processSelectedList = function(list) {
        return list.filter(function(obj) {
            return obj.selected;
        })
        .map(function(obj) {
            return obj.name;
        });
    };

    var makeLegend = function(svg, colorScale, width, height, xMargin, y) {
        var legendRect = svg.selectAll(".legend-rect")
            .data([0].concat(colorScale.quantiles()), function(d) {
                return d;
            });
        legendRect.enter().append("rect")
            .attr("class", "legend-rect bordered")
            .merge(legendRect)
                .attr("x", function(d, i) {
                    return width * i + xMargin;
                })
                .attr("y", y)
                .attr("width", width)
                .attr("height", height / 2)
                .style("fill", function(d, i) {
                    return colors[i];
                })
                .on("mouseover", function(d) {
                    // select the parent and sort the paths
                    svg.selectAll(".legend-rect").sort(function (a, b) {
                        // a is not the hovered element, send "a" to the back
                        if (a != d) return -1;
                        // a is the hovered element, bring "a" to the front
                        else return 1;                             
                    });
                });
        legendRect.exit().remove();

        var legendText = svg.selectAll(".legend-text")
            .data([0].concat(colorScale.quantiles()), function(d) {
                return d;
            });
        legendText.enter().append("text")
            .attr("class", "legend-text text-label")
            .merge(legendText)
                .text(function(d) {
                    return "≥ " + Math.round(d);
                })
                .attr("x", function(d, i) {
                    return width * i + xMargin;
                })
                .attr("y", y + height);
        legendText.exit().remove();
    };

    return {
        colors: colors,
        processSelectedList: processSelectedList,
        makeLegend: makeLegend
    };
}]);
