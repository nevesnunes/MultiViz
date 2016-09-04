var moduleIndex = angular.module('moduleIndex');
var moduleUtils = angular.module('moduleUtils');
var moduleVisualizations = angular.module('moduleVisualizations',
        ['moduleIndex', 'moduleUtils']);

moduleVisualizations.factory('visualizations',
        ['patientData', 'utils', function(patientData, utils) {
    var margin = {
            top: 80,
            right: 0,
            bottom: 150,
            left: 250
        },
        width = 960 - margin.left - margin.right,
        height = 530 - margin.top - margin.bottom,
        gridHeight = Math.floor(width / 24),
        gridWidth = gridHeight * 2,
        legendWidth = gridWidth,
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

    var dataIncidences = [];
    d3.json("data/incidences.json", function(error, data) {
        console.log("[INFO] d3.js parsing results: " + error);
        dataIncidences = data;
    });

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

    var updateCircularTime = function(elementID) {
        // FIXME
    };

    var populateHeatMap = function(data, id) {
        var svg = getVizByID(heatMaps, id);

        var diseaseLabels = svg.selectAll(".diseaseLabel")
            .data(diseases);
        diseaseLabels.enter().append("text")
            .attr("x", 0)
            .attr("y", function(d, i) {
                return i * gridHeight;
            })
            .style("text-anchor", "end")
            .attr("transform", "translate(-6," + gridHeight / 1.5 + ")")
            .attr("class", "diseaseLabel mono axis")
            .merge(diseaseLabels)
                .text(function(d) {
                    return d;
                });
        diseaseLabels.exit().remove();

        var medicationLabels = svg.selectAll(".medicationLabel")
            .data(medications);
        medicationLabels.enter().append("text")
            .style("text-anchor", "middle")
            .attr("transform", function(d, i) {
                return "translate(" + (i * gridWidth) + ", -25)rotate(20)";
            })
            .attr("class", "medicationLabel mono axis")
            .merge(medicationLabels)
                .text(function(d) {
                    return d;
                });
        medicationLabels.exit().remove();

        // json data contains all attributes, which need to be filtered
        // first by user selected attributes
        var filteredData = data.filter(function(d) {
            return (diseases.indexOf(d.disease) !== -1) &&
                (medications.indexOf(d.medication) !== -1);
        }); 
        var colorScale = d3.scaleQuantile()
            .domain([0, buckets - 1, d3.max(filteredData, function(d) {
                return d.incidences;
            })])
            .range(colors);

        var cards = svg.selectAll(".medication")
            .data(filteredData, function(d) {
                return diseases.indexOf(d.disease) + ':' +
                    medications.indexOf(d.medication);
            });
        cards.enter().append("rect")
            .attr("class", "medication bordered")
            .attr("width", gridWidth)
            .attr("height", gridHeight)
            .merge(cards)
                .attr("x", function(d) {
                    return medications.indexOf(d.medication) * gridWidth;
                })
                .attr("y", function(d) {
                    return diseases.indexOf(d.disease) * gridHeight;
                })
                // FIXME: transitions not working...
                // .transition().duration(1000)
                .style("fill", function(d) {
                    return colorScale(d.incidences);
                })
                .append("title").text(function(d) {
                    return "Número de pacientes: " + d.incidences;
                });
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
                return legendWidth * i;
            })
            .attr("y", height)
            .attr("width", legendWidth)
            .attr("height", gridHeight / 2)
            .style("fill", function(d, i) {
                return colors[i];
            });
        legend.append("text")
            .attr("class", "mono")
            .text(function(d) {
                return "≥ " + Math.round(d);
            })
            .attr("x", function(d, i) {
                return legendWidth * i;
            })
            .attr("y", height + gridHeight);
        legend.exit().remove();
    };

    var getVizByID = function(array, id) {
        var index = utils.arrayObjectIndexOf(array, id, "id");
        if (index === -1) {
            console.log("[WARN] @getVizByID: id not found.");
            return null;
        }
        return array[index].viz;
    };
    var removeByID = function(array, id) {
        var index = utils.arrayObjectIndexOf(array, id, "id");
        if (index > -1) {
            console.log("[INFO] @removeByID: removed " + id);
            array.splice(index, 1);
        }
    };

    var heatMaps = [];
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

        // Save svg for later updates
        removeByID(heatMaps, elementID);
        heatMaps.push({
            id: elementID,
            viz: svg
        });

        populateHeatMap(dataIncidences, elementID);
    };

    var updateHeatMap = function(elementID) {
        populateHeatMap(dataIncidences, elementID);
    };

    return {
        updateData: updateData,
        makeCircularTime: makeCircularTime,
        updateCircularTime: updateCircularTime,
        makeHeatMap: makeHeatMap,
        updateHeatMap: updateHeatMap
    };
}]);
