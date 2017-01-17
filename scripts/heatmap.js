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
        ['$timeout', 'visualizations', 'patientData', 'retrieveCountsData', 'retrievePatientData', 'utils', 'nodes',
        function($timeout, visualizations, patientData, retrieveCountsData, retrievePatientData, utils, nodes) {
    // d3 Extensions
    //
    // https://github.com/wbkd/d3-extended
    // Forces selected elements to always be on top/back of other elements
    d3.selection.prototype.moveToFront = function() {
        return this.each(function() {
            this.parentNode.appendChild(this);
        });
    };
    d3.selection.prototype.moveToBack = function() {  
        return this.each(function() { 
            var firstChild = this.parentNode.firstChild; 
            if (firstChild) { 
                this.parentNode.insertBefore(this, firstChild); 
            } 
        });
    };

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
        this.rendererAddStyle = rendererAddStyle.SIM; 
        this.rendererRemoveStyle = rendererRemoveStyle.SIM; 
        this.currentAttributeType = attributeType.DISEASES;
        this.currentModificationType = modificationType.DATA;

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
            top: 0,
            right: 0,
            bottom: 40,
            left: 40
        };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 420 - this.margin.top - this.margin.bottom;
        this.gridHeight = Math.floor(this.height / 12);
        this.gridWidth = this.gridHeight;

        if (elementID === undefined) {
            console.log("[WARN] @make: undefined id.");
            return;
        }
        
        var self = this;

        // Multiple matrixes can be defined, each with their own
        // html elements appended dynamically.
        var matrixNumbers = [1];
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

            var matrixObject = {
                elementID: elementID,
                heatMapID: heatMapID,
                id: matrixNumber,
                svg: svg
            };

            var index = utils.arrayObjectIndexOf(self.html, matrixNumber, "id");
            if (index > -1) {
                self.html[index] = matrixObject;
            } else {
                self.html.push(matrixObject);
            }
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

            // Add empty cells to data, in order to visualize them
            // when rendering
            diseaseNames.forEach(function(name1) {
                medicationNames.forEach(function(name2) {
                    if (name1 === name2)
                        return;

                    var type1 = "disease";
                    var type2 = "medication";
                    var index = utils.arrayObjectFullPairIndexOf(
                        filteredData,
                        {
                            propertyOfPair: "first",
                            propertyOfType: "type",
                            typeTerm: type1,
                            propertyOfValue: "name",
                            valueTerm: name1
                        },
                        {
                            propertyOfPair: "second",
                            propertyOfType: "type",
                            typeTerm: type2,
                            propertyOfValue: "name",
                            valueTerm: name2
                        }
                    );
                    if (index === -1) {
                        filteredData.push({
                            first: {
                                name: name1,
                                type: type1
                            },
                            second: {
                                name: name2,
                                type: type2
                            },
                            incidences: 0,
                            patientIDs: []
                        });
                    }
                });
            });

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

            // Add empty cells to data, in order to visualize them
            // when rendering
            similarityNames.forEach(function(name1) {
                similarityNames.forEach(function(name2) {
                    if (name1 === name2)
                        return;

                    var type1, type2;
                    allNames.forEach(function(filteredName) {
                        if (filteredName.array.indexOf(name1) !== -1)
                            type1 = filteredName.type;
                        if (filteredName.array.indexOf(name2) !== -1)
                            type2 = filteredName.type;
                    });
                        
                    var index = utils.arrayObjectFullPairIndexOf(
                        filteredSimilarityData,
                        {
                            propertyOfPair: "first",
                            propertyOfType: "type",
                            typeTerm: type1,
                            propertyOfValue: "name",
                            valueTerm: name1
                        },
                        {
                            propertyOfPair: "second",
                            propertyOfType: "type",
                            typeTerm: type2,
                            propertyOfValue: "name",
                            valueTerm: name2
                        }
                    );
                    if (index === -1) {
                        filteredSimilarityData.push({
                            first: {
                                name: name1,
                                type: type1
                            },
                            second: {
                                name: name2,
                                type: type2
                            },
                            incidences: 0,
                            patientIDs: []
                        });
                    }
                });
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

            var longestDimensionLength = (
                    diseaseNames.length > medicationNames.length) ?
                diseaseNames.length :
                medicationNames.length;
            self.visualizationRenderer = {
                dataIncidences: data,
                filteredData: filteredData,
                filteredSimilarityData: filteredSimilarityData,
                diseaseNames: diseaseNames,
                medicationNames: medicationNames,
                longestDimensionLength: longestDimensionLength,
                longestNameLength: longestNameLength,
                similarityNames: similarityNames,
                longestSimilarityNameLength: longestSimilarityNameLength
            };

            self.render();
        }, function(error) {
            console.log("[ERROR] d3.js parsing results: " + error);
        });
    };

    HeatMapVisualization.prototype.addDiamondStyleSelections = function(d) {
        var self = this;

        self.html.forEach(function(element) {
            var svg = element.svg;

            // Style column labels
            svg.selectAll(".text-medication-label")
                .attr("class", function(a) {
                    return (a == d.medication) ? 
                        "text-medication-label text-label-selected" :
                        "text-medication-label text-label";
                });
            svg.selectAll(".rect-medication-label")
                .style("fill-opacity", 1.0)
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
                .style("fill-opacity", 1.0)
                .attr("class", function(a) {
                    return (a == d.disease) ? 
                        "rect-disease-label rect-label-selected" :
                        "rect-disease-label rect-label";
                });

            var cellSizeOffset = self.visualizationRenderer.cellSizeOffset;
            var diamondInitialX = self.visualizationRenderer.diamondInitialX;
            var diamondInitialY = self.visualizationRenderer.diamondInitialY;
            var diamondSize = self.visualizationRenderer.diamondSize;
            var diseaseNames = self.visualizationRenderer.diseaseNames;
            var medicationNames = self.visualizationRenderer.medicationNames;

            var guideLength;
            var guideSize;
            var diamondPath;

            // Disease guide (direction = \)
            if (diseaseNames.indexOf(d.disease) !== -1) {
                guideLength = medicationNames.length + 1;
                guideSize = diamondSize + cellSizeOffset;
                diamondPath = "M " + (0 - cellSizeOffset) + " " +
                        (guideSize - cellSizeOffset) + " " +
                    "L " + (guideSize * (guideLength-1) - cellSizeOffset) + " " +
                        (guideSize * (guideLength) - cellSizeOffset) + " " +
                    "L " + (guideSize * (guideLength) - cellSizeOffset) + " " +
                        (guideSize * (guideLength-1) - cellSizeOffset) + " " +
                    "L " + (guideSize - cellSizeOffset) + " " +
                        (0 - cellSizeOffset) + " " +
                    "Z";
                svg.append("path")
                    .attr("class", "guide")
                    .attr("d", diamondPath)
                    .attr("transform", function() {
                        var x = diamondInitialX * self.gridHeight -
                            (diseaseNames.indexOf(d.disease)) * 
                            (diamondSize + cellSizeOffset);
                        var y = 0 +
                            (2 + diseaseNames.indexOf(d.disease)) * 
                            (diamondSize + cellSizeOffset);

                        return "translate(" + x + "," + y + ")";
                    });
            }

            // Medication guide (direction = /)
            if (medicationNames.indexOf(d.medication) !== -1) {
                guideLength = diseaseNames.length + 1;
                guideSize = diamondSize + cellSizeOffset;
                diamondPath = "M " + (0 - cellSizeOffset) + " " +
                        (guideSize * (guideLength-1) - cellSizeOffset) + " " +
                    "L " + (guideSize - cellSizeOffset) + " " +
                        (guideSize * (guideLength) - cellSizeOffset) + " " +
                    "L " + (guideSize * (guideLength) - cellSizeOffset) + " " +
                        (guideSize - cellSizeOffset) + " " +
                    "L " + (guideSize * (guideLength-1) - cellSizeOffset) + " " +
                        (0 - cellSizeOffset) + " Z";
                svg.append("path")
                    .attr("class", "guide")
                    .attr("d", diamondPath)
                    .attr("transform", function() {
                        var x = (self.gridHeight) / 2 - 
                            (guideLength - 2) * (cellSizeOffset) +
                            (medicationNames.indexOf(d.medication)) * 
                            (diamondSize + cellSizeOffset);
                        var y = 0 +
                            (2 + medicationNames.indexOf(d.medication)) * 
                            (diamondSize + cellSizeOffset);

                        return "translate(" + x + "," + y + ")";
                    });
            }

            // Guides should be on back of cells,
            // to allow mouseover on cells
            svg.selectAll(".guide").moveToBack();
        });
    };

    HeatMapVisualization.prototype.removeDiamondStyleSelections = function(d) {
        var self = this;

        self.html.forEach(function(element) {
            var svg = element.svg;

            // Style column labels
            svg.selectAll(".text-medication-label")
                .attr("class", "text-medication-label text-label ");
            svg.selectAll(".rect-medication-label")
                .style("fill-opacity", 0.0);

            // Style line labels
            svg.selectAll(".text-disease-label")
                .attr("class", "text-disease-label text-label");
            svg.selectAll(".rect-disease-label")
                .style("fill-opacity", 0.0);

            // Remove selection guides
            svg.selectAll(".guide")
                .remove();
        });
    };

    HeatMapVisualization.prototype.render2DimensionalMatrix = function(matrixElement) {
        var self = this;

        var svg = matrixElement.svg;
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

        // Offset for centering diamond and labels in svg
        var diamondInitialX = diseaseNames.length / 2;
        self.visualizationRenderer.diamondInitialX = diamondInitialX;
        var diamondInitialY = medicationNames.length / 2;
        self.visualizationRenderer.diamondInitialY = diamondInitialY;

        // Offset for positioning each cell of the diamond
        var cellSizeOffset = 4;
        self.visualizationRenderer.cellSizeOffset = cellSizeOffset;
        var diamondSize = self.gridHeight / 2;
        self.visualizationRenderer.diamondSize = diamondSize;

        // Label width must be wide enough to span all text
        var labelWidth = self.visualizationRenderer
            .longestNameLength * 8 + self.gridWidth;
        var labelHeight = self.gridHeight - cellSizeOffset * 2;

        // FIXME: Slight x offset (test with bigger gridHeight)
        var diseaseLabels = svg.selectAll(".rect-disease-label")
            .data(diseaseNames);
        var diseaseLabelsGroup = diseaseLabels.enter();
        diseaseLabelsGroup.append("rect")
            .attr("class", "rect-disease-label rect-label")
            .attr("width", labelWidth)
            .attr("height", labelHeight)
            .merge(diseaseLabels)
                .attr("x", function(d, i) {
                    return (
                            // largest possible position
                            (2 + diamondInitialX) *
                            self.gridHeight +
                            (2 * diamondInitialY) *
                            (diamondSize + cellSizeOffset)
                        ) -
                        // relative position
                        (2 + i) * 
                        (diamondSize + cellSizeOffset) -
                        // +1 offset relative to text
                        cellSizeOffset * 4;
                })
                .attr("y", function(d, i) {
                    return (
                            // start position
                            1 *
                            self.gridHeight / 2 +
                            (2 * diamondInitialY) *
                            (diamondSize + cellSizeOffset)
                        ) +
                        // relative position
                        (1 + i) * 
                        (diamondSize + cellSizeOffset) +
                        // +1 offset relative to text
                        cellSizeOffset * 3;
                })
                .on("mouseover", function(d) {
                    self.rendererAddStyle({
                        disease: d,
                        medication: d
                    });
                })
                .on("mouseout", function(d) {
                    self.rendererRemoveStyle(d);
                });
        diseaseLabels.exit().remove();

        diseaseLabels = svg.selectAll(".text-disease-label")
            .data(diseaseNames);
        diseaseLabelsGroup = diseaseLabels.enter();
        diseaseLabelsGroup.append("text")
            .attr("class", "text-disease-label text-label")
            .merge(diseaseLabels)
                .attr("x", function(d, i) {
                    return (
                            // largest possible position
                            (2 + diamondInitialX) *
                            self.gridHeight +
                            (2 * diamondInitialY) *
                            (diamondSize + cellSizeOffset)
                        ) -
                        // relative position
                        (2 + i) * 
                        (diamondSize + cellSizeOffset) -
                        // offset to be closer to cells
                        cellSizeOffset * 3;
                })
                .attr("y", function(d, i) {
                    return (
                            // start position
                            self.gridHeight / 2 +
                            (2 * diamondInitialY) *
                            (diamondSize + cellSizeOffset)
                        ) +
                        // relative position
                        (2 + i) * 
                        (diamondSize + cellSizeOffset) +
                        // offset to be closer to cells
                        cellSizeOffset * 2;
                })
                .on("mouseover", function(d) {
                    self.rendererAddStyle({
                        disease: d,
                        medication: d
                    });
                })
                .on("mouseout", function(d) {
                    self.rendererRemoveStyle(d);
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
            .attr("width", labelWidth)
            .attr("height", labelHeight)
            .merge(medicationLabels)
                .attr("x", function(d, i) {
                    return (
                            // start position
                            diamondInitialX *
                            self.gridHeight 
                        ) +
                        // relative position
                        (2 + i) * 
                        (diamondSize + cellSizeOffset) -
                        // +1 offset relative to text
                        cellSizeOffset * 3;
                })
                .attr("y", function(d, i) {
                    return (
                            // start position
                            self.gridHeight / 2
                        ) +
                        // relative position
                        (i) * 
                        (diamondSize + cellSizeOffset) +
                        // +1 offset relative to text
                        cellSizeOffset;
                })
                .on("mouseover", function(d) {
                    self.rendererAddStyle({
                        disease: d,
                        medication: d
                    });
                })
                .on("mouseout", function(d) {
                    self.rendererRemoveStyle(d);
                });
        medicationLabels.exit().remove();

        medicationLabels = svg.selectAll(".text-medication-label")
            .data(medicationNames);
        medicationLabelsGroup = medicationLabels.enter();
        medicationLabelsGroup.append("text")
            .attr("class", "text-medication-label text-label")
            .merge(medicationLabels)
                .attr("x", function(d, i) {
                    return (
                            // start position
                            diamondInitialX *
                            self.gridHeight 
                        ) +
                        // relative position
                        (2 + i) * 
                        (diamondSize + cellSizeOffset) -
                        // offset to be closer to cells
                        cellSizeOffset * 2;
                })
                .attr("y", function(d, i) {
                    return (
                            // start position
                            1 *
                            self.gridHeight / 2
                        ) +
                        // relative position
                        (1 + i) * 
                        (diamondSize + cellSizeOffset);
                })
                .on("mouseover", function(d) {
                    self.rendererAddStyle({
                        disease: d,
                        medication: d
                    });
                })
                .on("mouseout", function(d) {
                    self.rendererRemoveStyle(d);
                })
                .text(function(d) {
                    return d;
                });
        medicationLabels.exit().remove();

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
        var markSize = diamondSize - cellSizeOffset;

        // We need text elements to be drawn before knowing how wide they
        // will be. Therefore, we select them again and store their bounding box
        // for later use.
        var textData = [];
        var waitForDOMRendered = function selfFunction() {
            try {
                textData = visualizations.extractBBoxes(
                    svg.selectAll(".text-medication-label")
                );

                // Identify which data belongs to patient attributes
                var filteredPatientMedicationsData = patientMedicationNames
                    .filter(function(d) {
                        return (medicationNames.indexOf(d) !== -1);
                    });
                var patientMedicationsCells = svg.selectAll(".attribute-mark-column")
                    .data(filteredPatientMedicationsData, function(d) {
                        return medicationNames.indexOf(d);
                    });
                patientMedicationsCells.enter().append("rect")
                    .attr("class", "attribute-mark-column markPresent")
                    .attr("width", markSize)
                    .attr("height", markSize)
                    .merge(patientMedicationsCells)
                        .attr("x", function(d, i) {
                            var width = textData[medicationNames.indexOf(d)]
                                .width;
                            return (width + 20) + (
                                    // start position
                                    diamondInitialX *
                                    self.gridHeight 
                                ) +
                                // relative position
                                (2 + medicationNames.indexOf(d)) * 
                                (diamondSize + cellSizeOffset) -
                                // offset to be closer to cells
                                cellSizeOffset * 2;
                        })
                        .attr("y", function(d, i) {
                            return (
                                    // start position
                                    1 *
                                    self.gridHeight / 2
                                ) +
                                // relative position
                                (1 + medicationNames.indexOf(d)) * 
                                (diamondSize + cellSizeOffset) -
                                // center mark
                                (self.gridHeight - markSize) / 2;
                        })
                        .on("mouseover", function(d) {
                            self.rendererAddStyle({
                                disease: d,
                                medication: d
                            });
                        })
                        .on("mouseout", function(d) {
                            self.rendererRemoveStyle(d);
                        });
                patientMedicationsCells.exit().remove();

                textData = visualizations.extractBBoxes(
                    svg.selectAll(".text-disease-label")
                );

                var filteredPatientDiseasesData = patientDiseaseNames
                    .filter(function(d) {
                        return (diseaseNames.indexOf(d) !== -1);
                    });
                var patientDiseasesCells = svg.selectAll(".attribute-mark-line")
                    .data(filteredPatientDiseasesData, function(d) {
                        return diseaseNames.indexOf(d);
                    });
                patientDiseasesCells.enter().append("rect")
                    .attr("class", "attribute-mark-line markPresent")
                    .attr("width", markSize)
                    .attr("height", markSize)
                    .merge(patientDiseasesCells)
                        .attr("x", function(d, i) {
                            var width = textData[diseaseNames.indexOf(d)]
                                .width;
                            return (width + 20) + (
                                    // largest possible position
                                    (2 + diamondInitialX) *
                                    self.gridHeight + 
                                    (2 * diamondInitialY) *
                                    (diamondSize + cellSizeOffset)
                                ) -
                                // relative position
                                (2 + diseaseNames.indexOf(d)) * 
                                (diamondSize + cellSizeOffset) -
                                // offset to be closer to cells
                                cellSizeOffset * 3;
                        })
                        .attr("y", function(d, i) {
                            return (
                                    // start position
                                    1 *
                                    self.gridHeight / 2 +
                                    (2 * diamondInitialY) *
                                    (diamondSize + cellSizeOffset)
                                ) +
                                // relative position
                                (2 + diseaseNames.indexOf(d)) * 
                                (diamondSize + cellSizeOffset) +
                                // offset to be closer to cells
                                cellSizeOffset * 2 -
                                // center mark
                                (self.gridHeight - markSize) / 2;
                        })
                        .on("mouseover", function(d) {
                            self.rendererAddStyle({
                                disease: d,
                                medication: d
                            });
                        })
                        .on("mouseout", function(d) {
                            self.rendererRemoveStyle(d);
                        });
                patientDiseasesCells.exit().remove();
            } catch(e) {
                window.requestAnimationFrame(selfFunction);
            }
        };
        waitForDOMRendered();

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
            .offset([0, -50])
            .direction('w')
            .html(function(d) {
                return "<div style=\"text-align: left\">" +
                    "<span><b>Atributos:</b> " + d.medication + " / " + 
                        d.disease + "</span><br/>" +
                    "<span><b>Número de pacientes:</b> " +
                        d.incidences + "</span>" +
                "</div>";
            });
        svg.call(cellsTip);
        var cells = svg.selectAll(".attribute-cell")
            .data(cellsData);

        // Draw diamond path
        //
        // Origin | Order 
        // -------+-------
        //  0     |    4 (closed by `Z`)
        // 0+---> | 1 /\
        //  |     |   \/ 3
        //  V     |   2
        var diamondPath = "M " + 0 + " " + diamondSize + " " +
            "L " + diamondSize + " " + diamondSize*2 + " " +
            "L " + diamondSize*2 + " " + diamondSize + " " +
            "L " + diamondSize + " " + 0 + " " +
            "Z";
        cells.enter().append("path")
            .attr("d", diamondPath)
            .merge(cells)
                .attr("class", function(d) {
                    return (d.incidences > 0) ?
                        "attribute-cell bordered" :
                        "attribute-cell bordered bordered-empty";
                })
                .attr("transform", function(d) {
                    var x = diamondInitialX * self.gridHeight -
                        (1 + diseaseNames.indexOf(d.disease)) * 
                        (diamondSize + cellSizeOffset) +
                        (1 + medicationNames.indexOf(d.medication)) * 
                        (diamondSize + cellSizeOffset);
                    var y = 0 +
                        (1 + medicationNames.indexOf(d.medication)) * 
                        (diamondSize + cellSizeOffset) +
                        (1 + diseaseNames.indexOf(d.disease)) * 
                        (diamondSize + cellSizeOffset);

                    return "translate(" + x + "," + y + ")";
                })
                .style("fill", function(d) {
                    var isPatientAttribute =
                        (patientMedicationNames.indexOf(d.medication) !== -1) &&
                        (patientDiseaseNames.indexOf(d.disease) !== -1);
                    return (d.incidences === 0) ? 
                        "transparent" :
                        (isPatientAttribute) ?
                            colorScaleMarks(d.incidences) :
                            colorScale(d.incidences);
                })
                .on("mouseover", function(d) {
                    if (d.incidences > 0)
                        cellsTip.show(d);

                    self.rendererAddStyle(d);

                    // Marks should be on top of labels,
                    // to avoid occlusion
                    svg.selectAll(".markPresent").moveToFront();
                })
                .on("mouseout", function(d) {
                    cellsTip.hide(d);
                    
                    self.rendererRemoveStyle(d);
                });
        cells.exit().remove();

        visualizations.makeLegend(
                svg,
                colorScale,
                self.gridHeight * 2, 
                self.gridHeight,
                -diamondSize,
                (self.visualizationRenderer.longestDimensionLength + 4) *
                    self.gridHeight);
    };

    HeatMapVisualization.prototype.addSimilarityStyleSelections = function(d) {
        var self = this;

        self.html.forEach(function(element) {
            var svg = element.svg;

            // Style labels
            svg.selectAll(".text-attribute-label")
                .attr("class", function(a) {
                    return ((a === d.first.name) ||
                            (a === d.second.name)) ?
                        "text-attribute-label text-label-selected" :
                        "text-attribute-label text-label";
                });
            svg.selectAll(".rect-attribute-label")
                .style("fill-opacity", 1.0)
                .attr("class", function(a) {
                    return ((a === d.first.name) ||
                            (a === d.second.name)) ?
                        "rect-attribute-label rect-label-selected" :
                        "rect-attribute-label rect-label";
                });

            var cellSizeOffset = self.visualizationRenderer.cellSizeOffset;
            var similarityNames = self.visualizationRenderer.similarityNames;

            var attributeLabels = svg.selectAll(".rect-attribute-label")
                .data(similarityNames);
            var attributeLabelsGroup = attributeLabels.enter();

            // Horizontal guide
            var targetIndex = Math.max(
                similarityNames.indexOf(d.first.name),
                similarityNames.indexOf(d.second.name)
            );
            if (targetIndex !== -1) {
                svg.append("rect")
                    .attr("class", "guide")
                    .attr("height", self.gridHeight)
                    .merge(attributeLabels)
                        .attr("width", function() {
                            return (targetIndex) * self.gridWidth;
                        })
                        .attr("x",
                            self.gridWidth -
                            cellSizeOffset / 2)
                        .attr("y", function() {
                            return (targetIndex - 1) * self.gridHeight -
                                cellSizeOffset / 2;
                        });
            }

            // Vertical guide
            targetIndex = Math.min(
                similarityNames.indexOf(d.first.name),
                similarityNames.indexOf(d.second.name)
            );
            if (targetIndex !== -1) {
                var yLength = similarityNames.length;
                svg.append("rect")
                    .attr("class", "guide")
                    .attr("width", self.gridWidth)
                    .merge(attributeLabels)
                        .attr("height", function() {
                            return (yLength - targetIndex - 1) *
                                self.gridWidth;
                        })
                        .attr("y", function() {
                            return (targetIndex) *
                                self.gridWidth -
                                cellSizeOffset / 2;
                        })
                        .attr("x", function() {
                            return (targetIndex + 1) *
                                self.gridHeight -
                                cellSizeOffset / 2;
                        });
            }

            attributeLabels.exit().remove();

            // Guides should be on back of cells,
            // to allow mouseover on cells
            svg.selectAll(".guide").moveToBack();
        });
    };

    HeatMapVisualization.prototype.removeSimilarityStyleSelections = function(d) {
        var self = this;

        self.html.forEach(function(element) {
            var svg = element.svg;

            // Style labels
            svg.selectAll(".text-attribute-label")
                .attr("class", "text-attribute-label text-label ");
            svg.selectAll(".rect-attribute-label")
                .style("fill-opacity", 0.0);

            // Remove selection guides
            svg.selectAll(".guide")
                .remove();
        });
    };

    HeatMapVisualization.prototype.renderSimilarityMatrix = function(matrixElement) {
        var self = this;

        var svg = matrixElement.svg;
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
        var labelWidth = self.visualizationRenderer
            .longestSimilarityNameLength * 8 + self.gridWidth;

        // Offset for positioning each cell of the grid
        var cellSizeOffset = 4;
        self.visualizationRenderer.cellSizeOffset = cellSizeOffset;

        var attributeLabels = svg.selectAll(".rect-attribute-label")
            .data(similarityNames);
        var attributeLabelsGroup = attributeLabels.enter();
        attributeLabelsGroup.append("rect")
            .attr("class", "rect-attribute-label rect-label")
            .attr("height", self.gridHeight)
            .merge(attributeLabels)
                .attr("width", labelWidth)
                .attr("x", function(d, i) {
                    return (i + 1) * self.gridWidth - 1;
                })
                .attr("y", function(d, i) {
                    return (i - 1) * self.gridHeight - cellSizeOffset + 1;
                })
                .on("mouseover", function(d) {
                    self.rendererAddStyle({
                        first: { name: d },
                        second: { name: d }
                    });
                })
                .on("mouseout", function(d) {
                    self.rendererRemoveStyle(d);
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
                    return (i + 1) * self.gridWidth;
                })
                .attr("y", function(d, i) {
                    return (i - 1) * self.gridHeight - cellSizeOffset;
                })
                .on("mouseover", function(d) {
                    self.rendererAddStyle({
                        first: { name: d },
                        second: { name: d }
                    });
                })
                .on("mouseout", function(d) {
                    self.rendererRemoveStyle(d);
                })
                .text(function(d) {
                    return d;
                });
        attributeLabels.exit().remove();

        // We need text elements to be drawn before knowing how wide they
        // will be. Therefore, we select them again and store their bounding box
        // for later use.
        var textData = [];
        var markSize = self.gridHeight / 2;
        var waitForDOMRendered = function selfFunction() {
            try {
                textData = visualizations.extractBBoxes(
                    svg.selectAll(".text-attribute-label")
                );

                attributeLabels = svg.selectAll(".patient-attribute-mark")
                    .data(similarityNames);
                attributeLabelsGroup = attributeLabels.enter();
                attributeLabelsGroup.append("rect")
                    .attr("class", "patient-attribute-mark markPresent")
                    .attr("width", markSize)
                    .attr("height", markSize)
                    .merge(attributeLabels)
                        .attr("x", function(d, i) {
                            var width = textData[i].width;
                            return (width + 20) +
                                (i + 1) * self.gridWidth;
                        })
                        .attr("y", function(d, i) {
                            return ((i - 1) * self.gridHeight - cellSizeOffset) +
                                (markSize / 2);
                        })
                        .on("mouseover", function(d) {
                            self.rendererAddStyle({
                                first: { name: d },
                                second: { name: d }
                            });
                        })
                        .on("mouseout", function(d) {
                            self.rendererRemoveStyle(d);
                        })
                        .style("fill-opacity", function(d, i) {
                            return (patientSimilarityNames
                                    .indexOf(textData[i].name) !== -1) ? 1 : 0;
                        });
                attributeLabels.exit().remove();
            } catch(e) {
                window.requestAnimationFrame(selfFunction);
            }
        };
        waitForDOMRendered();

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
            .offset([60, -10])
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
            .attr("width", self.gridWidth - cellSizeOffset)
            .attr("height", self.gridHeight - cellSizeOffset)
            .merge(cells)
                .attr("class", function(d) {
                    return (d.incidences > 0) ?
                        "attribute-cell bordered" :
                        "attribute-cell bordered bordered-empty";
                })
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
                        ((patientMedicationNames.indexOf(d.first.name) !== -1) ||
                        (patientDiseaseNames.indexOf(d.first.name) !== -1)) &&
                        ((patientMedicationNames.indexOf(d.second.name) !== -1) ||
                        (patientDiseaseNames.indexOf(d.second.name) !== -1));
                    return (d.incidences === 0) ? 
                        "transparent" :
                        (isPatientAttribute) ?
                            colorScaleMarks(d.incidences) :
                            colorScale(d.incidences);
                })
                .on("mouseover", function(d) {
                    if (d.incidences > 0)
                        cellsTip.show(d);

                    self.rendererAddStyle(d);

                    // Marks should be on top of labels,
                    // to avoid occlusion
                    svg.selectAll(".markPresent").moveToFront();
                })
                .on("mouseout", function(d) {
                    cellsTip.hide(d);
                    
                    self.rendererRemoveStyle(d);
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

    HeatMapVisualization.prototype.isAttributeTypeActive = function(type) {
        return this.currentAttributeType === type;
    };

    HeatMapVisualization.prototype.getAttributeTypes = function(type) {
        return attributeType;
    };

    HeatMapVisualization.prototype.setCurrentAttributeType = function(type) {
        this.currentAttributeType = type;
    };

    var modificationType = Object.freeze({
        NONE: "none",
        DATA: "data",
        FILTERS: "filters"
    });

    HeatMapVisualization.prototype.isModificationTypeActive = function(type) {
        return this.currentModificationType === type;
    };

    HeatMapVisualization.prototype.getModificationTypes = function(type) {
        return modificationType;
    };

    HeatMapVisualization.prototype.setCurrentModificationType = function(type) {
        this.currentModificationType = type;
    };

    // NOTE: We want the called methods to have their `this` as the created
    // `HeatMapVisualization` object. Since using bind() here would be too
    // tricky, we simple have a property on the `HeatMapVisualization` object
    // for each dynamic function
    var renderer = Object.freeze({
        DIM: HeatMapVisualization.prototype.render2DimensionalMatrix,
        SIM: HeatMapVisualization.prototype.renderSimilarityMatrix
    });
    var rendererAddStyle = Object.freeze({
        DIM: HeatMapVisualization.prototype.addDiamondStyleSelections,
        SIM: HeatMapVisualization.prototype.addSimilarityStyleSelections
    });
    var rendererRemoveStyle = Object.freeze({
        DIM: HeatMapVisualization.prototype.removeDiamondStyleSelections,
        SIM: HeatMapVisualization.prototype.removeSimilarityStyleSelections
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
        } else {
            d3.select("#" + self.targetElement).selectAll("svg")
                .attr("height",
                    (self.visualizationRenderer.longestDimensionLength * 1.5 *
                    self.gridHeight) +
                    self.margin.top + self.margin.bottom);
        }
        self.html.forEach(function(element) {
            self.renderer(element);
        });
    };

    HeatMapVisualization.prototype.remove = function(nodeID, vizID, matrixElement) {
        var self = this;

        var svg = matrixElement.svg;
        svg.selectAll(".text-attribute-label")
            .remove();
        svg.selectAll(".rect-attribute-label")
            .remove();
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
            self.remove(nodeID, vizID, element);
        });

        // Add attributes and svgs to the new DOM targets. Note that the target
        // element ID is still the same.
        self.makeSVG(nodeID, vizID);

        // Render paths, reusing data stored in the visualization object
        self.render();
    };

    HeatMapVisualization.prototype.isRendererActive = function(type) {
        return this.renderer === renderer[type];
    };

    HeatMapVisualization.prototype.switchRenderer = function(nodeID, vizID, type) {
        var self = this;

        self.renderer = renderer[type];
        self.rendererAddStyle = rendererAddStyle[type];
        self.rendererRemoveStyle = rendererRemoveStyle[type];

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

    HeatMapVisualization.prototype.makeFilters = function(
            nodeID, vizID, filterNames) {
        if (filterNames.indexOf('age') !== -1) {
            visualizations.filterAge.add(nodeID, vizID);
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
        if (state.filters) {
            self.makeFilters(nodeID, vizID, state.filters);
            return;
        }

        self.populate(nodeID, vizID);
    };

    visualizations.validateInterface(
        HeatMapVisualization.prototype, "HeatMapVisualization"
    );

    return HeatMapVisualization;
}]);
