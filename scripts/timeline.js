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
            diseases: options.diseases.slice(),
            medications: options.medications.slice()
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

        self.vizHeight = 600; // HACK: Placeholder

        // Compute size based on available view dimensions
        self.vizWidth = angular.element('#' + elementID)[0]
            .offsetWidth;

        var svg = d3.select("#" + timelineID + "-main")
            .append("svg")
                .attr("width", self.vizWidth)
                .attr("height", self.vizHeight);

        // Group for ocurrences histogram
        var ocurrencesSVG = svg.append("g")
            .attr("id", "ocurrences")
            .attr("transform", "translate(" +
                // Offset for month text labels
                40 + "," + 0 + ")");

        // Group for main visualization
        svg = svg.append("g")
            .attr("id", "viz");

        self.html = {
            elementID: elementID,
            timelineID: timelineID,
            ocurrencesSVG: ocurrencesSVG,
            svg: svg
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

        // Store overlaps by frequency;
        // Each frequency can have many incidences by time range,
        // identified by 2 dates & a subset of attributes present.
        var maxOverlapCount = 0;
        var overlaps = [];
        for (var i = 0;
                i < recordedFrequency.length;
                i++) {
            var overlapIndex = overlapCount - 1;
            var overlapCount =
                recordedDosage[i].length;
            if (overlapCount > 1) {
                // Update maximum
                if (maxOverlapCount < overlapCount) {
                    maxOverlapCount = overlapCount;
                }

                /*
                console.log(self.visualizationRenderer.recordedDosage[i]);
                console.log(self.visualizationRenderer.recordedFrequency[i]);
                */
            }

            if (overlaps[overlapIndex]) {
                overlaps[overlapIndex].value += 1;
            } else {
                overlaps[overlapIndex] = {
                    dosages: [],
                    frequencies: [],
                    value: 1
                };
            }
            // TODO: only push range
            // NOTE: Index needs to be corrected, since length is >= 1
            overlaps[overlapIndex].dosages.push(
                recordedDosage[i]);
            overlaps[overlapIndex].frequencies.push(
                recordedFrequency[i]);
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
        var padding = 10;

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
                (axisHeight + padding / 2) + ")")
            .call(xAxis);

        //
        // ocurrences bars
        //
        var x = d3.scaleBand().range([0, vizContentWidth + 1]),
            y = d3.scaleLinear().range([histogramHeight, 0]);

        var data = dataHistogramCounts;
        x.domain(data.map(function(d, i) { return i; }));
        var maxY = d3.max(data, function(d) { return d; });
        y.domain([0, maxY]);

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
                .attr("width", Math.ceil(x.bandwidth()))
                .attr("height", function(d) { return histogramHeight - y(d); });

        // Count number of attributes in current month
        // TODO
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
        // TODO
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
            self.patientLists.diseases = state.diseases.slice();
        }
        if (state.medications) {
            self.patientLists.medications = state.medications.slice();
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
