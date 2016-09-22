var moduleIndex = angular.module('moduleIndex');
var moduleUtils = angular.module('moduleUtils');
var moduleVisualizations = angular.module('moduleVisualizations',
        ['moduleIndex', 'moduleUtils']);

moduleVisualizations.directive('directiveHeatMapTooltip',
        function() {
    return {
        link: function (scope, element, attrs) {
            scope.setTooltipText = function(button) {
                var text = "<div style=\"text-align: left\" class=\"p\">" +
                        "Encontre relações entre atributos " +
                        "partilhados por múltiplos pacientes." +
                    "</div>" +
                    "</br>" +
                    "<div style=\"text-align: left\" class=\"p\">" +
                        "Os atributos presentes no paciente actual " +
                        "são assinalados (" +
                        "<div style=\"display: inline-block\" class=\"" +
                            "markPatientAttribute markPresent markSquare\" />" +
                        ")." +
                    "</div>";
                scope.tooltipText = text;
            };
        }
    };
});

moduleVisualizations.directive('directiveSpiralTooltip',
        function() {
    return {
        link: function (scope, element, attrs) {
            scope.setTooltipText = function(button) {
                scope.tooltipText = "info spiral";
            };
        }
    };
});

moduleVisualizations.factory('visualizations',
        ['patientData', 'utils', 'nodes', function(patientData, utils, nodes) {
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
        buckets = 6,
        customDarkGreys = ["#bdbdbd","#969696","#737373","#525252","#252525","#000000"],
        colors = customDarkGreys;

    var dataIncidences = [];
    d3.json("data/incidences.json", function(error, data) {
        console.log("[INFO] d3.js parsing results: " + error);
        dataIncidences = data;
    });

    var processSelectedList = function(list) {
        return list.filter(function(obj) {
            return obj.selected;
        })
        .map(function(obj) {
            return obj.name;
        });
    };

    // Selected attribute lists shared among multiple patients
    var diseases = [];
    var medications = [];
    var updateData = function(selectedDiseases, selectedMedications) {
        diseases = processSelectedList(selectedDiseases);
        medications = processSelectedList(selectedMedications);
    };

    // Patient attribute lists
    var patient = patientData.getAttribute(patientData.KEY_PATIENT);
    var patientDiseases = patient.diseases;
    var patientMedications = patient.medications;

    // Unique identifier for heatmap elements
    var heatmapID = 0;
    var makeHeatMapID = function() {
        heatmapID++;
        return "heatmap-" + heatmapID;
    };

    // Unique identifier for spiral elements
    var spiralID = 0;
    var makeSpiralID = function() {
        spiralID++;
        return "spiral-" + spiralID;
    };

    var makeDescriptionSpiral = function(elementID) {
        if (elementID === undefined) {
            console.log("[WARN] @makeHeatMap: undefined id.");
            return;
        }
        
        return '<p class="viz-title">' +
                'Análise temporal de atributos' +
                '  ' +
                '<span class="tooltip-wrapper" ' +
                    'title="{{tooltipText}}" ' + 
                    'directive-tooltip directive-spiral-tooltip>' +
                    '<img src="images/controls/info.svg">' +
                '</span>' +
                '</p>';
    };

    var populateSpiral = function(data, svg) {
        var countSegments = 24;
        var heightSegment = 20;
        var innerRadius = 20;
        var rings = 7;
        var margin = 20;
        var chart = circularHeatChart()
	        .range(["#bdbdbd", "black"])
            .numSegments(countSegments)
            .segmentHeight(heightSegment)
            .innerRadius(innerRadius)
            .margin({
                top: margin,
                right: margin,
                bottom: margin,
                left: margin
            });

        var cells = svg.selectAll('svg')
            .data([data]);
        cells.enter()
            .call(chart);
    };

    var makeSpiral = function(elementID, spiralID, isChecked) {
        if (elementID === undefined) {
            console.log("[WARN] @makeHeatMap: undefined id.");
            return;
        }

        var countSegments = 24;
        var heightSegment = 20;
        var innerRadius = 20;
        var rings = 7;
        var margin = 20;
        var chart = circularHeatChart()
	        .range(["#bdbdbd", "black"])
            .numSegments(countSegments)
            .segmentHeight(heightSegment)
            .innerRadius(innerRadius)
            .margin({
                top: margin,
                right: margin,
                bottom: margin,
                left: margin
            });

        var data = [];
        for(var i=0; i<countSegments*rings; i++) {
            data[i] = Math.random();
        }

        var svg = d3.select("#" + spiralID)
            .append("svg")
            .attr("width", 2 * rings * heightSegment +
                2 * innerRadius +
                2 * margin)
            .attr("height", 2 * rings * heightSegment +
                2 * innerRadius +
                2 * margin);

        // Save svg for d3 updates
        nodes.updateViz({
            nodeID: elementID,
            vizID: spiralID,
            isChecked: isChecked,
            html: svg
        });

        populateSpiral(data, svg);
    };

    var updateSpiral = function(elementID) {
        var data = [];
        for(var i=0; i<countSegments*rings; i++) {
            data[i] = Math.random();
        }

        var spirals = nodes.getVizs(elementID);
        for (var j = 0; j < spirals.length; j++) {
            populateSpiral(data, spirals[j].html);
        }
    };

    var populateHeatMap = function(data, svg) {
        // json data contains all attributes, which need to be filtered
        // first by user selected attributes
        var filteredData = data.filter(function(d) {
            return (diseases.indexOf(d.disease) !== -1) &&
                (medications.indexOf(d.medication) !== -1);
        }); 

        // We now remove attributes from the lists that don't have
        // matches in filteredData (i.e. no cells for that attribute
        // have values)
        diseases = (function(list, filteredMatrix) {
            return list.filter(function(name) {
                var index = utils.arrayObjectIndexOf(
                    filteredMatrix, name, "disease");
                return index !== -1;
            });
        })(diseases, filteredData);
        medications = (function(list, filteredMatrix) {
            return list.filter(function(name) {
                var index = utils.arrayObjectIndexOf(
                    filteredMatrix, name, "medication");
                return index !== -1;
            });
        })(medications, filteredData);

        var diseaseLabels = svg.selectAll(".disease-label")
            .data(diseases);
        diseaseLabels.enter().append("text")
            .attr("x", 0)
            .attr("y", function(d, i) {
                return (1 + i) * gridHeight;
            })
            .style("text-anchor", "end")
            .attr("transform", "translate(-6," + gridHeight / 1.5 + ")")
            .attr("class", "disease-label viz-label axis")
            .merge(diseaseLabels)
                .text(function(d) {
                    return d;
                });
        diseaseLabels.exit().remove();

        var medicationLabels = svg.selectAll(".medication-label")
            .data(medications);
        medicationLabels.enter().append("text")
            .style("text-anchor", "middle")
            .attr("transform", function(d, i) {
                return "translate(" + ((1 + i) * gridWidth) + ", -25)rotate(20)";
            })
            .attr("class", "medication-label viz-label axis")
            .merge(medicationLabels)
                .text(function(d) {
                    return d;
                });
        medicationLabels.exit().remove();

        var colorScale = d3.scaleQuantile()
            .domain([0, buckets - 1, d3.max(filteredData, function(d) {
                return d.incidences;
            })])
            .range(colors);

        var cellsTip = d3.tip()
            .attr('class', 'tooltip tooltip-element tooltip-d3')
            .offset([-10, 0])
            .direction('n')
            .html(function(d) {
                return "Número de pacientes: " + d.incidences;
            });
        svg.call(cellsTip);
        var cells = svg.selectAll(".attribute-pair")
            .data(filteredData);
        cells.enter().append("rect")
            .attr("class", "attribute-pair bordered")
            .attr("width", gridWidth)
            .attr("height", gridHeight)
            .merge(cells)
                .attr("x", function(d) {
                    return (1 + medications.indexOf(d.medication)) * gridWidth;
                })
                .attr("y", function(d) {
                    return (1 + diseases.indexOf(d.disease)) * gridHeight;
                })
                .style("fill", function(d) {
                    return colorScale(d.incidences);
                })
                .on("mouseover", function(d) {
                    cellsTip.show(d);

                    // Style column labels
                    svg.selectAll(".medication-label")
                        .attr("class", function(a) {
                            return (a == d.medication) ? 
                                "medication-label axis viz-label-selected" :
                                "medication-label viz-label axis ";
                        });

                    // Style line labels
                    svg.selectAll(".disease-label")
                        .attr("class", function(a) {
                            return (a == d.disease) ? 
                                "disease-label axis viz-label-selected" :
                                "disease-label viz-label axis ";
                        });

                    // Sort paths for correct hover styling
                    svg.selectAll(".attribute-pair")
                        .sort(function (a, b) {
                            // a is not the hovered element, send "a" to the back
                            if (a != d) return -1;
                            // a is the hovered element, bring "a" to the front
                            else return 1;                             
                        });
                })
                .on("mouseout", function(d) {
                    cellsTip.hide(d);
                    
                    // Style column labels
                    svg.selectAll(".medication-label")
                        .attr("class", "medication-label viz-label axis");

                    // Style line labels
                    svg.selectAll(".disease-label")
                        .attr("class", "disease-label viz-label axis");
                });
        cells.exit().remove();

        var filteredPatientMedicationsData = data
            .filter(function(d) {
                return (patientMedications.indexOf(d.medication) !== -1) &&
                    (medications.indexOf(d.medication) !== -1);
            }); 
        var patientMedicationsCells = svg.selectAll(".patientMedications")
            .data(filteredPatientMedicationsData, function(d) {
                return medications.indexOf(d.medication);
            });
        patientMedicationsCells.enter().append("rect")
            .attr("class", "attribute-mark bordered")
            .attr("width", gridWidth)
            .attr("height", gridHeight)
            .merge(cells)
                .attr("x", function(d) {
                    return (1 + medications.indexOf(d.medication)) * gridWidth;
                })
                .attr("y", function(d) {
                    return 0;
                })
                .style("fill", function(d) {
                    return "#ff0000";
                })
                .on("mouseover", function(d) {
                    // select the parent and sort the paths
                    svg.selectAll(".attribute-mark").sort(function (a, b) {
                        // a is not the hovered element, send "a" to the back
                        if (a != d) return -1;
                        // a is the hovered element, bring "a" to the front
                        else return 1;                             
                    });
                });
        patientMedicationsCells.exit().remove();

        var filteredPatientDiseasesData = data
            .filter(function(d) {
                return (patientDiseases.indexOf(d.disease) !== -1) &&
                    (diseases.indexOf(d.disease) !== -1);
            }); 
        var patientDiseasesCells = svg.selectAll(".patientDiseases")
            .data(filteredPatientDiseasesData, function(d) {
                return diseases.indexOf(d.disease);
            });
        patientDiseasesCells.enter().append("rect")
            .attr("class", "attribute-mark bordered")
            .attr("width", gridWidth)
            .attr("height", gridHeight)
            .merge(cells)
                .attr("x", function(d) {
                    return 0;
                })
                .attr("y", function(d) {
                    return (1 + diseases.indexOf(d.disease)) * gridHeight;
                })
                .style("fill", function(d) {
                    return "#ff0000";
                })
                .on("mouseover", function(d) {
                    // select the parent and sort the paths
                    svg.selectAll(".attribute-mark").sort(function (a, b) {
                        // a is not the hovered element, send "a" to the back
                        if (a != d) return -1;
                        // a is the hovered element, bring "a" to the front
                        else return 1;                             
                    });
                });
        patientDiseasesCells.exit().remove();

        var legendRect = svg.selectAll(".legend-rect")
            .data([0].concat(colorScale.quantiles()), function(d) {
                return d;
            });
        legendRect.enter().append("rect")
            .attr("class", "legend-rect bordered")
            .merge(legendRect)
                .attr("x", function(d, i) {
                    return legendWidth * (1 + i);
                })
                .attr("y", (diseases.length + 1.5) * gridHeight)
                .attr("width", legendWidth)
                .attr("height", gridHeight / 2)
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
            .attr("class", "legend-text viz-label")
            .merge(legendText)
                .text(function(d) {
                    return "≥ " + Math.round(d);
                })
                .attr("x", function(d, i) {
                    return legendWidth * (1 + i);
                })
                .attr("y", (diseases.length + 2.5) * gridHeight);
        legendText.exit().remove();
    };

    var makeDescriptionHeatMap = function(elementID) {
        if (elementID === undefined) {
            console.log("[WARN] @makeHeatMap: undefined id.");
            return;
        }
        
        return '<p class="viz-title">' +
                'Relação entre doenças e medicações' +
                '  ' +
                '<img class="tooltip-wrapper" ' +
                    'title="{{tooltipText}}" ' + 
                    'directive-tooltip directive-heat-map-tooltip ' +
                    'src="images/controls/info.svg">' +
                '</img>' +
                '</p>';
    };
    var makeHeatMap = function(elementID, heatMapID) {
        if (elementID === undefined) {
            console.log("[WARN] @makeHeatMap: undefined id.");
            return;
        }
        
        var svg = d3.select("#" + heatMapID).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                  "translate(" + margin.left + "," + margin.top + ")");

        // Save svg for d3 updates
        nodes.updateViz({
            nodeID: elementID,
            vizID: heatMapID,
            html: svg
        });

        populateHeatMap(dataIncidences, svg);
    };

    var updateHeatMap = function(elementID) {
        var heatMap = nodes.getVizs(elementID)[0];
        populateHeatMap(dataIncidences, heatMap.html);
    };

    return {
        updateData: updateData,
        makeSpiral: makeSpiral,
        makeSpiralID: makeSpiralID,
        makeDescriptionSpiral: makeDescriptionSpiral,
        updateSpiral: updateSpiral,
        makeHeatMap: makeHeatMap,
        makeHeatMapID: makeHeatMapID,
        makeDescriptionHeatMap: makeDescriptionHeatMap,
        updateHeatMap: updateHeatMap
    };
}]);
