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
    var self;
    var SpiralVisualization = function(options) {
        self = this;
        // Patient attribute lists
        self.medications = options.medications;
        self.currentMedication = options.currentMedication;

        // This visualization maintains it's state in it's own object,
        // which we will use in our facade
        self.spiral = null;

        self.binning = null;
        //self.data = null;
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
        if (elementID === undefined) {
            console.log("[WARN] @make: undefined id.");
            return;
        }

        var size = 300;
        self.spiral = new Spiral({
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
                makeBins: self.makeBins,
                makeLegend: visualizations.makeLegend,
                extractDatesWithInterval: visualizations.extractDatesWithInterval,
                translateInterval: visualizations.translateInterval
            }
        });
        self.makeBins();
    };

    SpiralVisualization.prototype.makeBins = function() {
        var patient = patientData.getAttribute(patientData.KEY_PATIENT);
        var patientMedicationIndex = utils.arrayObjectIndexOf(
                patient.medications, self.currentMedication, "name");
        var patientMedications = patient.medications[patientMedicationIndex];
        var expectedFrequency = patientMedications.expectedFrequency;
        var recordedFrequency = patientMedications.recordedFrequency;

        // Check if interval was defined in temporal line brush;
        // Otherwise, use expected start and end dates
        var startMoment = moment(patientMedications.startDate);
        var endMoment = moment(patientMedications.endDate);
        var recordedStartMoment;
        var recordedEndMoment;
        var intervalDates = self.spiral.getIntervalDates();
        if (intervalDates.length > 0) {
            recordedStartMoment = intervalDates[0];
            recordedEndMoment = intervalDates[1];
        } else {
            recordedStartMoment = moment(recordedFrequency[0]);
            recordedEndMoment = moment(
                recordedFrequency[recordedFrequency.length - 1]);
        }

        // No recorded data available
        if (recordedFrequency.length === 0) {
            self.spiral.set('currentMedication', self.currentMedication);
            self.spiral.renderNoData();
            return;
        }

        var interval = visualizations.translateFrequency(expectedFrequency);
        var countTimeSpan = endMoment.diff(startMoment, interval);

        // Bin data if expected interval is too large;
        // If the user didn't set a specific binning, we compute the most
        // adequate one based on interval range
        var binFactor = 0;
        var binInterval = interval;
        var binTimeSpan = recordedEndMoment.diff(recordedStartMoment, interval);
        if (self.binning !== null) {
            while (visualizations.diffInterval(binInterval, self.binning) > 0) {
                binFactor++;
                binInterval = visualizations.nextInterval(binInterval);
                binTimeSpan = recordedEndMoment.diff(
                    recordedStartMoment, binInterval);
            }
        } else {
            while (binTimeSpan > COUNT_MAX_THRESHOLD) {
                binFactor++;
                binInterval = visualizations.nextInterval(binInterval);
                binTimeSpan = recordedEndMoment.diff(
                    recordedStartMoment, binInterval);
            }
            self.binning = binInterval;
        }

        // Set default period for the given interval
        var period = 7;
        if (binInterval === 'months')
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

            // The bin interval ended: 
            // Add accumulated values to data and advance to the next bin
            if (diffBinDate === 0) {
                var startDateString = previousBinMoment.format('YYYY/MM/DD');
                var dateString = startDateString;
                if (binFactor > 0) {
                    dateString += ' - ';
                    dateString += currentBinMoment.format('YYYY/MM/DD');
                }
                previousBinMoment = currentBinMoment.clone();
                currentBinMoment.add(1, binInterval);

                // If moment is contained in the brush interval, also add date to
                // brushed data container
                if ((currentMoment.diff(recordedStartMoment, interval) > 0) &&
                        (currentMoment.diff(recordedEndMoment, interval) <= 0)) {
                    brushedData.push({
                        value: accumulatorBinDays,
                        dosage: patientMedications.dosage,
                        date: dateString,
                        startDate: startDateString,
                        binFactor: binFactor
                    });
                }
                data.push({
                    value: accumulatorBinDays,
                    dosage: patientMedications.dosage,
                    date: dateString,
                    startDate: startDateString,
                    binFactor: binFactor
                });
                accumulatorBinDays = 0;
            }

            // Advance to the next expected date
            currentMoment.add(1, interval);	
        }

        var countPoints = binTimeSpan;

        // FIXME: There's probably a less hardcoded way to compute adjustments...
        var spacing = 275 / countPoints;
        if (countPoints < 100)
            spacing *= (countPoints / 100) + 0.25 * ((100 - countPoints) / 100);
        if (countPoints < 10)
            spacing *= 1.25 * (countPoints / 10);

        self.spiral
            .set('numberOfPoints', countPoints)
            .set('period', period)
            .set('spacing', spacing)
            .set('lineWidth', spacing * 6)
            .set('binning', self.binning)
            .set('recordedStartDate', recordedStartMoment.format('YYYY/MM/DD'))
            .set('recordedEndDate', recordedEndMoment.format('YYYY/MM/DD'))
            .set('startDate', startMoment.format('YYYY/MM/DD'))
            .set('endDate', endMoment.format('YYYY/MM/DD'))
            .set('currentMedication', self.currentMedication)
            .set('expectedFrequency', expectedFrequency)
            .set('isBeingCreated', true);

        // Save extra state outside of Spiral instance
        //self.data = data;

        self.populate(data, brushedData, spiralID);
    };

    SpiralVisualization.prototype.populate = function(data, brushedData, id) {
        /*
        var spiral = nodes.getVizs(id)[0];
        spiral.randomData();
        var svg = spiral.render();
        var svg = heatMap.html;
        diseaseNames = processSelectedList(heatMap.this.diseases);
        medicationNames = processSelectedList(heatMap.this.medications);
        */

        //spiral.randomData();
        
        // TODO: vizs need to store nodeID
        //var isMaximized = (nodes.getCurrentNode().model.id === id);

        self.spiral.processData(data, brushedData);
        self.spiral.render();
    };

    SpiralVisualization.prototype.update = function(nodeID, vizID, state) {
        /*
        var data = [];
        var spirals = nodes.getVizs(id);
        for (var j = 0; j < spirals.length; j++) {
            populate(data, spirals[j]);
        }
        */

        var spiral = nodes.getVizByIDs(nodeID, vizID);
        if (state.binning) {
            self.binning = state.binning;
            self.spiral.set('binning', self.binning);

            self.makeBins();
        }
        if (state.medications) {
            self.medications = state.medications;
        }
        if (state.currentMedication) {
            if (self.currentMedication !== state.currentMedication) {
                self.binning = null;
                self.currentMedication = state.currentMedication;
            }

            self.makeBins();
        }
    };

    return SpiralVisualization;
}]);
