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

        // This visualization maintains it's state in it's own object,
        // which we will use in our facade
        this.spiral = null;

        this.binning = null;
        this.data = null;
        this.html = null;
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

    SpiralVisualization.prototype.make = function(
            elementID, spiralID, isChecked) {
        if (elementID === undefined) {
            console.log("[WARN] @make: undefined id.");
            return;
        }

        var size = 300;
        this.spiral = new Spiral({
            graphType: 'custom-path',
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
                makeLegend: visualizations.makeLegend,
                translateInterval: visualizations.translateInterval
            }
        });
        this.makeBins();
    };

    SpiralVisualization.prototype.makeBins = function() {
        var patient = patientData.getAttribute(patientData.KEY_PATIENT);
        var patientMedicationIndex = utils.arrayObjectIndexOf(
                patient.medications, this.currentMedication, "name");
        var patientMedications = patient.medications[patientMedicationIndex];

        var startMoment = moment(patientMedications.startDate);
        var endMoment = moment(patientMedications.endDate);
        var expectedFrequency = patientMedications.expectedFrequency;
        var recordedFrequency = patientMedications.recordedFrequency;

        // No recorded data available
        if (recordedFrequency.length === 0) {
            this.spiral.set('currentMedication', this.currentMedication);
            this.spiral.renderNoData();
            return;
        }

        var interval = visualizations.translateFrequency(expectedFrequency);
        var countTimeSpan = endMoment.diff(startMoment, interval);

        // Bin data if expected interval is too large;
        // If the user didn't set a specific binning, we compute the most
        // adequate one based on interval range
        var binFactor = 0;
        var binInterval = interval;
        var binTimeSpan = countTimeSpan;
        if (this.binning !== null) {
            while (visualizations.diffInterval(binInterval, this.binning) > 0) {
                binFactor++;
                binInterval = visualizations.nextInterval(binInterval);
                binTimeSpan = endMoment.diff(startMoment, binInterval);
            }
        } else {
            while (binTimeSpan > COUNT_MAX_THRESHOLD) {
                binFactor++;
                binInterval = visualizations.nextInterval(binInterval);
                binTimeSpan = endMoment.diff(startMoment, binInterval);
            }
            this.binning = binInterval;
        }

        // Set default period for the given interval
        var period = 7;
        if (binInterval === 'months')
            period = 12;

        // Populate data by checking if values are present for each given moment
        var data = [];
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
                var dateString = previousBinMoment.format('YYYY/MM/DD');
                if (binFactor > 0) {
                    dateString += ' - ';
                    dateString += currentBinMoment.format('YYYY/MM/DD');
                }
                previousBinMoment = currentBinMoment.clone();
                currentBinMoment.add(1, binInterval);
                data.push({
                    value: accumulatorBinDays,
                    dosage: patientMedications.dosage,
                    date: dateString,
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

        this.spiral
            .set('numberOfPoints', countPoints)
            .set('period', period)
            .set('spacing', spacing)
            .set('lineWidth', spacing * 6)
            .set('binning', this.binning)
            .set('timeSpan', 
                startMoment.format('YYYY/MM/DD') +
                ' - ' +
                endMoment.format('YYYY/MM/DD'))
            .set('currentMedication', this.currentMedication)
            .set('expectedFrequency', expectedFrequency);

        // Save extra state outside of Spiral instance
        this.data = data;

        this.populate(data, spiralID);
    };

    SpiralVisualization.prototype.populate = function(data, id) {
        /*
        var spiral = nodes.getVizs(id)[0];
        spiral.randomData();
        var svg = spiral.render();
        var svg = heatMap.html;
        diseaseNames = processSelectedList(heatMap.this.diseases);
        medicationNames = processSelectedList(heatMap.this.medications);
        */

        //spiral.randomData();
        this.spiral.processData(data);
        this.html = this.spiral.render();
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
            this.binning = state.binning;
            this.spiral.set('binning', this.binning);

            this.makeBins();
        }
        if (state.medications) {
            this.medications = state.medications;
        }
        if (state.currentMedication) {
            if (this.currentMedication !== state.currentMedication) {
                this.binning = null;
                this.currentMedication = state.currentMedication;
            }

            this.makeBins();
        }
    };

    return SpiralVisualization;
}]);
