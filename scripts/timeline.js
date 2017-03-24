var moduleVisualizations = angular.module('moduleVisualizations');

moduleVisualizations.directive('directiveTimelineTooltip', function() {
    return {
        link: function (scope, element, attrs) {
            scope.setTooltipText = function(button) {
                scope.tooltipText = 
                    "<div style=\"text-align: left\" class=\"p\">" +
                        "Encontre atributos sequenciais ou sobrepostos " +
                        "ao longo da história clínica do paciente actual." +
                    "</div>";
            };
        }
    };
});

moduleVisualizations.directive('directiveTimelineEvolutionTooltip', function() {
    return {
        link: function (scope, element, attrs) {
            scope.setTooltipText = function(button) {
                scope.tooltipText = 
                    "<div style=\"text-align: left\" class=\"p\">" +
                        "Legenda: " +
                        "<br/>" +
                        "<span class=\"badge occurence-disease\"><b>D</b></span> = Doença" +
                        "<br/>" +
                        "<span class=\"badge occurence-medication\"><b>M</b></span> = Medicação" +
                    "</div>";
            };
        }
    };
});

moduleVisualizations.directive('directiveTimelineGraphTooltip', function() {
    return {
        link: function (scope, element, attrs) {
            scope.setTooltipText = function(button) {
                scope.tooltipText = 
                    "<div style=\"text-align: left\" class=\"p\">" +
                        "<b>Ligações mais curtas</b> " +
                        "correspondem a atributos com " +
                        "mais ocurrências simultâneas." +
                    "</div>";
            };
        }
    };
});

