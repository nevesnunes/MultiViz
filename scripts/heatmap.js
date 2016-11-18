var moduleVisualizations = angular.module('moduleVisualizations');

moduleVisualizations.directive('directiveHeatMapTooltip', function() {
    return {
        link: function (scope, element, attrs) {
            scope.setTooltipText = function(button) {
                scope.tooltipText = 
                    "<div style=\"text-align: left\" class=\"p\">" +
                        "Encontre relações entre atributos " +
                        "partilhados por múltiplos pacientes." +
                    "</div>" +
                    "</br>" +
                    "<div style=\"text-align: left\" class=\"p\">" +
                        "Os <b>atributos presentes no paciente actual</b> " +
                        "são assinalados (" +
                        "<div style=\"display: inline-block\" class=\"" +
                            "markPatientAttribute markPresent markSquare\" />" +
                        ")." +
                    "</div>";
            };
        }
    };
});

moduleVisualizations.factory('HeatMapVisualization',
        ['visualizations', 'patientData', 'retrievePatientData', 'utils', 'nodes',
        function(visualizations, patientData, retrievePatientData, utils, nodes) {
    var HeatMapVisualization = function(options) {
        // Patient attribute lists
        this.patientLists = {
            diseases: options.diseases.slice(),
            medications: options.medications.slice()
        };

        this.html = [];

        // TODO: Update when no atributes are selected
        this.hasData = true;

        this.availableSortings = [
            {
                key: 'ALPHABETIC_HIGHER',
                label: 'Alfabética (Ascendente<img ' +
                    'src="images/controls/black/ascending.svg"' +
                    'class="custom-btn-svg">)'
            },
            {
                key: 'ALPHABETIC_LOWER',
                label: 'Alfabética (Descendente<img ' +
                    'src="images/controls/black/descending.svg"' +
                    'class="custom-btn-svg">)'
            },
            {
                key: 'FREQUENCY_HIGHER',
                label: 'Frequência (Ascendente<img ' +
                    'src="images/controls/black/ascending.svg"' +
                    'class="custom-btn-svg">)'
            },
            {
                key: 'FREQUENCY_LOWER',
                label: 'Frequência (Descendente<img ' +
                    'src="images/controls/black/descending.svg"' +
                    'class="custom-btn-svg">)'
            }
        ];
        this.currentSorting = this.availableSortings.filter(function(sorting) {
           return sorting.key === 'FREQUENCY_LOWER';
        })[0];

        this.renderer = renderer.SIM; 
        this.currentAttributeType = attributeType.DISEASES;

        // Specific state is maintained in a separate object,
        // which we will use in our facade
        this.visualizationRenderer = null;
    };

    // Unique identifier
    var heatmapID = 0;
    HeatMapVisualization.prototype.makeID = function() {
        heatmapID++;
        return "heatmap-" + heatmapID;
    };

    HeatMapVisualization.prototype.makeDescription = function(elementID) {
        if (elementID === undefined) {
            console.log("[WARN] @make: undefined id.");
            return;
        }
        
        return '<p class="viz-title">' +
                'Relação entre doenças e medicações' +
                '  ' +
                '<img class="tooltip-wrapper help" ' +
                    'title="{{tooltipText}}" ' + 
                    'directive-tooltip directive-heat-map-tooltip ' +
                    'src="images/controls/info.svg">' +
                '</img>' +
                '</p>';
    };

    HeatMapVisualization.prototype.makeSVG = function(elementID, heatMapID) {
        // Dynamic properties
        this.margin = (this.renderer === renderer.SIM) ? {
            top: 40,
            right: 0,
            bottom: 40,
            left: 0
        } : {
            top: 80,
            right: 0,
            bottom: 40,
            left: 200
        };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 420 - this.margin.top - this.margin.bottom;
        this.gridHeight = Math.floor(this.height / 12);
        this.gridWidth = this.gridHeight * 
            ((this.renderer === renderer.SIM) ? 1 : 2);

        if (elementID === undefined) {
            console.log("[WARN] @make: undefined id.");
            return;
        }
        
        var self = this;

        var matrixNumbers = [1];
        if (this.renderer === renderer.DIM) {
            // TODO: Add the second matrix
            // - render2Dim needs to receive/switch attribute lists...
            // - create pinHTML
        }

        matrixNumbers.forEach(function(matrixNumber) {
            var svg = d3.select("#" + heatMapID + "-main-" + matrixNumber)
                .append("svg")
                    .attr("width", 
						self.width + self.margin.left + self.margin.right)
                    .attr("height", 
						self.height + self.margin.top + self.margin.bottom)
                .append("g")
                    .attr("transform", "translate(" +
                        self.margin.left + "," + self.margin.top + ")");
            d3.select("#" + heatMapID + "-main-" + matrixNumber)
                .style('float', 'left');
            d3.select('#' + heatMapID + "-sorting")
                .style('display', 'inline-block');
            d3.select('#' + heatMapID + "-switcher")
                .style('display', 'inline-block');

            self.targetElement = heatMapID;

            self.html.push({
                id: matrixNumber,
                svg: svg
            });
        });
    };

    HeatMapVisualization.prototype.make = function(elementID, heatMapID) {
        var self = this;

        self.makeSVG(elementID, heatMapID);
        self.populate(elementID, heatMapID);
    };

    HeatMapVisualization.prototype.populate = function(elementID, heatMapID) {
        var self = this;

        var patientDataPromise = 
            retrievePatientData.retrieveData('incidences.json');
        patientDataPromise.then(function(data) {
            var allDiseaseNames = visualizations.processSelectedList(
                self.patientLists.diseases);
            var allMedicationNames = visualizations.processSelectedList(
                self.patientLists.medications);

            // Retrieve all matches of different attributes;
            // JSON data contains all attributes, which need to be filtered
            // first by user selected attributes
            // FIXME: Hardcoded pair order
            var filteredData = data.filter(function(d) {
                var isValidPair = ((d.first.type === 'disease') &&
                        (d.second.type === 'medication'));
                return isValidPair &&
                    (allDiseaseNames.indexOf(d.first.name) !== -1) &&
                    (allMedicationNames.indexOf(d.second.name) !== -1);
            }); 

            // We now remove attributes from the lists that don't have
            // matches in filtered data (i.e. no cells for that attribute
            // have values)
            // FIXME: Hardcoded
            var longestNameLength = 0;
            var diseaseNames = (function(list, filteredMatrix) {
                return list.filter(function(name) {
                    var index = utils.arrayObjectPairIndexOf({
                        array: filteredMatrix,
                        propertyOfPair: "first",
                        propertyOfType: "type",
                        typeTerm: "disease",
                        propertyOfValue: "name",
                        valueTerm: name
                    });
                    var isPresent = (index !== -1);
                    if (isPresent && longestNameLength < name.length) {
                        longestNameLength = name.length;
                    }

                    return isPresent;
                });
            })(allDiseaseNames, filteredData);
            var medicationNames = (function(list, filteredMatrix) {
                return list.filter(function(name) {
                    var index = utils.arrayObjectPairIndexOf({
                        array: filteredMatrix,
                        propertyOfPair: "second",
                        propertyOfType: "type",
                        typeTerm: "medication",
                        propertyOfValue: "name",
                        valueTerm: name
                    });
                    var isPresent = (index !== -1);
                    if (isPresent && longestNameLength < name.length) {
                        longestNameLength = name.length;
                    }

                    return isPresent;
                });
            })(allMedicationNames, filteredData);

            // Retrieve all matches of any combination of attributes;
            // JSON data contains all attributes, which need to be filtered
            // first by user selected attributes
            var filteredSimilarityData = data.filter(function(d) {
                var arrayToUse = (d.first.type === 'disease') ?
                    allDiseaseNames :
                    allMedicationNames;
                var areTypesValid =
                    (arrayToUse.indexOf(d.first.name) !== -1);
                arrayToUse = (d.second.type === 'disease') ?
                    allDiseaseNames :
                    allMedicationNames;
                areTypesValid = areTypesValid && 
                    (arrayToUse.indexOf(d.second.name) !== -1);

                return areTypesValid;
            });

            // We now remove attributes from the lists that don't have
            // matches in filtered data (i.e. no cells for that attribute
            // have values)
            var allNames = [
                { array: allDiseaseNames, type: "disease" },
                { array: allMedicationNames, type: "medication" }
            ];
            var similarityNames = [];
            var longestSimilarityNameLength = 0;
            allNames.forEach(function(namesObject) {
                similarityNames = similarityNames.concat( 
                    (function(list, filteredMatrix) {
                        return list.filter(function(name) {
                            var indexFirst = utils.arrayObjectPairIndexOf({
                                array: filteredMatrix,
                                propertyOfPair: "first",
                                propertyOfType: "type",
                                typeTerm: namesObject.type,
                                propertyOfValue: "name",
                                valueTerm: name
                            });
                            var indexSecond = utils.arrayObjectPairIndexOf({
                                array: filteredMatrix,
                                propertyOfPair: "second",
                                propertyOfType: "type",
                                typeTerm: namesObject.type,
                                propertyOfValue: "name",
                                valueTerm: name
                            });
                            var isPresent = (indexFirst !== -1) ||
                                (indexSecond !== -1);
                            if (isPresent &&
                                    longestSimilarityNameLength < name.length) {
                                longestSimilarityNameLength = name.length;
                            }

                            return isPresent;
                        });
                    })(namesObject.array, filteredSimilarityData)
                );
            });

            // Sort according to user selected sorting option
            var names = [
                { array: diseaseNames, id: 'diseaseNames' },
                { array: medicationNames, id: 'medicationNames' },
                { array: similarityNames, id: 'similarityNames' }
            ];
            var sortAscending = function(a, b) {
                return (a.count < b.count) ? -1 : 
                    (a.count > b.count) ? 1 : 0;
            };
            var sortDescending = function(a, b) {
                return (a.count > b.count) ? -1 : 
                    (a.count < b.count) ? 1 : 0;
            };
            var frequencySorting = function(nameObject, sortingFunction) {
                var namesWithCountIncidences = nameObject.array
                    .map(function(name) {
                        return {
                            name: name,
                            count: 0
                        };
                    });
                    namesWithCountIncidences.forEach(function(element) {
                        var includedSimilarityData = filteredSimilarityData
                            .filter(function(dataElement) {
                                return (dataElement.first.name ===
                                        element.name) ||
                                    (dataElement.second.name ===
                                        element.name);
                            });
                        var includedSum = includedSimilarityData
                            .reduce(function(previous, current, i) {
                                return previous + current.incidences;
                            }, 0);
                        element.count = includedSum;
                    });
                    namesWithCountIncidences.sort(sortingFunction);
                return namesWithCountIncidences.slice()
                    .map(function(element) {
                        return element.name;
                    });
            };
            names.forEach(function(nameObject) {
                var sortedObject;
                if (self.currentSorting.key === 'ALPHABETIC_HIGHER') {
                    sortedObject = nameObject.array.sort(function(a, b) {
                        var textA = a.toUpperCase();
                        var textB = b.toUpperCase();
                        return (textA < textB) ? -1 : 
                            (textA > textB) ? 1 : 0;
                    });
                } else if (self.currentSorting.key === 'ALPHABETIC_LOWER') {
                    sortedObject = nameObject.array.sort(function(a, b) {
                        var textA = a.toUpperCase();
                        var textB = b.toUpperCase();
                        return (textA > textB) ? -1 : 
                            (textA < textB) ? 1 : 0;
                    });
                } else if (self.currentSorting.key === 'FREQUENCY_HIGHER') {
                    sortedObject =
                        frequencySorting(nameObject, sortAscending);
                } else if (self.currentSorting.key === 'FREQUENCY_LOWER') {
                    sortedObject =
                        frequencySorting(nameObject, sortDescending);
                }

                if (nameObject.id === 'diseaseNames')
                    diseaseNames = sortedObject.slice();
                else if (nameObject.id === 'medicationNames')
                    medicationNames = sortedObject.slice();
                else if (nameObject.id === 'similarityNames')
                    similarityNames = sortedObject.slice();
            });

            self.visualizationRenderer = {
                dataIncidences: data,
                filteredData: filteredData,
                filteredSimilarityData: filteredSimilarityData,
                diseaseNames: diseaseNames,
                medicationNames: medicationNames,
                longestNameLength: longestNameLength,
                similarityNames: similarityNames,
                longestSimilarityNameLength: longestSimilarityNameLength
            };

            self.render();
        }, function(error) {
            console.log("[ERROR] d3.js parsing results: " + error);
        });
    };

    HeatMapVisualization.prototype.render2DimensionalMatrix = function(matrixHTML) {
        var self = this;

        var svg = matrixHTML;
        var data = self.visualizationRenderer.dataIncidences; 
        var filteredData = self.visualizationRenderer.filteredData;
        var diseaseNames = self.visualizationRenderer.diseaseNames;
        var medicationNames = self.visualizationRenderer.medicationNames;

        // Patient attribute lists
        var patient = patientData.getAttribute(patientData.KEY_PATIENT);
        var patientDiseaseNames = patient.diseases.map(function(obj) {
            return obj.name;
        });
        var patientMedicationNames = patient.medications.map(function(obj) {
            return obj.name;
        });

        // Label width must be wide enough to span all text
        var labelWidth = self.visualizationRenderer.longestNameLength * 8;
        var diseaseLabels = svg.selectAll(".rect-disease-label")
            .data(diseaseNames);
        var diseaseLabelsGroup = diseaseLabels.enter();
        diseaseLabelsGroup.append("rect")
            .attr("class", "rect-disease-label rect-label")
            .attr("x", -labelWidth)
            .attr("width", labelWidth)
            .attr("height", self.gridHeight)
            .merge(diseaseLabels)
                .attr("y", function(d, i) {
                    return (1 + i) * self.gridHeight;
                });
        diseaseLabels.exit().remove();

        diseaseLabels = svg.selectAll(".text-disease-label")
            .data(diseaseNames);
        diseaseLabelsGroup = diseaseLabels.enter();
        diseaseLabelsGroup.append("text")
            .attr("class", "text-disease-label text-label")
            .style("text-anchor", "end")
            .attr("x", 0)
            .attr("transform", "translate(-5," + self.gridHeight / 1.5 + ")")
            .merge(diseaseLabels)
                .attr("y", function(d, i) {
                    return (1 + i) * self.gridHeight;
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
            .attr("x", -labelWidth)
            .attr("width", labelWidth)
            .attr("height", self.gridHeight)
            .merge(medicationLabels)
                .attr("transform", function(d, i) {
                    return "translate(" + ((1.75 + i) * self.gridWidth) + ", " + 
                            (-(1 * self.gridHeight)) + ")rotate(20)";
                });
        medicationLabels.exit().remove();

        medicationLabels = svg.selectAll(".text-medication-label")
            .data(medicationNames);
        medicationLabelsGroup = medicationLabels.enter();
        medicationLabelsGroup.append("text")
            .attr("class", "text-medication-label text-label")
            .style("text-anchor", "end")
            .attr("y", self.gridHeight / 2)
            .attr("transform", "translate(-5," + self.gridHeight * 0.25 + ")")
            .merge(medicationLabels)
                .attr("transform", function(d, i) {
                    return "translate(" + ((1.75 + i) * self.gridWidth) + ", " + 
                            (-(1 * self.gridHeight)) + ")rotate(20)";
                })
                .text(function(d) {
                    return d;
                });
        medicationLabels.exit().remove();

        var colorScale = d3.scaleQuantile()
            .domain([0, visualizations.buckets - 1,
                    d3.max(filteredData, function(d) {
                return d.incidences;
            })])
            .range(visualizations.colors);
        var colorScaleMarks = d3.scaleQuantile()
            .domain([0, visualizations.buckets - 1,
                    d3.max(filteredData, function(d) {
                return d.incidences;
            })])
            .range(visualizations.customGreens);

        // Map data to a format easier to manage in cell selections
        var cellsData = filteredData.map(function(d) {
            return {
                incidences: d.incidences,
                disease: utils.extractValueFromPair({
                    pair: d,
                    propertyOfType: "type",
                    typeTerm: "disease",
                    propertyOfValue: "name"
                }),
                medication: utils.extractValueFromPair({
                    pair: d,
                    propertyOfType: "type",
                    typeTerm: "medication",
                    propertyOfValue: "name"
                })
            };
        });
        var cellsTip = d3.tip()
            .attr('class', 'tooltip tooltip-element tooltip-d3')
            .offset([-10, 0])
            .direction('n')
            .html(function(d) {
                return "<b>Número de pacientes:</b> " + d.incidences;
            });
        svg.call(cellsTip);
        var cells = svg.selectAll(".attribute-cell")
            .data(cellsData);
        cells.enter().append("rect")
            .attr("class", "attribute-cell bordered")
            .attr("width", self.gridWidth)
            .attr("height", self.gridHeight)
            .merge(cells)
                .attr("x", function(d) {
                    return (1 + medicationNames.indexOf(d.medication)) * self.gridWidth;
                })
                .attr("y", function(d) {
                    return (1 + diseaseNames.indexOf(d.disease)) * self.gridHeight;
                })
                .style("fill", function(d) {
                    var isPatientAttribute =
                        (patientMedicationNames.indexOf(d.medication) !== -1) &&
                        (patientDiseaseNames.indexOf(d.disease) !== -1);
                    return (isPatientAttribute) ?
                        colorScaleMarks(d.incidences) :
                        colorScale(d.incidences);
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

        var labelData = data.map(function(d) {
            return {
                incidences: d.incidences,
                disease: utils.extractValueFromPair({
                    pair: d,
                    propertyOfType: "type",
                    typeTerm: "disease",
                    propertyOfValue: "name"
                }),
                medication: utils.extractValueFromPair({
                    pair: d,
                    propertyOfType: "type",
                    typeTerm: "medication",
                    propertyOfValue: "name"
                })
            };
        });

        // Mark properties
        var cellSizeOffset = 2;
        var markSize = self.gridHeight - cellSizeOffset * 4;

        // Identify which data belongs to patient attributes
        var filteredPatientMedicationsData = labelData
            .filter(function(d) {
                return (patientMedicationNames.indexOf(d.medication) !== -1) &&
                    (medicationNames.indexOf(d.medication) !== -1);
            });
        var patientMedicationsCells = svg.selectAll(".attribute-mark-column")
            .data(filteredPatientMedicationsData, function(d) {
                return medicationNames.indexOf(d.medication);
            });
        patientMedicationsCells.enter().append("rect")
            .attr("class", "attribute-mark-column markPresent")
            .attr("width", markSize)
            .attr("height",markSize)
            .merge(patientMedicationsCells)
                .attr("x", function(d) {
                    return (1 + medicationNames.indexOf(d.medication)) *
                        self.gridWidth +
                        ((self.gridWidth - markSize) / 2);
                })
                .attr("y", function(d) {
                    return (self.gridHeight - markSize) / 2;
                });
        patientMedicationsCells.exit().remove();

        var filteredPatientDiseasesData = labelData
            .filter(function(d) {
                return (patientDiseaseNames.indexOf(d.disease) !== -1) &&
                    (diseaseNames.indexOf(d.disease) !== -1);
            });
        var patientDiseasesCells = svg.selectAll(".attribute-mark-line")
            .data(filteredPatientDiseasesData, function(d) {
                return diseaseNames.indexOf(d.disease);
            });
        patientDiseasesCells.enter().append("rect")
            .attr("class", "attribute-mark-line markPresent")
            .attr("width", markSize)
            .attr("height", markSize)
            .merge(patientDiseasesCells)
                .attr("x", function(d) {
                    return ((self.gridWidth - markSize) / 2);
                })
                .attr("y", function(d) {
                    return (1 + diseaseNames.indexOf(d.disease)) *
                        self.gridHeight +
                        ((self.gridHeight - markSize) / 2);
                });
        patientDiseasesCells.exit().remove();

        visualizations.makeLegend(
                svg, 
                colorScale, 
                self.gridWidth, 
                self.gridHeight,
                self.gridWidth,
                (diseaseNames.length + 1.5) * self.gridHeight);
    };

    HeatMapVisualization.prototype.renderSimilarityMatrix = function(matrixHTML) {
        var self = this;

        var svg = matrixHTML;
        var filteredSimilarityData = 
            self.visualizationRenderer.filteredSimilarityData;
        var similarityNames = self.visualizationRenderer.similarityNames;

        // Patient attribute lists
        var patient = patientData.getAttribute(patientData.KEY_PATIENT);
        var patientDiseaseNames = patient.diseases.map(function(obj) {
            return obj.name;
        });
        var patientMedicationNames = patient.medications.map(function(obj) {
            return obj.name;
        });
        var patientSimilarityNames =
            patientDiseaseNames.concat(patientMedicationNames);

        // Label width must be wide enough to span all text
        var labelWidth = self.visualizationRenderer.longestSimilarityNameLength *
            8;
        var cellSizeOffset = 4;
        var attributeLabels = svg.selectAll(".rect-attribute-label")
            .data(similarityNames);
        var attributeLabelsGroup = attributeLabels.enter();
        attributeLabelsGroup.append("rect")
            .attr("class", "rect-attribute-label rect-label")
            .attr("height", self.gridHeight)
            .merge(attributeLabels)
                .attr("width", labelWidth)
                .attr("x", function(d, i) {
                    return (i + 1) * self.gridWidth - cellSizeOffset / 2;
                })
                .attr("y", function(d, i) {
                    return (i - 1) * self.gridHeight - cellSizeOffset / 2;
                });
        attributeLabels.exit().remove();

        attributeLabels = svg.selectAll(".text-attribute-label")
            .data(similarityNames);
        attributeLabelsGroup = attributeLabels.enter();
        attributeLabelsGroup.append("text")
            .attr("class", "text-attribute-label text-label")
            .style("text-anchor", "start")
            .attr("transform", "translate(" +
                5 + "," +
                self.gridHeight / 1.5 + ")")
            .merge(attributeLabels)
                .attr("x", function(d, i) {
                    return (i + 1) * self.gridWidth - cellSizeOffset / 2;
                })
                .attr("y", function(d, i) {
                    return (i - 1) * self.gridHeight - cellSizeOffset / 2;
                })
                .text(function(d) {
                    return d;
                });
        attributeLabels.exit().remove();

        // We need text elements to be drawn before knowing how wide they
        // will be. Therefore, we select them again and store their bounding box
        // for later use.
        textData = [];
        var attributeLabelsTexts = svg.selectAll(".text-attribute-label");
        attributeLabelsTexts.each(function(d, i) {            
            var text = d3.select(this);
            textData.push({
                name: text.datum(),
                width: text.node().getBBox().width 
            });
        });

        attributeLabels = svg.selectAll(".patient-attribute-mark")
            .data(similarityNames);
        attributeLabelsGroup = attributeLabels.enter();
        attributeLabelsGroup.append("rect")
            .attr("class", "patient-attribute-mark markPresent")
            .attr("y", cellSizeOffset * 2)
            .attr("width", self.gridHeight - cellSizeOffset * 4)
            .attr("height", self.gridHeight - cellSizeOffset * 4)
            .merge(attributeLabels)
                .attr("x", function(d, i) {
                    var width = textData[i].width;
                    return (width + 20) +
                        (i + 1) * self.gridWidth - cellSizeOffset / 2;
                })
                .attr("y", function(d, i) {
                    return ((i - 1) * self.gridHeight - cellSizeOffset / 2) +
                        (self.gridHeight / 4);
                })
                .style("fill-opacity", function(d, i) {
                    return (patientSimilarityNames
                            .indexOf(textData[i].name) !== -1) ? 1 : 0;
                });
        attributeLabels.exit().remove();

        var colorScale = d3.scaleQuantile()
            .domain([0, visualizations.buckets - 1,
                    d3.max(filteredSimilarityData, function(d) {
                return d.incidences;
            })])
            .range(visualizations.colors);
        var colorScaleMarks = d3.scaleQuantile()
            .domain([0, visualizations.buckets - 1,
                    d3.max(filteredSimilarityData, function(d) {
                return d.incidences;
            })])
            .range(visualizations.customGreens);

        var cellsTip = d3.tip()
            .attr('class', 'tooltip tooltip-element tooltip-d3')
            .offset([0, -10])
            .direction('w')
            .html(function(d) {
                return "<div style=\"text-align: left\">" +
                    "<span><b>Atributos:</b> " + d.first.name + " / " + 
                        d.second.name + "</span><br/>" +
                    "<span><b>Número de pacientes:</b> " +
                        d.incidences + "</span>" +
                "</div>";
            });
        svg.call(cellsTip);
        var cells = svg.selectAll(".attribute-cell")
            .data(filteredSimilarityData);
        cells.enter().append("rect")
            .attr("class", "attribute-cell bordered")
            .attr("width", self.gridWidth - cellSizeOffset)
            .attr("height", self.gridHeight - cellSizeOffset)
            .merge(cells)
                .attr("x", function(d) {
                    var targetIndex = Math.min(
                        similarityNames.indexOf(d.first.name),
                        similarityNames.indexOf(d.second.name)
                    );
                    return (1 + targetIndex) * self.gridWidth;
                })
                .attr("y", function(d) {
                    var targetIndex = Math.max(
                        similarityNames.indexOf(d.first.name),
                        similarityNames.indexOf(d.second.name)
                    );
                    return (-1 + targetIndex) * self.gridHeight;
                })
                .style("fill", function(d) {
                    var isPatientAttribute =
                        ((patientMedicationNames.indexOf(d.first.name) !== -1) &&
                        (patientDiseaseNames.indexOf(d.second.name) !== -1)) ||
                        ((patientMedicationNames.indexOf(d.second.name) !== -1) &&
                        (patientDiseaseNames.indexOf(d.first.name) !== -1));
                    return (isPatientAttribute) ?
                        colorScaleMarks(d.incidences) :
                        colorScale(d.incidences);
                })
                .on("mouseover", function(d) {
                    cellsTip.show(d);

                    // Style labels
                    svg.selectAll(".text-attribute-label")
                        .attr("class", function(a) {
                            return ((a === d.first.name) ||
                                    (a === d.second.name)) ?
                                "text-attribute-label text-label-selected" :
                                "text-attribute-label text-label";
                        });
                    svg.selectAll(".rect-attribute-label")
                        .attr("class", function(a) {
                            return ((a === d.first.name) ||
                                    (a === d.second.name)) ?
                                "rect-attribute-label rect-label-selected" :
                                "rect-attribute-label rect-label";
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
                    
                    // Style labels
                    svg.selectAll(".text-attribute-label")
                        .attr("class", "text-attribute-label text-label ");
                    svg.selectAll(".rect-attribute-label")
                        .attr("class", "rect-attribute-label rect-label");
                });
        cells.exit().remove();

        visualizations.makeLegend(
                svg, 
                colorScale, 
                self.gridHeight * 2, 
                self.gridHeight,
                self.gridHeight,
                (similarityNames.length) * self.gridHeight);
    };

    var attributeType = Object.freeze({
        NONE: "none",
        DISEASES: "diseases",
        MEDICATIONS: "medications"
    });

    var renderer = Object.freeze({
        DIM: HeatMapVisualization.prototype.render2DimensionalMatrix,
        SIM: HeatMapVisualization.prototype.renderSimilarityMatrix
    });

    HeatMapVisualization.prototype.render = function() {
        var self = this;

        d3.select("#" + self.targetElement + "-sort")
            .html(self.currentSorting.label);

        // Height for the similarity matrix is computed here
        // since it depends on filtered data
        if (self.renderer === renderer.SIM) {
            d3.select("#" + self.targetElement).selectAll("svg")
                .attr("height",
                    (self.visualizationRenderer.similarityNames.length *
                    self.gridHeight) +
                    self.margin.top + self.margin.bottom);
        }
        self.html.forEach(function(element) {
            self.renderer(element.svg);
        });
    };

    HeatMapVisualization.prototype.remove = function(nodeID, vizID, matrixHTML) {
        var self = this;

        var svg = matrixHTML;
        var cells = svg.selectAll(".attribute-cell");
        cells
            .on("mouseover", null)
            .on("mouseout", null);
        svg.selectAll(".attribute-cell")
            .remove();
    };

    HeatMapVisualization.prototype.remake = function(nodeID, vizID) {
        var self = this;

        // Remove previous nodes/handlers, since they are invalidated by the
        // new DOM layout
        self.html.forEach(function(element) {
            self.remove(nodeID, vizID, element.svg);
        });

        // Add attributes and svgs to the new DOM targets. Note that the target
        // element ID is still the same.
        self.makeSVG(nodeID, vizID);

        // Render paths, reusing data stored in the visualization object
        self.render();
    };

    HeatMapVisualization.prototype.isAttributeTypeActive = function(type) {
        return this.currentAttributeType === type;
    };

    HeatMapVisualization.prototype.getAttributeTypes = function(type) {
        return attributeType;
    };

    HeatMapVisualization.prototype.setCurrentAttributeType = function(type) {
        this.currentAttributeType = type;
    };

    HeatMapVisualization.prototype.isRendererActive = function(type) {
        return this.renderer === renderer[type];
    };

    HeatMapVisualization.prototype.switchRenderer = function(nodeID, vizID, type) {
        var self = this;

        self.renderer = renderer[type];

        // Remove previous svg, since the new visualization will be appended
        d3.select("#" + vizID).select("svg").remove();

        self.remake(nodeID, vizID);
    };

    HeatMapVisualization.prototype.renderVisibleDetails = function() {
        d3.select("#" + this.targetElement + "-switcher")
            .style('display', 'inline-block')
            .style("visibility", "initial")
            .style("width", "initial")
            .style("height", "initial");
        d3.select("#" + this.targetElement + "-sorting")
            .style('display', 'inline-block')
            .style("visibility", "initial")
            .style("width", "initial")
            .style("height", "initial");
    };

    HeatMapVisualization.prototype.renderNoVisibleDetails = function() {
        d3.select("#" + this.targetElement + "-switcher")
            .style('display', 'none')
            .style("visibility", "hidden")
            .style("width", 0)
            .style("height", 0);
        d3.select("#" + this.targetElement + "-sorting")
            .style('display', 'none')
            .style("visibility", "hidden")
            .style("width", 0)
            .style("height", 0);
    };

    HeatMapVisualization.prototype.modifyDetailsVisibility =
            function(isMaximized) {
        // When we don't have data, we simply show all the attribute text
        if (isMaximized || !(this.hasData)) {
            this.renderVisibleDetails();
        } else {
            this.renderNoVisibleDetails();
        }
    };

    HeatMapVisualization.prototype.update = function(nodeID, vizID, state) {
        var self = this;

        if (state.sorting) {
            self.currentSorting = self.availableSortings
                .filter(function(sorting) {
                    return sorting.key === state.sorting;
                })[0];
        }
        if (state.diseases) {
            self.patientLists.diseases = state.diseases.slice();
        }
        if (state.medications) {
            self.patientLists.medications = state.medications.slice();
        }
        self.populate(nodeID, vizID);
    };

    visualizations.validateInterface(
        HeatMapVisualization.prototype, "HeatMapVisualization"
    );

    return HeatMapVisualization;
}]);
