var moduleIndex = angular.module('moduleIndex');
var moduleVisualizations = angular.module('moduleVisualizations',
        ['moduleIndex']);

moduleVisualizations.factory('visualizations',
        ['patientData', function(patientData) {
    var margin = {
            top: 80,
            right: 0,
            bottom: 150,
            left: 250
        },
        width = 960 - margin.left - margin.right,
        height = 530 - margin.top - margin.bottom,
        gridSize = Math.floor(width / 24),
        legendElementWidth = gridSize * 2,
        buckets = 9,
        colors = colorbrewer.Greys[9];

    var diseases = [];
    var medications = [];

    var processSelectedList = function(list) {
        return list.filter(function(obj) {
            return obj.selected;
        })
        .map(function(obj) {
            return obj.name;
        });
    };

    var updateData = function(selectedDiseases, selectedMedications) {
        diseases = processSelectedList(selectedDiseases);
        medications = processSelectedList(selectedMedications);
    };

    var makeCircularTime = function(elementID) {
        if (elementID === undefined) {
            console.log("[WARN] @makeHeatMap: undefined id.");
            return;
        }
        
        d3.select("#" + elementID).append("h4")
            .text("Análise temporal de atributos");

        var chart = circularHeatChart()
	        .range(["white", "black"])
            .numSegments(24)
            .innerRadius(20);

        var data = [];
        for(var i=0; i<24*7; i++) {
            data[i] = Math.random();
        }

        var svg = d3.select("#" + elementID).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        svg.selectAll('svg')
            .data([data])
            .enter()
            .call(chart);
    };

    var makeHeatMap = function(elementID) {
        if (elementID === undefined) {
            console.log("[WARN] @makeHeatMap: undefined id.");
            return;
        }
        
        d3.select("#" + elementID).append("h4")
            .text("Comparação entre múltiplos pacientes");

        var svg = d3.select("#" + elementID).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                  "translate(" + margin.left + "," + margin.top + ")");

        var diseaseLabels = svg.selectAll(".diseaseLabel")
            .data(diseases)
            .enter().append("text")
            .text(function(d) {
                return d;
            })
            .attr("x", 0)
            .attr("y", function(d, i) {
                return i * gridSize;
            })
            .style("text-anchor", "end")
            .attr("transform", "translate(-6," + gridSize / 1.5 + ")")
            .attr("class", "diseaseLabel mono axis");

        var medicationLabels = svg.selectAll(".medicationLabel")
            .data(medications)
            .enter().append("text")
            .text(function(d) {
                return d;
            })
            .style("text-anchor", "middle")
            .attr("transform", function(d, i) {
                return "translate(" + (i * gridSize * 2) + ", -25)rotate(20)";
            })
            .attr("class", "medicationLabel mono axis");

        d3.json("data/incidences.json", function(error, treeData) {
            console.log("[INFO] d3.js parsing results: " + error);
            (function(data) {
                var colorScale = d3.scaleQuantile()
                    .domain([0, buckets - 1, d3.max(data, function(d) {
                        return d.incidences;
                    })])
                    .range(colors);

                // json data contains all attributes, which need to be filtered
                // first by user selected attributes
                var cards = svg.selectAll(".medication")
                    .data(data.filter(function(d) {
                        return (diseases.indexOf(d.disease) !== -1) &&
                            (medications.indexOf(d.medication) !== -1);
                    }), function(d) {
                        return diseases.indexOf(d.disease) + ':' +
                            medications.indexOf(d.medication);
                    });

                cards.enter().append("rect")
                    .attr("x", function(d) {
                        return medications.indexOf(d.medication) * gridSize * 2;
                    })
                    .attr("y", function(d) {
                        return diseases.indexOf(d.disease) * gridSize;
                    })
                    .attr("class", "medication bordered")
                    .attr("width", gridSize * 2)
                    .attr("height", gridSize)
                    .style("fill", function(d) {
                        return colorScale(d.incidences);
                    })
                    .append("title").text(function(d) {
                        return "Número de pacientes: " + d.incidences;
                    });

                // FIXME: transitions not working...
                /*
                    .style("fill", colors[0]);

                cards.transition().duration(1000)
                    .style("fill", function(d) { return colorScale(d.incidences); });
                */

                cards.exit().remove();

                var legend = svg.selectAll(".legend")
                    .data([0].concat(colorScale.quantiles()), function(d) {
                        return d;
                    })
                    .enter().append("g")
                    .attr("class", "legend");

                legend.append("rect")
                    .attr("class", "bordered")
                    .attr("x", function(d, i) {
                        return legendElementWidth * i;
                    })
                    .attr("y", height)
                    .attr("width", legendElementWidth)
                    .attr("height", gridSize / 2)
                    .style("fill", function(d, i) {
                        return colors[i];
                    });

                legend.append("text")
                    .attr("class", "mono")
                    .text(function(d) {
                        return "≥ " + Math.round(d);
                    })
                    .attr("x", function(d, i) {
                        return legendElementWidth * i;
                    })
                    .attr("y", height + gridSize);

                legend.exit().remove();
            }(treeData));
        }); //d3.json
    };

    return {
        updateData: updateData,
        makeCircularTime: makeCircularTime,
        makeHeatMap: makeHeatMap
    };
}]);
