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
            left: 200
        },
        width = 800 - margin.left - margin.right,
        height = 420 - margin.top - margin.bottom,
        gridHeight = Math.floor(height / 8),
        gridWidth = gridHeight * 2,
        customDarkGreys = ["#bdbdbd","#969696","#737373","#525252","#252525","#000000"],
        buckets = customDarkGreys.length,
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
    var diseaseNames = [];
    var medicationNames = [];
    var updateData = function(selectedDiseases, selectedMedications) {
        diseaseNames = processSelectedList(selectedDiseases);
        medicationNames = processSelectedList(selectedMedications);
    };

    // Patient attribute lists
    var patient = patientData.getAttribute(patientData.KEY_PATIENT);
    var patientDiseasesNames = patient.diseases.map(function(obj) {
        return obj.name;
    });
    var patientMedicationsNames = patient.medications.map(function(obj) {
        return obj.name;
    });

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
    };

    var makeSpiral = function(elementID, spiralID, isChecked) {
        if (elementID === undefined) {
            console.log("[WARN] @makeHeatMap: undefined id.");
            return;
        }

        var data = [];
        var countPoints = 100;
        var size = 300;

        // FIXME: There's probably a less hardcoded way to compute adjustments...
        var spacing = 275 / countPoints;
        if (countPoints < 100)
            spacing *= (countPoints / 100) + 0.25 * ((100 - countPoints) / 100);
        if (countPoints < 10)
            spacing *= 1.25 * (countPoints / 10);

        var spiral = new Spiral({
            graphType: 'custom-path',
            numberOfPoints: countPoints,
            period: '7',
            svgWidth: size,
            svgHeight: size + 50,
            margin: {
                top: -30,
                right: 0,
                bottom: 0,
                left: 0
            },
            spacing: spacing,
            lineWidth: spacing * 6,
            targetElement: '#' + spiralID,
            functions: {
                makeLegend: makeLegend
            }
        });
        spiral.randomData();
        var svg = spiral.render();

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
            return (diseaseNames.indexOf(d.disease) !== -1) &&
                (medicationNames.indexOf(d.medication) !== -1);
        }); 

        // We now remove attributes from the lists that don't have
        // matches in filteredData (i.e. no cells for that attribute
        // have values)
        diseaseNames = (function(list, filteredMatrix) {
            return list.filter(function(name) {
                var index = utils.arrayObjectIndexOf(
                    filteredMatrix, name, "disease");
                return index !== -1;
            });
        })(diseaseNames, filteredData);
        medicationNames = (function(list, filteredMatrix) {
            return list.filter(function(name) {
                var index = utils.arrayObjectIndexOf(
                    filteredMatrix, name, "medication");
                return index !== -1;
            });
        })(medicationNames, filteredData);

        var rectWidth = 200;

        var diseaseLabels = svg.selectAll(".rect-disease-label")
            .data(diseaseNames);
        var diseaseLabelsGroup = diseaseLabels.enter();
        diseaseLabelsGroup.append("rect")
            .attr("class", "rect-disease-label rect-label")
            .attr("x", -rectWidth)
            .attr("width", rectWidth)
            .attr("height", gridHeight)
            .merge(diseaseLabels)
                .attr("y", function(d, i) {
                    return (1 + i) * gridHeight;
                });
        diseaseLabels.exit().remove();

        diseaseLabels = svg.selectAll(".text-disease-label")
            .data(diseaseNames);
        diseaseLabelsGroup = diseaseLabels.enter();
        diseaseLabelsGroup.append("text")
            .attr("class", "text-disease-label text-label")
            .style("text-anchor", "end")
            .attr("x", 0)
            .attr("transform", "translate(-5," + gridHeight / 1.5 + ")")
            .merge(diseaseLabels)
                .attr("y", function(d, i) {
                    return (1 + i) * gridHeight;
                })
                .text(function(d) {
                    return d;
                });
        diseaseLabels.exit().remove();

        var medicationLabels = svg.selectAll(".rect-medication-label")
            .data(medicationNames);
        var medicationLabelsGroup = medicationLabels.enter();
        medicationLabelsGroup.append("rect")
            .attr("class", "rect-medication-label rect-label")
            .attr("x", -rectWidth)
            .attr("width", rectWidth)
            .attr("height", gridHeight)
            .merge(medicationLabels)
                .attr("transform", function(d, i) {
                    return "translate(" + ((1.75 + i) * gridWidth) + ", " + 
                            (-(1 * gridHeight)) + ")rotate(20)";
                });
        medicationLabels.exit().remove();

        medicationLabels = svg.selectAll(".text-medication-label")
            .data(medicationNames);
        medicationLabelsGroup = medicationLabels.enter();
        medicationLabelsGroup.append("text")
            .attr("class", "text-medication-label text-label")
            .style("text-anchor", "end")
            .attr("y", gridHeight / 2)
            .attr("transform", "translate(-5," + gridHeight * 0.25 + ")")
            .merge(medicationLabels)
                .attr("transform", function(d, i) {
                    return "translate(" + ((1.75 + i) * gridWidth) + ", " + 
                            (-(1 * gridHeight)) + ")rotate(20)";
                })
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
        var cells = svg.selectAll(".attribute-cell")
            .data(filteredData);
        cells.enter().append("rect")
            .attr("class", "attribute-cell bordered")
            .attr("width", gridWidth)
            .attr("height", gridHeight)
            .merge(cells)
                .attr("x", function(d) {
                    return (1 + medicationNames.indexOf(d.medication)) * gridWidth;
                })
                .attr("y", function(d) {
                    return (1 + diseaseNames.indexOf(d.disease)) * gridHeight;
                })
                .style("fill", function(d) {
                    return colorScale(d.incidences);
                })
                .on("mouseover", function(d) {
                    cellsTip.show(d);

                    // Style column labels
                    svg.selectAll(".text-medication-label")
                        .attr("class", function(a) {
                            return (a == d.medication) ? 
                                "text-medication-label text-label-selected" :
                                "text-medication-label text-label";
                        });
                    svg.selectAll(".rect-medication-label")
                        .attr("class", function(a) {
                            return (a == d.medication) ? 
                                "rect-medication-label rect-label-selected" :
                                "rect-medication-label rect-label";
                        });

                    // Style line labels
                    svg.selectAll(".text-disease-label")
                        .attr("class", function(a) {
                            return (a == d.disease) ? 
                                "text-disease-label text-label-selected" :
                                "text-disease-label text-label ";
                        });
                    svg.selectAll(".rect-disease-label")
                        .attr("class", function(a) {
                            return (a == d.disease) ? 
                                "rect-disease-label rect-label-selected" :
                                "rect-disease-label rect-label";
                        });

                    // Sort paths for correct hover styling
                    svg.selectAll(".attribute-cell")
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
                    svg.selectAll(".text-medication-label")
                        .attr("class", "text-medication-label text-label ");
                    svg.selectAll(".rect-medication-label")
                        .attr("class", "rect-medication-label rect-label");

                    // Style line labels
                    svg.selectAll(".text-disease-label")
                        .attr("class", "text-disease-label text-label");
                    svg.selectAll(".rect-disease-label")
                        .attr("class", "rect-disease-label rect-label");
                });
        cells.exit().remove();

        var filteredPatientMedicationsData = data
            .filter(function(d) {
                return (patientMedicationsNames.indexOf(d.medication) !== -1) &&
                    (medicationNames.indexOf(d.medication) !== -1);
            })
            .map(function(d) {
                return {
                    medication: d.medication,
                    isMark: true
                };
            }); 
        var patientMedicationsCells = svg.selectAll(".attribute-mark-column")
            .data(filteredPatientMedicationsData, function(d) {
                return medicationNames.indexOf(d.medication);
            });
        patientMedicationsCells.enter().append("rect")
            .attr("class", "attribute-cell bordered")
            .attr("width", gridWidth)
            .attr("height", gridHeight)
            .merge(cells)
                .attr("x", function(d) {
                    return (1 + medicationNames.indexOf(d.medication)) * gridWidth;
                })
                .attr("y", function(d) {
                    return 0;
                })
                .style("fill", function(d) {
                    return "#ff0000";
                })
                .on("mouseover", function(d) {
                    // select the parent and sort the paths
                    svg.selectAll(".attribute-cell").sort(function (a, b) {
                        // a is not the hovered element, send "a" to the back
                        if (a != d) return -1;
                        // a is the hovered element, bring "a" to the front
                        else return 1;                             
                    });
                });
        patientMedicationsCells.exit().remove();

        var filteredPatientDiseasesData = data
            .filter(function(d) {
                return (patientDiseasesNames.indexOf(d.disease) !== -1) &&
                    (diseaseNames.indexOf(d.disease) !== -1);
            })
            .map(function(d) {
                return {
                    disease: d.disease,
                    isMark: true
                };
            }); 
        var patientDiseasesCells = svg.selectAll(".attribute-mark-line")
            .data(filteredPatientDiseasesData, function(d) {
                return diseaseNames.indexOf(d.disease);
            });
        patientDiseasesCells.enter().append("rect")
            .attr("class", "attribute-cell bordered")
            .attr("width", gridWidth)
            .attr("height", gridHeight)
            .merge(cells)
                .attr("x", function(d) {
                    return 0;
                })
                .attr("y", function(d) {
                    return (1 + diseaseNames.indexOf(d.disease)) * gridHeight;
                })
                .style("fill", function(d) {
                    return "#ff0000";
                })
                .on("mouseover", function(d) {
                    // select the parent and sort the paths
                    svg.selectAll(".attribute-cell").sort(function (a, b) {
                        // a is not the hovered element, send "a" to the back
                        if (a != d) return -1;
                        // a is the hovered element, bring "a" to the front
                        else return 1;                             
                    });
                });
        patientDiseasesCells.exit().remove();

        makeLegend(
                svg, 
                colorScale, 
                gridWidth, 
                gridHeight,
                gridWidth,
                (diseaseNames.length + 1.5) * gridHeight);
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