moduleVisualizations.factory('TimelineVisualization',
        ['visualizations', 'patientData', 'retrievePatientData', 'utils', 'nodes', 'timeWeaver',
        function(visualizations, patientData, retrievePatientData, utils, nodes, timeWeaver) {
    var TimelineVisualization = function(options) {
        // Patient attribute lists
        this.patientLists = {
            diseases: filterByPatientAttributes(
                options.diseases, 'diseases'),
            medications: filterByPatientAttributes(
                options.medications, 'medications')
        };
        this.patientLists.selectedDiseases =
            visualizations.processSelectedListToObjects(
                this.patientLists.diseases);
        this.patientLists.selectedMedications =
            visualizations.processSelectedListToObjects(
                this.patientLists.medications);

        this.currentAttributeType = attributeType.DISEASES;
        this.currentModificationType = modificationType.DATA;

        // Specific state is maintained in a separate object,
        // which we will use in our facade
        this.visualizationRenderer = null;

        this.attributeData = null;
        this.binning = null;
        this.hasData = true;
    };

    // Unique identifier
    var timelineID = 0;
    TimelineVisualization.prototype.makeID = function() {
        timelineID++;
        return "timeline-" + timelineID;
    };

    var filterByPatientAttributes = function(list, listName) {
        var self = this;

        var patient = patientData.getAttribute(patientData.KEY_PATIENT);
        return list.filter(function(obj) {
            return (utils.arrayObjectIndexOf(
                patient[listName],
                obj.name,
                "name")) !== -1;
        });
    };

    TimelineVisualization.prototype.addSelections = function(d) {
        var self = this;

        var svg = self.html.mainHTML;

        // Style labels
        svg.selectAll(".attribute-month-label")
            .attr("class", function(a) {
                return (a === d) ?
                    "attribute-month-label text-label-selected" :
                    "attribute-month-label text-label";
            });
        svg.selectAll(".attribute-month-rect-label")
            .style("fill-opacity", 1.0)
            .attr("class", function(a) {
                return (a === d) ?
                    "attribute-month-rect-label rect-label-selected" :
                    "attribute-month-rect-label rect-label";
            });

        // Style nodes
        self.html.graphSVG.selectAll(".attribute-graph-node")
            .attr("class", function(a, b) {
                return (a.id === d) ?
                    "attribute-graph-node occurence-selected" :
                    "attribute-graph-node " + 
                        self.classByAttribute({name: a.id}, b);
            });
    };

    TimelineVisualization.prototype.removeSelections = function(d) {
        var self = this;

        var svg = self.html.mainHTML;

        // Style labels
        svg.selectAll(".attribute-month-label")
            .attr("class", "attribute-month-label text-label ");
        svg.selectAll(".attribute-month-rect-label")
            .style("fill-opacity", 0.0);

        // Style nodes
        self.html.graphSVG.selectAll(".attribute-graph-node")
            .attr("class", function(a, b) {
                return "attribute-graph-node " + 
                    self.classByAttribute({name: a.id}, b);
            });
    };

    TimelineVisualization.prototype.makeDescription = function(elementID) {
        if (elementID === undefined) {
            console.log("[WARN] @make: undefined id.");
            return;
        }
        
        return '<p class="viz-title">' +
                'Interacção temporal entre atributos' +
                '  ' +
                '<img class="tooltip-wrapper help" ' +
                    'title="{{tooltipText}}" ' + 
                    'directive-tooltip directive-timeline-tooltip ' +
                    'src="images/controls/info.svg">' +
                '</img>' +
                '</p>';
    };

    TimelineVisualization.prototype.make = function(elementID, timelineID) {
        var self = this;

        if (elementID === undefined) {
            console.log("[WARN] @make: undefined id.");
            return;
        }

        // Compute size based on available view dimensions
        self.vizWidth = angular.element('#' + elementID)[0]
            .offsetWidth;

        self.padding = 60;
        self.labelPadding = 10;
        var marginFromLabels = 
            self.padding + self.labelPadding * 2;

        // Group for main visualization
        var mainHTML = d3.select("#" + timelineID + "-main");


        var graphTitleDiv = d3.select("#" + timelineID + "-graph")
            .append("div")
                .attr("id", "graph-title-div")
                .style("display", "inline-block");
        graphTitleDiv
            .append("div")
                .attr("id", "graph-title")
                .style("display", "inline-block")
                .style('margin-left',
                    marginFromLabels / 4 + "px");
        graphTitleDiv
            .append("div")
                .attr("id", "graph-title-tooltip")
                .style("display", "inline-block")
                .style('margin-left',
                    5 + "px");

        // Group for graph visualization
        self.graphSize = 300;
        var graphSVG = d3.select("#" + timelineID + "-graph")
            .append("div")
                .attr("id", "graph-div")
                .style('margin-left', marginFromLabels / 4 + "px")
                .append("svg")
                    .attr("id", "svg-graph")
                    .attr("width", self.graphSize)
                    .attr("height", self.graphSize)
                    .append("g")
                        .attr("id", "graph");

        // Group for occurences histogram
        d3.select("#" + timelineID + "-details")
            .append("div")
                .attr("id", "occurences-title")
                .style('margin-left',
                    marginFromLabels + "px");
        var occurencesSVG = d3.select("#" + timelineID + "-details")
            .append("div")
                .style("display", "inline-block")
                .append("svg")
                    .attr("id", "svg-occurences")
                    .attr("width", self.vizWidth - 
                        self.graphSize - self.padding / 2)
                    .attr("height", 0) // Set dynamically
                    .append("g")
                        .attr("id", "occurences")
                        .attr("transform", "translate(" +
                            // Offset for month text labels
                            marginFromLabels + "," + 0 + ")");

        d3.select("#" + timelineID + "-details")
            .append("div")
                .attr("id", "evolution-title")
                .style("display", "inline-block")
                .style('margin-left',
                    marginFromLabels + "px");
        d3.select("#" + timelineID + "-details")
            .append("div")
                .attr("id", "evolution-title-tooltip")
                .style("display", "inline-block")
                .style('margin-left',
                    5 + "px");

        self.html = {
            elementID: elementID,
            timelineID: timelineID,
            occurencesSVG: occurencesSVG,
            graphSVG: graphSVG,
            mainHTML: mainHTML
        };

        self.makeBins();
    };

    TimelineVisualization.prototype.makeBins = function() {
        var data = null;

        // FIXME: Element creation should be splitted up, so we don't
        // have to remake everything
        this.remove();

        this.populate(data, timelineID);
    };

    TimelineVisualization.prototype.classByAttribute = function(d, i) {
        var self = this;

        var isDisease = (utils.arrayObjectIndexOf(
                self.patientLists.selectedDiseases,
                d.name,
                "name") !== -1);
        return isDisease ?
            "occurence-disease" :
            "occurence-medication";
    };

    TimelineVisualization.prototype.render = function() {
        var self = this;

        var classByAttribute = function(d, i) {
            return self.classByAttribute(d, i);
        };

        var classByMedication = function(d, i) {
            var isNonMedicated = ((utils.arrayObjectIndexOf(
                self.patientLists.selectedDiseases,
                d.name,
                "name") !== -1) && (d.overlapIndex === 0));
            return isNonMedicated ?
                ("attribute-occurence " + "attribute-occurence-warning") :
                ("attribute-occurence " + classByAttribute(d, i));
        };

        // Set titles for each visualization
        d3.select("#" + self.html.timelineID + "-details")
            .select("#occurences-title")
                .html('<h4><b>' +
                        'Contagem de <br/>ocorrências <br/>simultâneas' +
                    '</b></h4>');
        d3.select("#" + self.html.timelineID + "-details")
            .select("#evolution-title")
                .html('<h4><b>' +
                        'Evolução <br/>temporal' +
                    '</b></h4>');
        d3.select("#" + self.html.timelineID + "-details")
            .select("#evolution-title-tooltip")
                .html('<img class="tooltip-wrapper help" ' +
                        'title="{{tooltipText}}" ' + 
                        'custom-placement="right" ' + 
                        'directive-tooltip directive-timeline-evolution-tooltip ' +
                        'src="images/controls/info.svg">' +
                    '</img>');
        d3.select("#" + self.html.timelineID + "-graph")
            .select("#graph-title")
                .html('<h4><b>' +
                        'Relações </br>entre atributos' +
                    '</b></h4>');
        d3.select("#" + self.html.timelineID + "-graph")
            .select("#graph-title-tooltip")
                .html('<img class="tooltip-wrapper help" ' +
                        'title="{{tooltipText}}" ' + 
                        'custom-placement="bottom" ' + 
                        'directive-tooltip directive-timeline-graph-tooltip ' +
                        'src="images/controls/info.svg">' +
                    '</img>');

        var recordedDosage = 
            self.visualizationRenderer.recordedDosage;
        var recordedFrequency = 
            self.visualizationRenderer.recordedFrequency;

        /*
         * @property {
         *   name:string,
         *   dataIndex:number
         *   overlapIndex:number
         * } matrixDates: 
         * occurence dates, stored as a dictionary of years,
         * each with an array of months.
         * - name: Abreviated month name, used as label in svg;
         * - dataIndex: corresponding dosage/frequency index
         * - overlapIndex: corresponding occurence count index
         */
        var matrixDates = {};

        var graphPairOccurences = [];
        var graphNames = [];

        // Store overlaps by frequency;
        // Each frequency can have many incidences by time range,
        // identified by 2 dates & a subset of attributes present.
        var maxOverlapCount = 0;
        var overlaps = [];
        var lastDosage;
        var lastFrequency;
        for (var i = 0;
                i < recordedFrequency.length;
                i++) {
            var overlapCount =
                recordedDosage[i].length;

            // NOTE: Index needs to be corrected, since length is >= 1
            var overlapIndex = overlapCount - 1;
            if (overlapCount > 1) {
                // Update maximum
                if (maxOverlapCount < overlapCount) {
                    maxOverlapCount = overlapCount;
                }
            }

            // Range started: make new object to compare
            if (!lastDosage || !lastFrequency) {
                lastDosage = {
                    start: utils.extend(recordedDosage[i], [])
                };
                lastFrequency = {
                    start: utils.extend(recordedFrequency[i], [])
                };
            } else {
                var endMoment;
                var endMonth;
                var endMonthName;
                var endYear;

                // Extract information for range end checks;
                // We need to compare all names in current dosage 
                // with the last one.
                var lastNames = lastDosage.start.map(function(obj) {
                    return obj.name;
                });
                var namesToCompare = lastNames.slice();
                var areNamesDifferent = false;
                for (var dosageIndex = 0;
                        dosageIndex < recordedDosage[i].length;
                        dosageIndex++) {
                    var name = recordedDosage[i][dosageIndex].name;

                    // Store longest name, for label styling
                    if (self.visualizationRenderer.longestNameLength <
                            name.length) {
                        self.visualizationRenderer.longestNameLength =
                            name.length;
                    }

                    // Mismatch: There are more names in recorded dosage
                    if (namesToCompare.length === 0) {
                        areNamesDifferent = true;
                    }
                    if (namesToCompare.indexOf(name) !== -1) {
                        namesToCompare.splice(name, 1);
                    }
                }

                // We also need to see if we have data in the current month
                // before starting a new one, so we don't miss any data
                var isMonthEndingWithoutData = false;
                var nextIndex = i + 1;
                if(nextIndex < recordedFrequency.length) {
                    endMoment = moment(recordedFrequency[i]);
                    endMonth = endMoment.month();
                    endYear = endMoment.year();
                    var nextFrequency = recordedFrequency[i+1];
                    var nextMonth = moment(nextFrequency).month();

                    // Is month changing next date?
                    if (endMonth !== nextMonth) {
                        // Was data stored for the current month?
                        if (!matrixDates[endYear] || 
                                !matrixDates[endYear][endMonth]) {
                            // NOTE: Force range end only for diseases, 
                            // because they won't be medicated.
                            var areAllNamesDiseases = true;
                            lastNames.forEach(function(name) {
                                if (utils.arrayObjectIndexOf(
                                        self.patientLists.selectedMedications,
                                        name,
                                        "name") !== -1) {
                                    areAllNamesDiseases = false;
                                }
                            });
                            isMonthEndingWithoutData = areAllNamesDiseases;
                        }
                    }
                }

                // Check if range ended
                if (isMonthEndingWithoutData ||
                        areNamesDifferent ||
                        (namesToCompare.length !== 0) ||
                        (i === recordedFrequency.length - 1)) {
                    if (overlaps[overlapIndex]) {
                        overlaps[overlapIndex].value += 1;
                    } else {
                        overlaps[overlapIndex] = {
                            dosages: [],
                            frequencies: [],
                            value: 1
                        };
                    }
                    lastDosage.end = utils.extend(recordedDosage[i], []);
                    overlaps[overlapIndex].dosages.push(lastDosage);
                    lastFrequency.end = utils.extend(recordedFrequency[i], []);
                    overlaps[overlapIndex].frequencies.push(lastFrequency);

                    // Save end data for matrix population
                    // NOTE: month index starts at 0
                    endMoment = moment(lastFrequency.end);
                    endMonth = endMoment.month();
                    endMonthName = endMoment.format('MMM');
                    endYear = endMoment.year();
                    if (!matrixDates[endYear]) {
                        matrixDates[endYear] = {};
                    }
                    if (!matrixDates[endYear][endMonth]) {
                        matrixDates[endYear][endMonth] = {
                            attributeNames: [],
                            data: [],
                            name: endMonthName
                        };
                    }

                    // Make object for this month's overlap
                    var newAttributeNames =
                        lastDosage.end.map(function(obj) {
                            return obj.name;
                        });
                    matrixDates[endYear][endMonth].data.push({
                        attributeNames: newAttributeNames.slice(),
                        dataIndex: i,
                        dates: utils.extend(lastFrequency, {}),
                        overlapIndex: overlapIndex,
                    });

                    // Update names seen in month
                    var oldAttributeNames =
                        matrixDates[endYear][endMonth].attributeNames;
                    matrixDates[endYear][endMonth].attributeNames =
                        oldAttributeNames.concat(
                            newAttributeNames.filter(function (item) {
                                return oldAttributeNames.indexOf(item) < 0;
                            }));

                    // Range ended: reset object to compare
                    lastDosage = {
                        start: utils.extend(recordedDosage[i], [])
                    };
                    lastFrequency = {
                        start: utils.extend(recordedFrequency[i], [])
                    };

                    // Use seen attributes to make data for graph;
                    // We keep track of all possible pairs of attributes,
                    // counting how many overlaps each pair has.
                    var length = newAttributeNames.length;
                    if (length > 1) {
                        for (var firstNameIndex = 0;
                                firstNameIndex < (length - 1);
                                firstNameIndex++) {
                            for (var secondNameIndex = 0;
                                    secondNameIndex < length;
                                    secondNameIndex++) {
                                    if (firstNameIndex === secondNameIndex) {
                                        continue;
                                    }

                                    var newPair = [
                                        newAttributeNames[firstNameIndex],
                                        newAttributeNames[secondNameIndex]
                                    ];
                                    var pairIndex = utils.arrayObjectFullIndexOf(
                                        graphPairOccurences,
                                        newPair,
                                        ['firstName', 'secondName']);

                                    // Try with other order
                                    if (pairIndex === -1) {
                                        pairIndex = utils.arrayObjectFullIndexOf(
                                                graphPairOccurences,
                                                newPair,
                                                ['secondName', 'firstName']);
                                    }

                                    if (pairIndex === -1) {
                                        graphPairOccurences.push({
                                            firstName: newPair[0],
                                            secondName: newPair[1],
                                            incidences: 1,
                                        });
                                    } else {
                                        graphPairOccurences[pairIndex]
                                            .incidences += 1;
                                    }
                            }
                        }
                    }

                    // We need to know all the attribute names in order to
                    // build IDs for nodes
                    graphNames = graphNames.concat(
                        matrixDates[endYear][endMonth].attributeNames
                            .filter(function(item) {
                                return graphNames.indexOf(item) < 0;
                            }));
                }
            }
        }

        maxOverlapCount = Math.max(maxOverlapCount, 1);
        var dataHistogramCounts = Array
            .apply(null, Array(maxOverlapCount))
            .map(Number.prototype.valueOf, 0);
        for (i = 0; i < maxOverlapCount; i++) {
            dataHistogramCounts[i] = overlaps[i].value;
        }

        var histogramHeight = 40;

        var vizContentWidth = Math.min(
            self.vizWidth,
            (histogramHeight / 1.75) * maxOverlapCount
        );

        //
        // occurences axis
        //
        var x2 = d3.scaleLinear().range([0, vizContentWidth]);
        x2.domain([0, maxOverlapCount]);
        var xAxis = d3.axisBottom(x2)
            .ticks(maxOverlapCount)
            .tickFormat(d3.format("d"));
        var axisHeight = histogramHeight;
        self.html.occurencesSVG.selectAll(".line-axis").remove();
        self.html.occurencesSVG.append("g")
            .attr("class", "x axis line-axis")
            .attr("height", axisHeight)
            .attr("transform", "translate(" +
                0 + "," +
                (axisHeight + self.labelPadding / 2) + ")")
            .call(xAxis);

        //
        // occurences bars
        //
        var histogramBarPadding = 0.2;
        var x = d3.scaleBand().range([0, vizContentWidth + 1])
                .padding(histogramBarPadding),
            y = d3.scaleLinear().range([histogramHeight, 0]);

        var data = dataHistogramCounts;
        x.domain(data.map(function(d, i) { return i; }));
        var maxY = d3.max(data, function(d) { return d; });
        y.domain([0, maxY]);


        var barsTip = d3.tip()
            .attr('class', 'tooltip tooltip-element tooltip-d3')
            .offset([-10, 0])
            .direction('n')
            .html(function(d, i) {
                return "<div style=\"text-align: center\">" +
                    "<span><b>" + d + "</b> ocorrências <br/>" + 
                        ((i === 0) ?
                            "isoladas" :
                            "sobrepostas " + (i + 1) + " a " + (i + 1)
                        ) + "</span>" +
                "</div>";
            });
        self.html.occurencesSVG.call(barsTip);

        var cellSize = Math.ceil(x.bandwidth());
        var cellSizeOffset = histogramBarPadding * 10 * 2;
        var cellSizeWithOffset = cellSize + cellSizeOffset;

        var g = self.html.occurencesSVG.append("g")
            .attr("height", histogramHeight);
        var histogram = g.selectAll(".histogram")
            .data(data);
        var histogramGroup = histogram.enter();
        histogramGroup.append("rect")
            .attr("class", "filter-bar")
            .merge(histogram)
                .attr("x", function(d, i) { return x(i); })
                .attr("y", function(d) { return y(d); })
                .attr("width", cellSize)
                .attr("height", function(d) { return histogramHeight - y(d); });
        histogramGroup.append("rect")
            .attr("class", "filter-bar-overlay")
            .attr("fill", "transparent")
            .merge(histogram)
                .attr("x", function(d, i) { return x(i); })
                .attr("y", function(d) { return 0; })
                .attr("width", cellSize)
                .attr("height", function(d) { return histogramHeight; })
                .on("mouseover", function(d, i) {
                    g.selectAll(".filter-bar")
                        .attr("class", function(a, b) {
                            return (i === b) ?
                                "filter-bar filter-selected" :
                                "filter-bar";
                        });

                    barsTip.show(d, i);
                })
                .on("mouseout", function(d, i) {
                    barsTip.hide(d, i);

                    g.selectAll(".filter-bar")
                        .attr("class", "filter-bar");
                });

        // Adjust svg sizes
        d3.select("#timeline-" + timelineID + "-details")
            .select("svg")
                .attr("height", histogramHeight + 25);

        //
        // Matrix
        //

        var longestMatrixWidth = 0;
        var longestOccurenceIndex = 0;
        var maxIncidencesCount = 0;

        // Extract attributes in each month
        for (var year in matrixDates) {
            if (matrixDates.hasOwnProperty(year)) {
                // Make year layout
                var yearHTML = self.html.mainHTML.append("div");
                var yearBinsHTML = yearHTML.append("div")
                    .style("display", "inline-block")
                    .attr("id", "viz-div-" + year);
                yearBinsHTML.append("div")
                    .style("display", "inline-block")
                    .style("float", "left")
                    .style("margin-right", self.labelPadding + "px")
                    .style("width", self.padding / 2 + "px")
                    .html(year);
                yearBinsHTML = yearBinsHTML.append("div")
                    .style("float", "right");
                yearHTML.append("div")
                    .html('<div class="custom-separator"></div>');

                // Make month bins
                for (var month in matrixDates[year]) {
                    if (!matrixDates[year].hasOwnProperty(month))
                        continue;

                    // Make month matrix
                    var monthName = matrixDates[year][month].name;
                    var monthHTML = yearBinsHTML.append("div")
                        .attr("id", "viz-div-" + year + "-" + month);
                    monthHTML.append("div")
                        .style("display", "inline-block")
                        .style("float", "left")
                        .style("margin-right", self.labelPadding + "px")
                        .style("width", self.padding / 2 + "px")
                        .html(monthName);

                    var labelWidth = self.visualizationRenderer
                        .longestNameLength * 8;
                    var attributeNames = 
                        matrixDates[year][month].attributeNames;
                    var monthDiv = monthHTML.append("div")
                        .style("display", "inline-block")
                        .append("svg")
                            .attr("class", "viz-svg-contents")
                            .attr("height", cellSizeWithOffset *
                                attributeNames.length);
                    var monthSVG = monthDiv.append("g")
                        .attr("id", "viz-svg-" + year + "-" + month);
                    var monthEvolutionSVG = monthDiv.append("g")
                        .attr("class", "viz-evolution")
                        .attr("id", "viz-evolution-svg-" + year + "-" + month);

                    var monthCellsRectLabels = monthSVG
                        .selectAll(".attribute-month-rect-label")
                        .data(attributeNames);
                    monthCellsRectLabels.enter().append("rect")
                        .attr("class", "attribute-month-rect-label rect-label")
                        .merge(monthCellsRectLabels)
                            .attr("width", labelWidth)
                            .attr("height", cellSizeWithOffset)
                            .attr("x", function(d, i) {
                                return (maxOverlapCount + 1) *
                                    cellSizeWithOffset;
                            })
                            .attr("y", function(d, i) {
                                return i * 
                                    cellSizeWithOffset;
                            })
                            .on("mouseover", function(d) {
                                self.addSelections(d);
                            })
                            .on("mouseout", function(d) {
                                self.removeSelections(d);
                            });
                    monthCellsRectLabels.exit().remove();

                    var monthCellsLabels = monthSVG
                        .selectAll(".attribute-month-label")
                        .data(attributeNames);
                    monthCellsLabels.enter().append("text")
                        .attr("class", "attribute-month-label text-label")
                        .merge(monthCellsLabels)
                            .attr("x", function(d, i) {
                                return (maxOverlapCount + 1) *
                                    cellSizeWithOffset + 
                                    // Align with rect
                                    cellSizeOffset;
                            })
                            .attr("y", function(d, i) {
                                return i * 
                                    cellSizeWithOffset + cellSize -
                                    cellSizeOffset;
                            })
                            .on("mouseover", function(d) {
                                self.addSelections(d);
                            })
                            .on("mouseout", function(d) {
                                self.removeSelections(d);
                            })
                            .text(function(d) {
                                return d;
                            });
                    monthCellsLabels.exit().remove();

                    // Flatten data, so that we draw as many cells as
                    // overlapped attributes in the month
                    var monthObj = matrixDates[year][month];
                    var monthFlatData = [];
                    var monthFlatEvolutionData = [];
                    for (var monthDataIndex in monthObj.data) {
                        var dataInMonthObj = monthObj.data[monthDataIndex];
                        var count = dataInMonthObj.attributeNames.length;
                        for (var nameIndex in dataInMonthObj.attributeNames) {
                            var currentIncidences;
                            var nameInMonthObj = 
                                dataInMonthObj.attributeNames[nameIndex];
                            var flatDataIndex = utils.arrayObjectFullIndexOf(
                                monthFlatData,
                                [count, nameInMonthObj],
                                ['count', 'name']);
                            if (flatDataIndex === -1) {
                                monthFlatData.push({
                                    count: count,
                                    incidences: 1,
                                    name: nameInMonthObj
                                });
                                currentIncidences = 1;
                            } else {
                                monthFlatData[flatDataIndex].incidences += 1;
                                currentIncidences = 
                                    monthFlatData[flatDataIndex].incidences;
                            }

                            if (maxIncidencesCount < currentIncidences) {
                                maxIncidencesCount = currentIncidences;
                            }

                            var occurenceIndex = +monthDataIndex;
                            if (longestOccurenceIndex < occurenceIndex) {
                                longestOccurenceIndex = occurenceIndex;
                            }

                            monthFlatEvolutionData.push({
                                count: count,
                                attributeNames: dataInMonthObj.attributeNames,
                                occurenceIndex: occurenceIndex,
                                dataIndex: dataInMonthObj.dataIndex,
                                dates: dataInMonthObj.dates,
                                overlapIndex: dataInMonthObj.overlapIndex,
                                name: nameInMonthObj
                            });
                        }
                    }

                    var cellTip = d3.tip()
                        .attr('class', 'tooltip tooltip-element tooltip-d3')
                        .offset([-10, 0])
                        .direction('n')
                        .html(function(d, i) {
                            return "<div style=\"text-align: left\">" +
                                "<b>Ocorrências: </b>" + 
                                    d.incidences + 
                            "</div>";
                        });
                    monthSVG.call(cellTip);

                    // Make cells
                    var attributesInMonth = monthObj.attributeNames;
                    var monthCells = monthSVG
                        .selectAll(".attribute-month")
                        .data(monthFlatData);
                    monthCells.enter().append("rect")
                        .attr("class", "attribute-month filter-crisp filter-mouseover")
                        .attr("width", cellSize)
                        .attr("height", cellSize)
                        .merge(monthCells)
                            .attr("x", function(d, i) {
                                return (d.count - 1) *
                                    cellSizeWithOffset + cellSizeOffset;
                            })
                            .attr("y", function(d) {
                                return attributeNames.indexOf(d.name) * 
                                    cellSizeWithOffset;
                            })
                            .on("mouseover", function(d, i) {
                                cellTip.show(d, i);
                            })
                            .on("mouseout", function(d, i) {
                                cellTip.hide(d, i);
                            });
                    monthCells.exit().remove();

                    var evolutionTip = d3.tip()
                        .attr('class', 'tooltip tooltip-element tooltip-d3')
                        .offset([-10, 0])
                        .direction('n')
                        .html(function(d, i) {
                            var isNonMedicated = ((utils.arrayObjectIndexOf(
                                self.patientLists.selectedDiseases,
                                d.name,
                                "name") !== -1) && (d.overlapIndex === 0));
                            return "<div style=\"text-align: left\">" +
                                "<b>Início: </b>" + 
                                    moment(d.dates.start).format("YYYY/MM/DD") + 
                                "<br/>" +
                                "<b>Fim: </b>" +
                                    moment(d.dates.end).format("YYYY/MM/DD") + 
                                ((isNonMedicated) ?
                                    ("<br/>" + "<span class=\"label label-danger\"><b>Doença não medicada</b></span>") :
                                    ""
                                ) +
                            "</div>";
                        });
                    monthEvolutionSVG.call(evolutionTip);

                    // Align evolution group with matrix group
                    // by bounding box
                    var waitForDOMRendered = function selfFunction() {
                        try {
                            var textData = visualizations.extractBBoxes(
                                monthSVG
                            );
                            var offsetWidth = textData[0].width;
                            if (longestMatrixWidth < offsetWidth) {
                                longestMatrixWidth = offsetWidth;
                            }

                            // Make evolution
                            var monthEvolution = monthEvolutionSVG
                                .selectAll(".attribute-occurence occurence-mouseover")
                                .data(monthFlatEvolutionData);
                            var monthEvolutionEnter = monthEvolution.enter();
                            var monthEvolutionEnterGroup = monthEvolutionEnter
                                .append("g");
                            monthEvolutionEnterGroup.append("circle")
                                .attr("class", classByMedication)
                                .attr("r", cellSize / 2)
                                .merge(monthEvolution)
                                    .attr("cx", function(d, i) {
                                        return d.occurenceIndex *
                                            cellSizeWithOffset + cellSizeOffset;
                                    })
                                    .attr("cy", function(d) {
                                        return attributeNames.indexOf(d.name) * 
                                            cellSizeWithOffset + cellSizeOffset;
                                    });
                            monthEvolutionEnterGroup.append("text")
                                .attr("class", "occurence-warning")
                                .merge(monthEvolution)
                                    .attr("dx", function(d, i) {
                                        return d.occurenceIndex *
                                            cellSizeWithOffset;
                                    })
                                    .attr("dy", function(d, i) {
                                        return attributeNames.indexOf(d.name) * 
                                            cellSizeWithOffset + cellSizeOffset * 2;
                                    })
                                    .text(function(d, i) {
                                        var isDisease =
                                            (utils.arrayObjectIndexOf(
                                                self.patientLists
                                                    .selectedDiseases,
                                                d.name,
                                                "name") !== -1);
                                        var isNonMedicated = (isDisease && 
                                            (d.overlapIndex === 0));
                                        return isNonMedicated ? "!" : 
                                            isDisease ? "D" : "M";
                                    });
                            monthEvolutionEnterGroup.append("circle")
                                .attr("class", "attribute-occurence-overlay")
                                .attr("fill", "transparent")
                                .attr("r", cellSize / 2)
                                .merge(monthEvolution)
                                    .attr("cx", function(d, i) {
                                        return d.occurenceIndex *
                                            cellSizeWithOffset + cellSizeOffset;
                                    })
                                    .attr("cy", function(d) {
                                        return attributeNames.indexOf(d.name) * 
                                            cellSizeWithOffset + cellSizeOffset;
                                    })
                                    .on("mouseover", function(d, i) {
                                        evolutionTip.show(d, i);

                                        d3.select(this.parentNode)
                                            .selectAll(".attribute-occurence")
                                            .attr("class", function(a) {
                                                var isSame = 
                                                    (a.dataIndex == d.dataIndex) &&
                                                    (a.name == d.name);
                                                return (isSame) ? 
                                                    classByMedication(a, i) +
                                                        " occurence-selected" :
                                                    classByMedication(a, i);
                                            });
                                    })
                                    .on("mouseout", function(d, i) {
                                        evolutionTip.hide(d, i);

                                        d3.select(this.parentNode)
                                            .selectAll(".attribute-occurence")
                                            .attr("class", classByMedication);
                                    });
                            monthEvolution.exit().remove();
                        } catch(e) {
                            window.requestAnimationFrame(selfFunction);
                        }
                    };
                    waitForDOMRendered();
                }
            }
        }

        //
        // Matrix cells fill
        //
        var colorScale = d3.scaleQuantile()
            .domain([0, visualizations.colors.length - 1,
                    maxIncidencesCount])
            .range(visualizations.colors);
        d3.select("#" + self.html.timelineID + "-main")
            .selectAll(".attribute-month")
                .attr("fill", function(d, i) {
                    return colorScale(d.incidences);
                });

        //
        // Matrix legend
        //
        var legendSVG = self.html.mainHTML.append("svg")
            .attr("width", maxIncidencesCount * (cellSize * 2))
            .attr("height", (cellSize * 2));

        visualizations.makeLegend(
            legendSVG, 
            colorScale, 
            cellSize * 2, 
            cellSize,
            0,
            cellSize / 2);

        // Align elements from dynamic sizes
        d3.selectAll(".viz-svg-contents")
            .attr("width", longestMatrixWidth +
                ((longestOccurenceIndex + 1) *
                    cellSizeWithOffset + cellSizeOffset) +
                self.labelPadding);
        d3.select("#svg-occurences")
            .attr("width", longestMatrixWidth + 
                cellSizeWithOffset);
        d3.selectAll(".viz-evolution").attr("transform", "translate(" +
            (longestMatrixWidth + cellSizeWithOffset) + "," +
            cellSizeOffset * 2 + ")");

        //
        // Graph
        //

        var graphMinIncidences = Number.MAX_SAFE_INTEGER;
        var graphMaxIncidences = Number.MIN_SAFE_INTEGER;
        graphPairOccurences.forEach(function(obj) {
            graphMinIncidences = Math.min(graphMinIncidences, obj.incidences);
            graphMaxIncidences = Math.max(graphMaxIncidences, obj.incidences);
        });
        var graphStrengthScale = d3.scaleLinear()
             .domain([graphMinIncidences,graphMaxIncidences])
             .range([1, 0.01]);

        var forceSimulationNodes = graphNames.map(function(name) {
            return {id: name};
        });
        var forceSimulationLinks = graphPairOccurences.map(function(pair) {
            return {
                source: pair.firstName,
                target: pair.secondName
            };
        });
        var forceSimulationDistance = self.graphSize / 2;
        var forceSimulationStrengthValues = 
            graphPairOccurences.map(function(pair) {
                return graphStrengthScale(pair.incidences);
            });
        var forceSimulationStrength = function(d, i) {
            return forceSimulationStrengthValues[i];
        };
        var forceSimulationID = function(d) {
            return d.id;
        };

        var graphNodeRadius = 15;
        var simulation = d3.forceSimulation(forceSimulationNodes)
            .force("charge", d3.forceManyBody()
                .strength(-250)
                .distanceMax([forceSimulationDistance]))
            .force("center", d3.forceCenter(
                forceSimulationDistance,
                forceSimulationDistance))
            .force("link", d3.forceLink(forceSimulationLinks)
                .id(forceSimulationID)
                .distance(forceSimulationDistance)
                .strength(forceSimulationStrength)
                .iterations(1))
            .force("x", d3.forceX())
            .force("y", d3.forceY())
            .stop();

        var graphTip = d3.tip()
            .attr('class', 'tooltip tooltip-element tooltip-d3')
            .offset([-10, 0])
            .direction('n')
            .html(function(d, i) {
                return "<div style=\"text-align: center\">" +
                        d.id + 
                "</div>";
            });
        self.html.graphSVG.call(graphTip);

        // Use a timeout to allow the rest of the page to load first.
        d3.timeout(function() {
            // See https://github.com/d3/d3-force/blob/master/README.md#simulation_tick
            for (var i = 0, n = Math.ceil(
                    Math.log(simulation.alphaMin()) / 
                        Math.log(1 - simulation.alphaDecay()));
                    i < n;
                    ++i) {
                simulation.tick();
            }

            self.html.graphSVG
                .selectAll("line")
                    .data(forceSimulationLinks)
                    .enter().append("line")
                        .attr("stroke", "#000")
                        .attr("stroke-width", 1.5)
                        .attr("x1", function(d) {
                            return d.source.x;
                        })
                        .attr("y1", function(d) {
                            return d.source.y;
                        })
                        .attr("x2", function(d) {
                            return d.target.x;
                        })
                        .attr("y2", function(d) {
                            return d.target.y;
                        });

            var graphNodeGroup = self.html.graphSVG.append("g");
            graphNodeGroup
                .selectAll(".attribute-graph-node")
                    .data(forceSimulationNodes)
                    .enter().append("circle")
                        .attr("class", function(d, i) {
                            return "attribute-graph-node " + 
                                classByAttribute({name: d.id}, i);
                        })
                        .attr("cx", function(d) {
                            return d.x;
                        })
                        .attr("cy", function(d) {
                            return d.y;
                        })
                        .attr("r", graphNodeRadius);
            graphNodeGroup
                .selectAll(".attribute-graph-label")
                    .data(forceSimulationNodes)
                    .enter().append("text")
                        .attr("class", "attribute-graph-label occurence-warning")
                        .attr("dx", function(d) {
                            return d.x - graphNodeRadius / 2;
                        })
                        .attr("dy", function(d) {
                            return d.y + graphNodeRadius / 2;
                        })
                        .text(function(d, i) {
                            return d.id.slice(0, 2);
                        });
            graphNodeGroup
                .selectAll(".attribute-graph-node-overlay")
                    .data(forceSimulationNodes)
                    .enter().append("circle")
                        .attr("class", "attribute-graph-node-overlay")
                        .attr("fill", "transparent")
                        .attr("cx", function(d) {
                            return d.x;
                        })
                        .attr("cy", function(d) {
                            return d.y;
                        })
                        .attr("r", graphNodeRadius)
                        .on("mouseover", function(d, i) {
                            graphTip.show(d, i);

                            self.addSelections(d.id);
                        })
                        .on("mouseout", function(d, i) {
                            graphTip.hide(d, i);

                            self.removeSelections(d.id);
                        });
        });
    };

    TimelineVisualization.prototype.renderNoData = function() {
        d3.select("#" + this.html.timelineID + "-main")
            .html('<p>Nenhum atributo seleccionado.</p>');

        // Remove titles
        d3.select("#" + this.html.timelineID + "-details")
            .select("#occurences-title")
                .html('');
        d3.select("#" + this.html.timelineID + "-details")
            .select("#evolution-title")
                .html('');
        d3.select("#" + this.html.timelineID + "-details")
            .select("#evolution-title-tooltip")
                .html('');
        d3.select("#" + this.html.timelineID + "-graph")
            .select("#graph-title")
                .html('');
        d3.select("#" + this.html.timelineID + "-graph")
            .select("#graph-title-tooltip")
                .html('');
    };

    TimelineVisualization.prototype.renderVisibleDetails = function() {
        d3.select("#" + this.html.timelineID + "-details")
            .style('display', 'inline-block')
            .style("visibility", "initial")
            .style("width", "initial")
            .style("height", "initial");
        d3.select("#" + this.html.timelineID + "-main")
            .style('display', 'inline-block')
            .style("visibility", "initial")
            .style("width", "initial")
            .style("height", "initial");
        d3.select("#" + this.html.timelineID + "-graph")
            .select("#graph-title-div")
                .style('display', 'inline-block')
                .style("visibility", "initial")
                .style("width", "initial")
                .style("height", "initial");
    };

    TimelineVisualization.prototype.renderNoVisibleDetails = function() {
        d3.select("#" + this.html.timelineID + "-details")
            .style('display', 'none')
            .style("visibility", "hidden")
            .style("width", 0)
            .style("height", 0);
        d3.select("#" + this.html.timelineID + "-main")
            .style('display', 'none')
            .style("visibility", "hidden")
            .style("width", 0)
            .style("height", 0);
        d3.select("#" + this.html.timelineID + "-graph")
            .select("#graph-title-div")
                .style('display', 'none')
                .style("visibility", "hidden")
                .style("width", 0)
                .style("height", 0);
    };

    TimelineVisualization.prototype.populate = function(data, id) {
        var self = this;

        // Iterate through attribute lists, storing all overlapping moments
        // FIXME: Only diseases and medications
        var patient = patientData.getAttribute(patientData.KEY_PATIENT);
        var targetViz;
        var extractedAttributes = [];
        extractedAttributes.push({
            array: self.patientLists.selectedDiseases,
            name: "diseases"
        });
        extractedAttributes.push({
            array: self.patientLists.selectedMedications,
            name: "medications"
        });
        for(var extractedAttributesIndex = 0;
                extractedAttributesIndex < extractedAttributes.length;
                extractedAttributesIndex++) {
            var list = extractedAttributes[extractedAttributesIndex];
            for(var i = 0; i < list.array.length; i++) {
                var patientAttribute = list.array[i];
                var patientListIndex = utils.arrayObjectIndexOf(
                    patient[list.name], list.array[i].name, "name");
                if (patientListIndex === -1)
                    continue;

                var currentViz = utils.extend(
                    patient[list.name][patientListIndex],
                    {}
                );

                // Add placeholder properties for non-medication lists
                if (list.name !== "medications") {
                    if (!currentViz.expectedFrequency) {
                        currentViz.expectedFrequency = "Diário";
                    }
                    if (!currentViz.recordedFrequency) {
                        currentViz.recordedFrequency = [];
                        var startMoment = moment(currentViz.startDate);
                        var endMoment = moment(currentViz.endDate);
                        var isBeforeEndDate = true;
                        while (isBeforeEndDate) {
                            currentViz.recordedFrequency.push(
                                startMoment.format()
                            );

                            startMoment.add(1, "days");
                            isBeforeEndDate = 
                                (startMoment.diff(endMoment, "days") < 0);
                        }
                    }
                    if (!currentViz.dosage) {
                        currentViz.dosage = currentViz.recordedFrequency.map(
                            function(obj) {
                                return [{
                                    dosage: 1,
                                    name: list.array[i].name
                                }];
                            });
                    }
                }

                // Add additional properties for date processing
                // NOTE: Adapted from SpiralVisualization makeBins()
                var recordedStartMoment = moment(
                    currentViz.recordedFrequency[0]);
                var recordedEndMoment = moment(
                    currentViz.recordedFrequency[
                        currentViz.recordedFrequency.length - 1]);
                currentViz.recordedStartDate =
                    recordedStartMoment.format('YYYY/MM/DD');
                currentViz.recordedEndDate =
                    recordedEndMoment.format('YYYY/MM/DD');
                currentViz.recordedDosage =
                    currentViz.dosage;

                var sourceViz;
                if (!targetViz) {
                    targetViz = currentViz;
                    targetViz.name = "Timeline Attributes";

                    continue;
                } else {
                    sourceViz = currentViz;
                }

                // Compute common expected frequency
                var diffIntervals = visualizations.diffInterval(
                    visualizations.translateFrequency(
                        sourceViz.expectedFrequency),
                    visualizations.translateFrequency(
                        targetViz.expectedFrequency));
                var newFrequency = (diffIntervals > 0) ?
                    sourceViz.expectedFrequency :
                    targetViz.expectedFrequency;

                // Compute common range;
                // For simplicity, if the two ranges don't overlap,
                // we just introduce that hole into the new range.
                var newStartDate = timeWeaver.computeJoinMoment(
                    sourceViz.recordedStartDate,
                    targetViz.recordedStartDate,
                    function(a, b) { return a > b; }
                ).toISOString();
                var newEndDate = timeWeaver.computeJoinMoment(
                    sourceViz.recordedEndDate,
                    targetViz.recordedEndDate,
                    function(a, b) { return a < b; }
                ).toISOString();

                // Compute common recorded frequency:
                // Iterate through all the recorded frequencies and
                // collect the dates, alongside correspoding
                // attribute names
                var resultJoinProperties = timeWeaver
                    .computeJoinProperties(sourceViz, targetViz);

                // Store computed properties
                targetViz.endDate = newEndDate;
                targetViz.expectedFrequency = newFrequency;
                targetViz.startDate = newStartDate;

                targetViz.dosage =
                    resultJoinProperties.newDosage;
                targetViz.recordedDosage =
                    resultJoinProperties.newDosage;
                targetViz.recordedFrequency =
                    resultJoinProperties.newRecordedFrequency;
            }
        }

        self.hasData = (targetViz);
        if (self.hasData) {
            self.visualizationRenderer = utils.extend(targetViz, {});
            self.visualizationRenderer.longestNameLength = 0;
            
            self.render();
        } else {
            self.renderNoData();
        }
    };

    TimelineVisualization.prototype.remove = function(nodeID, vizID) {
        var self = this;

        // Remove handlers
        var selection = self.html.occurencesSVG
            .selectAll(".filter-bar-overlay");
        selection
            .on("mouseover", null)
            .on("mouseout", null);
        selection = self.html.mainHTML
            .selectAll(".attribute-month-rect-label");
        selection
            .on("mouseover", null)
            .on("mouseout", null);
        selection = self.html.mainHTML
            .selectAll(".attribute-month-label");
        selection
            .on("mouseover", null)
            .on("mouseout", null);
        selection = self.html.mainHTML
            .selectAll(".attribute-month");
        selection
            .on("mouseover", null)
            .on("mouseout", null);
        selection = self.html.mainHTML
            .selectAll(".viz-evolution")
                .selectAll(".attribute-occurence-overlay");
        selection
            .on("mouseover", null)
            .on("mouseout", null);
        selection = self.html.graphSVG
            .selectAll(".attribute-graph-node-overlay");
        selection
            .on("mouseover", null)
            .on("mouseout", null);

        // Remove elements
        self.html.occurencesSVG
            .selectAll(".filter-bar-overlay")
                .selectAll("*")
                    .remove();
        self.html.mainHTML
            .selectAll(".attribute-month-rect-label")
                .remove();
        self.html.mainHTML
            .selectAll(".attribute-month-label")
                .remove();
        self.html.mainHTML
            .selectAll(".attribute-month")
                .remove();
        self.html.mainHTML
            .selectAll(".viz-evolution")
                .selectAll("*")
                    .remove();
        self.html.graphSVG
            .selectAll("g")
                .selectAll("*")
                    .remove();

        self.html.mainHTML.selectAll("*")
            .remove();
        self.html.occurencesSVG.selectAll("*")
            .remove();
        self.html.graphSVG.selectAll("*")
            .remove();
    };

    TimelineVisualization.prototype.remake = function(nodeID, vizID) {
        // Remove previous nodes/handlers, since they are invalidated by the
        // new DOM layout
        this.remove(nodeID, vizID);

        // Add attributes and svgs to the new DOM targets. Note that the target
        // element ID is still the same.
        this.make(nodeID, vizID);
    };

    TimelineVisualization.prototype.makeFilters = function(
            nodeID, vizID) {
        d3.select('#filters-' + nodeID)
            .html('<div>TODO</div>');
    };

    TimelineVisualization.prototype.update = function(nodeID, vizID, state) {
        var self = this;

        // FIXME: Review makeBins not called more than once
        var timeline = nodes.getVizByIDs(nodeID, vizID);
        var areBinsBeingCreated = false;
        if (state.binning) {
            this.binning = state.binning;

            areBinsBeingCreated = true;
        }
        if (state.diseases) {
            self.patientLists.diseases = filterByPatientAttributes(
                state.diseases, 'diseases');
            self.patientLists.selectedDiseases =
                visualizations.processSelectedListToObjects(
                    self.patientLists.diseases);

            areBinsBeingCreated = true;
        }
        if (state.medications) {
            self.patientLists.medications = filterByPatientAttributes(
                state.medications, 'medications');
            self.patientLists.selectedMedications =
                visualizations.processSelectedListToObjects(
                    self.patientLists.medications);

            areBinsBeingCreated = true;
        }
        if (state.currentMedication) {
            if (this.currentMedication.indexOf(state.currentMedication) === -1) {
                this.binning = null;
                this.currentMedication.push(state.currentMedication);
            }

            areBinsBeingCreated = true;
        }
        if (state.useFilters) {
            this.makeFilters(nodeID, vizID);
            return;
        }

        if (areBinsBeingCreated) {
            this.makeBins();
        }
    };

    var possibleBinnings = [
        { bin: 'days', label: 'Dia' },
        { bin: 'weeks', label: 'Semana' },
        { bin: 'months', label: 'Mês' },
        { bin: 'years', label: 'Ano' }
    ];
    TimelineVisualization.prototype.extractAvailableBinnings = function() {
        var availableBinnings = [];
        if ((!this.binning) || (!this.expectedFrequency))
            return availableBinnings;

        // Skip binnings which have more granularity than that of the 
        // expected frequency
        var expectedBin = visualizations.translateFrequency(
            this.expectedFrequency);
        var index;
        for (index = 0; index < possibleBinnings.length; index++) {
            if (possibleBinnings[index].bin === expectedBin)
                break;
        }

        // Add all compatible binnings
        for (; index < possibleBinnings.length; index++) {
            availableBinnings.push(possibleBinnings[index]);
        }

        return availableBinnings;
    };

    TimelineVisualization.prototype.modifyDetailsVisibility =
            function(isMaximized) {
        // When we don't have data, we simply show all the attribute text
        if (isMaximized || !(this.hasData)) {
            this.renderVisibleDetails();
        } else {
            this.renderNoVisibleDetails();
        }
    };

    var attributeType = Object.freeze({
        NONE: "none",
        DISEASES: "diseases",
        MEDICATIONS: "medications"
    });

    TimelineVisualization.prototype.isAttributeTypeActive = function(type) {
        return this.currentAttributeType === type;
    };

    TimelineVisualization.prototype.getAttributeTypes = function(type) {
        return attributeType;
    };

    TimelineVisualization.prototype.setCurrentAttributeType = function(type) {
        this.currentAttributeType = type;
    };

    var modificationType = Object.freeze({
        NONE: "none",
        DATA: "data",
        FILTERS: "filters"
    });

    TimelineVisualization.prototype.isModificationTypeActive = function(type) {
        return this.currentModificationType === type;
    };

    TimelineVisualization.prototype.getModificationTypes = function(type) {
        return modificationType;
    };

    TimelineVisualization.prototype.setCurrentModificationType = function(type) {
        this.currentModificationType = type;
    };

    visualizations.validateInterface(
        TimelineVisualization.prototype, "TimelineVisualization"
    );
            
    return TimelineVisualization;
}]);
