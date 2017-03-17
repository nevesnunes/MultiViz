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

        // Group for main visualization
        var mainHTML = d3.select("#" + timelineID + "-main");

        // Group for ocurrences histogram
        var marginFromLabels = 
            self.padding + self.labelPadding * 2;
        d3.select("#" + timelineID + "-details")
            .append("div")
                .style('margin-left',
                    marginFromLabels + "px")
                .html('<h4><b>' +
                        'Contagem de ocorrências' +
                    '</b></h4>');
        var ocurrencesSVG = d3.select("#" + timelineID + "-details")
            .append("svg")
                .attr("width", self.vizWidth - self.padding / 2)
                .attr("height", 0) // Set dynamically
                .append("g")
                    .attr("id", "ocurrences")
                    .attr("transform", "translate(" +
                        // Offset for month text labels
                        marginFromLabels + "," + 0 + ")");

        self.html = {
            elementID: elementID,
            timelineID: timelineID,
            ocurrencesSVG: ocurrencesSVG,
            mainHTML: mainHTML
        };

        self.makeBins();
    };

    TimelineVisualization.prototype.makeBins = function() {
        var data = null;
        this.populate(data, timelineID);
    };

    TimelineVisualization.prototype.render = function() {
        var self = this;

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
         * Ocurrence dates, stored as a dictionary of years,
         * each with an array of months.
         * - name: Abreviated month name, used as label in svg;
         * - dataIndex: corresponding dosage/frequency index
         * - overlapIndex: corresponding occurence count index
         */
        var matrixDates = {};

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
                // Check if range ended;
                // We compare all names in current dosage with the last one.
                var namesToCompare = lastDosage.start.map(function(obj) {
                    return obj.name;
                });
                var areNamesDifferent = false;
                for (var dosageIndex = 0;
                        dosageIndex < recordedDosage[i].length;
                        dosageIndex++) {
                    var name = recordedDosage[i][dosageIndex].name;
                    // Mismatch: There are more names in recorded dosage
                    if (namesToCompare.length === 0) {
                        areNamesDifferent = true;
                    }
                    if (namesToCompare.indexOf(name) !== -1) {
                        namesToCompare.splice(name, 1);
                    }
                }
                // Mismatch in dosage names || end of data: the range ended
                if (areNamesDifferent ||
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
                    var endMoment = moment(lastFrequency.end);
                    var endMonth = endMoment.month();
                    var endMonthName = endMoment.format('MMM');
                    var endYear = endMoment.year();
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
                        dataIndex: i - 1,
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
                }
            }
        }

        var dataHistogramCounts = Array
            .apply(null, Array(maxOverlapCount))
            .map(Number.prototype.valueOf, 0);
        for (i = 0; i < maxOverlapCount; i++) {
            dataHistogramCounts[i] = overlaps[i].value;
        }

        var histogramHeight = 40;

        var vizContentWidth = Math.min(
            self.vizWidth,
            (histogramHeight / 2) * maxOverlapCount
        );

        //
        // ocurrences axis
        //
        var x2 = d3.scaleLinear().range([0, vizContentWidth]);
        x2.domain([0, maxOverlapCount]);
        var xAxis = d3.axisBottom(x2)
            .ticks(maxOverlapCount)
            .tickFormat(d3.format("d"));
        var axisHeight = histogramHeight;
        self.html.ocurrencesSVG.selectAll(".line-axis").remove();
        self.html.ocurrencesSVG.append("g")
            .attr("class", "x axis line-axis")
            .attr("height", axisHeight)
            .attr("transform", "translate(" +
                0 + "," +
                (axisHeight + self.labelPadding / 2) + ")")
            .call(xAxis);

        //
        // ocurrences bars
        //
        var histogramBarPadding = 0.2;
        var x = d3.scaleBand().range([0, vizContentWidth + 1])
                .padding(histogramBarPadding),
            y = d3.scaleLinear().range([histogramHeight, 0]);

        var data = dataHistogramCounts;
        x.domain(data.map(function(d, i) { return i; }));
        var maxY = d3.max(data, function(d) { return d; });
        y.domain([0, maxY]);

        var cellSize = Math.ceil(x.bandwidth());
        var g = self.html.ocurrencesSVG.append("g")
            .attr("height", histogramHeight);
        var histogram = g.selectAll(".histogram")
            .data(data);
        var histogramGroup = histogram.enter();
        histogramGroup.append("rect")
            .attr("class", "filter-bar")
            .attr("shape-rendering", "crispEdges")
            .merge(histogram)
                .attr("x", function(d, i) { return x(i); })
                .attr("y", function(d) { return y(d); })
                .attr("width", cellSize)
                .attr("height", function(d) { return histogramHeight - y(d); });

        // Adjust svg sizes
        d3.select("#timeline-" + timelineID + "-details")
            .select("svg")
                .attr("height", histogramHeight + axisHeight);

        //
        // Matrix
        //

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

                    var cellSizeOffset = histogramBarPadding * 10 * 2;
                    var cellSizeWithOffset = cellSize + cellSizeOffset;
                    var attributeNames = 
                        matrixDates[year][month].attributeNames;
                    var monthSVG = monthHTML.append("div")
                        .style("display", "inline-block")
                        .append("svg")
                            .attr("width", self.vizWidth - 
                                (self.padding * 2) - 
                                self.labelPadding)
                            .attr("height", cellSizeWithOffset *
                                attributeNames.length)
                            .append("g")
                                .attr("id", "viz-svg-" + year + "-" + month);

                    var monthCellsLabels = monthSVG
                        .selectAll(".attribute-month-label")
                        .data(attributeNames);
                    monthCellsLabels.enter().append("text")
                        .attr("class", "attribute-month-label")
                        .merge(monthCellsLabels)
                            .attr("x", function(d, i) {
                                return (maxOverlapCount + 1) *
                                    cellSizeWithOffset;
                            })
                            .attr("y", function(d, i) {
                                return i * 
                                    cellSizeWithOffset + cellSize -
                                    cellSizeOffset / 2;
                            })
                            .text(function(d) {
                                return d;
                            });
                    monthCellsLabels.exit().remove();

                    // Flatten data, so that we draw as many cells as
                    // overlapped attributes in the month
                    var monthObj = matrixDates[year][month];
                    var monthFlatData = [];
                    for (var monthDataIndex in monthObj.data) {
                        var dataInMonthObj = monthObj.data[monthDataIndex];
                        var count = dataInMonthObj.attributeNames.length;
                        for (var nameIndex in dataInMonthObj.attributeNames) {
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
                            } else {
                                monthFlatData[flatDataIndex].incidences += 1;
                            }
                        }
                    }

                    var attributesInMonth = monthObj.attributeNames;
                    var monthCells = monthSVG
                        .selectAll(".attribute-month")
                        .data(monthFlatData);
                    monthCells.enter().append("rect")
                        .attr("class", "attribute-month filter-bar")
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
                            });
                    monthCells.exit().remove();
                }
            }
        }
    };

    TimelineVisualization.prototype.populate = function(data, id) {
        var self = this;

        // Iterate through medications, storing all overlapping moments
        // TODO
        var patient = patientData.getAttribute(patientData.KEY_PATIENT);
        var targetViz;
        for(var i = 0; i < self.patientLists.medications.length; i++) {
            var medication = self.patientLists.medications[i];
            var patientMedicationIndex = utils.arrayObjectIndexOf(
                patient.medications, medication.name, "name");
            if (patientMedicationIndex === -1)
                continue;

            var currentViz = utils.extend(
                patient.medications[patientMedicationIndex],
                {}
            );

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

        self.visualizationRenderer = utils.extend(targetViz, {});
        
        self.render();
    };

    TimelineVisualization.prototype.remove = function(nodeID, vizID) {
        var self = this;

        // TODO
        self.html.mainHTML.selectAll("svg")
            .remove();
        self.html.ocurrencesSVG
            .remove();
    };

    TimelineVisualization.prototype.remake = function(nodeID, vizID) {
        // Remove previous nodes/handlers, since they are invalidated by the
        // new DOM layout
        this.remove();

        // Add attributes and svgs to the new DOM targets. Note that the target
        // element ID is still the same.
        this.make();

        // Render paths, reusing data stored in the visualization object
        if (this.hasData) {
            this.render(true);
        } else {
            this.renderNoData();
        }
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
        }
        if (state.medications) {
            self.patientLists.medications = filterByPatientAttributes(
                state.medications, 'medications');
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
            //this.renderVisibleDetails();
        } else {
            //this.renderNoVisibleDetails();
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
