var moduleVisualizations = angular.module('moduleVisualizations');

moduleVisualizations.directive('directiveSpiralTooltip',
        function() {
    return {
        link: function (scope, element, attrs) {
            scope.setTooltipText = function(button) {
                scope.tooltipText = 
                    "<div style=\"text-align: left\" class=\"p\">" +
                        "Encontre padrões temporais em atributos " +
                        "do paciente actual." +
                    "</div>";
            };
        }
    };
});

moduleVisualizations.factory('SpiralVisualization',
        ['visualizations', 'patientData', 'retrievePatientData', 'utils', 'nodes',
        function(visualizations, patientData, retrievePatientData, utils, nodes) {
    var SpiralVisualization = function(options) {
        // Patient attribute lists
        this.medications = options.medications;
        this.currentMedication = options.currentMedication;

        // Specific state is maintained in a separate object,
        // which we will use in our facade
        this.visualizationRenderer = null;

        this.binning = null;
    };

    var COUNT_MAX_THRESHOLD = 150;

    // Unique identifier
    var spiralID = 0;
    SpiralVisualization.prototype.makeID = function() {
        spiralID++;
        return "spiral-" + spiralID;
    };

    SpiralVisualization.prototype.makeDescription = function(elementID) {
        if (elementID === undefined) {
            console.log("[WARN] @make: undefined id.");
            return;
        }
        
        return '<p class="viz-title">' +
                'Análise temporal de atributos' +
                '  ' +
                '<span class="tooltip-wrapper help" ' +
                    'title="{{tooltipText}}" ' + 
                    'directive-tooltip directive-spiral-tooltip>' +
                    '<img src="images/controls/info.svg">' +
                '</span>' +
                '</p>';
    };

    SpiralVisualization.prototype.make = function(elementID, spiralID) {
        var self = this;
        if (elementID === undefined) {
            console.log("[WARN] @make: undefined id.");
            return;
        }

        var size = 300;
        this.visualizationRenderer = new Spiral({
            svgWidth: size,
            svgHeight: size + 50,
            margin: {
                top: -30,
                right: 0,
                bottom: 0,
                left: 0
            },
            targetElement: spiralID,
            colors: visualizations.colors,
            functions: {
                // This is ugly, this is amazing, this is js ;)
                makeBins: (function() {
                   self.makeBins();
                }).bind(self),
                makeLegend: visualizations.makeLegend,
                extractDatesWithInterval: visualizations.extractDatesWithInterval,
                translateInterval: visualizations.translateInterval
            },
            currentMedication: self.currentMedication
        });
        self.makeBins();
    };

    SpiralVisualization.prototype.makeBins = function() {
        // Extract patient data
        var patient = patientData.getAttribute(patientData.KEY_PATIENT);
        var patientMedicationIndex = utils.arrayObjectIndexOf(
                patient.medications, this.currentMedication, "name");
        var patientMedications = patient.medications[patientMedicationIndex];
        var expectedFrequency = patientMedications.expectedFrequency;
        var recordedFrequency = patientMedications.recordedFrequency;

        // Check if interval was defined in temporal line brush;
        // Otherwise, use expected start and end dates
        var intervalStartMoment = moment(recordedFrequency[0]);
        var intervalEndMoment = moment(
                recordedFrequency[recordedFrequency.length - 1]);
        var interval = visualizations.translateFrequency(expectedFrequency);
        var intervalDates = this.visualizationRenderer.getIntervalDates();
        if (intervalDates.length > 0) {
            // Brush intervals may specify dates outside of the recorded range, so
            // we only apply them if they are inside this range
            if (intervalStartMoment.diff(intervalDates[0], interval) <= 0) {
                intervalStartMoment = intervalDates[0];
            }
            if (intervalEndMoment.diff(intervalDates[1], interval) >= 0) {
                intervalEndMoment = intervalDates[1];
            }
        }

        // No recorded data available
        if (recordedFrequency.length === 0) {
            this.visualizationRenderer.renderNoData();
            return;
        }

        var startMoment = moment(patientMedications.startDate);
        var endMoment = moment(patientMedications.endDate);
        var countTimeSpan = endMoment.diff(startMoment, interval);
        // The time span should always be greater then zero
        countTimeSpan = Math.max(countTimeSpan, 1);

        // Bin data if expected interval is too large;
        // If the user didn't set a specific binning, we compute the most
        // adequate one based on interval range
        var binFactor = 0;
        var binInterval = interval;
        var binTimeSpan = intervalEndMoment.diff(intervalStartMoment, interval);

        if (this.binning !== null) {
            while (visualizations.diffInterval(binInterval, this.binning) > 0) {
                binFactor++;
                binInterval = visualizations.nextInterval(binInterval);
                binTimeSpan = intervalEndMoment.diff(
                    intervalStartMoment, binInterval);
            }
        } else {
            while (binTimeSpan > COUNT_MAX_THRESHOLD) {
                binFactor++;
                binInterval = visualizations.nextInterval(binInterval);
                binTimeSpan = intervalEndMoment.diff(
                    intervalStartMoment, binInterval);
            }
            this.binning = binInterval;
        }
        // The difference for the bin interval may be zero, but the time span
        // should always be greater then zero
        binTimeSpan = Math.max(binTimeSpan, 1);

        // Set default period for the given interval
        var period = 7;
        if (binInterval === 'days')
            period = 30;
        else if (binInterval === 'months')
            period = 12;

        // Populate data by checking if values are present for each given moment
        var data = [];
        var brushedData = [];
        var currentMoment = startMoment.clone();	
        var previousBinMoment = currentMoment.clone();
        var currentBinMoment = previousBinMoment.clone().add(1, binInterval);
        var accumulatorBinDays = 0;
        for (var i = 0, currentDateIndex = 0; i < countTimeSpan; i++) {
            var recordedMoment = moment(recordedFrequency[currentDateIndex]);
            var diffDates = currentMoment.diff(recordedMoment, interval);
            var diffBinDate = currentMoment.diff(currentBinMoment, interval);

            // A recorded value in the current date is present:
            // Save it and advance to the next recorded date
            if (diffDates === 0) {
                accumulatorBinDays++;
                currentDateIndex++;
            }

            // The bin interval ended or point limit reached:
            // Add accumulated values to data
            if ((diffBinDate === 0) || (i == countTimeSpan - 1)) {
                var startDateString = previousBinMoment.format('YYYY/MM/DD');
                var endDateString = currentBinMoment.format('YYYY/MM/DD');
                var dateString = startDateString;
                if (binFactor > 0) {
                    dateString += ' - ';
                    dateString += endDateString;
                }

                // If moment is contained in the brush interval, add date to
                // brushed data container
                if ((currentMoment.diff(intervalStartMoment, interval) >= 0) &&
                        (currentMoment.diff(intervalEndMoment, interval) <= 0)) {
                    brushedData.push({
                        value: accumulatorBinDays,
                        dosage: patientMedications.dosage,
                        date: dateString,
                        startDate: startDateString,
                        endDate: endDateString,
                        binFactor: binFactor
                    });
                }
                data.push({
                    value: accumulatorBinDays,
                    dosage: patientMedications.dosage,
                    date: dateString,
                    startDate: startDateString,
                    endDate: endDateString,
                    binFactor: binFactor
                });

                accumulatorBinDays = 0;

                // Advance to the next bin
                previousBinMoment = currentBinMoment.clone();
                currentBinMoment.add(1, binInterval);
            }

            // Advance to the next expected date
            currentMoment.add(1, interval);	
        }

        var countPoints = binTimeSpan;

        // Compute sector spacing according to number of data points:
        // - Small number of points leads to larger sectors
        // - After a certain number of points, sector size will remain constant
        // FIXME: There's probably a less hardcoded way to compute adjustments...
        var spacing = 275 / countPoints;
        if (countPoints < 100)
            spacing *= (countPoints / 100) + 0.25 * ((100 - countPoints) / 100);
        if (countPoints < 10)
            spacing *= 1.25 * (countPoints / 10);
        spacing *= period / 7;

        var recordedStartMoment = moment(recordedFrequency[0]);
        var recordedEndMoment = moment(
                recordedFrequency[recordedFrequency.length - 1]);
        this.visualizationRenderer
            .set('numberOfPoints', countPoints)
            .set('period', period)
            .set('spacing', spacing)
            .set('lineWidth', spacing * 6)
            .set('binning', this.binning)
            .set('currentMedication', this.currentMedication)
            .set('recordedStartDate', recordedStartMoment.format('YYYY/MM/DD'))
            .set('recordedEndDate', recordedEndMoment.format('YYYY/MM/DD'))
            .set('startDate', startMoment.format('YYYY/MM/DD'))
            .set('endDate', endMoment.format('YYYY/MM/DD'))
            .set('expectedFrequency', expectedFrequency)
            .set('isBeingCreated', true);
        this.populate(data, brushedData, spiralID);
    };

    SpiralVisualization.prototype.populate = function(data, brushedData, id) {
        // TODO: vizs need to store/receive nodeID
        //var isMaximized = (nodes.getCurrentNode().model.id === id);

        this.visualizationRenderer.processData(data, brushedData);
        this.visualizationRenderer.render();
    };

    SpiralVisualization.prototype.remove = function(nodeID, vizID) {
        this.visualizationRenderer.remove();
    };

    SpiralVisualization.prototype.remake = function(nodeID, vizID) {
        // Remove previous nodes/handlers, since they are invalidated by the
        // new DOM layout
        this.visualizationRenderer.remove();

        // Add attributes and svgs to the new DOM targets. Note that the target
        // element ID is still the same.
        this.visualizationRenderer.make();

        // Render paths, reusing data stored in the visualization object
        this.visualizationRenderer.render(true);
    };

    SpiralVisualization.prototype.update = function(nodeID, vizID, state) {
        var spiral = nodes.getVizByIDs(nodeID, vizID);
        if (state.binning) {
            this.binning = state.binning;
            this.visualizationRenderer.set('binning', this.binning);

            this.makeBins();
        }
        if (state.medications) {
            this.medications = state.medications;
        }
        if (state.currentMedication) {
            if (this.currentMedication !== state.currentMedication) {
                this.binning = null;
                this.currentMedication = state.currentMedication;
                this.visualizationRenderer
                    .set('currentMedication', this.currentMedication)
                    // Invalidate previous brushing
                    .set('intervalDates', [])
                    .set('intervalPos', []);
            }

            this.makeBins();
        }
    };

    visualizations.validateInterface(
        SpiralVisualization.prototype, "SpiralVisualization"
    );

    return SpiralVisualization;
}]);
