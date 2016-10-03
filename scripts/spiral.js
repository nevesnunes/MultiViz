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
        // which we will use in factory methods
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

    var nextInterval = function(interval) {
        switch (interval) {
            case 'years': {
                // FIXME: Try setting smaller date range
                return 'years';
            }
            case 'months': {
                return 'years';
            }
            case 'weeks': {
                return 'months';
            }
            case 'days': {
                return 'weeks';
            }
            default: {
                return interval;
            }
        } //switch
    };

    SpiralVisualization.prototype.makeDescription = function(elementID) {
        if (elementID === undefined) {
            console.log("[WARN] @make: undefined id.");
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

    SpiralVisualization.prototype.make = function(
            elementID, spiralID, isChecked) {
        if (elementID === undefined) {
            console.log("[WARN] @make: undefined id.");
            return;
        }

        var patient = patientData.getAttribute(patientData.KEY_PATIENT);
        var patientMedicationIndex = utils.arrayObjectIndexOf(
                patient.medications, this.currentMedication, "name");
        var patientMedications = patient.medications[patientMedicationIndex];

        var startMoment = moment(patientMedications.startDate);
        var endMoment = moment(patientMedications.endDate);
        var expectedFrequency = patientMedications.expectedFrequency;
        var recordedFrequency = patientMedications.recordedFrequency;

        var countTimeSpan = 0;
        var period = 7;

        var interval = "";
        switch (expectedFrequency) {
            case 'Anual': {
                interval = 'years';
                break;
            }
            case 'Mensal': {
                interval = 'months';
                period = 12;
                break;
            }
            case 'Semanal': {
                interval = 'weeks';
                break;
            }
            case 'Diário': {
                interval = 'days';
                break;
            }
            default: {
            }
        } //switch
        countTimeSpan = endMoment.diff(startMoment, interval);

        // Bin data if interval is too large;
        // If the user didn't set a specific binning, we compute the most
        // adequate one based on expected frequency range
        // FIXME
        //var binning = (this.binning === null) ? 'days' : this.binning;
        var binFactor = 0;
        var binInterval = interval;
        var binTimeSpan = countTimeSpan;
        while (binTimeSpan > COUNT_MAX_THRESHOLD) {
            binFactor++;
            binInterval = nextInterval(binInterval);
            binTimeSpan = endMoment.diff(startMoment, binInterval);
        }

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

            // Value is present
            if (diffDates === 0) {
                accumulatorBinDays++;
                currentDateIndex++;
            }

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

            currentMoment.add(1, interval);	
        }

        var countPoints = binTimeSpan;
        var size = 300;

        // FIXME: There's probably a less hardcoded way to compute adjustments...
        var spacing = 275 / countPoints;
        if (countPoints < 100)
            spacing *= (countPoints / 100) + 0.25 * ((100 - countPoints) / 100);
        if (countPoints < 10)
            spacing *= 1.25 * (countPoints / 10);

        this.spiral = new Spiral({
            graphType: 'custom-path',
            numberOfPoints: countPoints,
            period: period,
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
            targetElement: spiralID,
            currentMedication: this.currentMedication,
            colors: visualizations.colors,
            functions: {
                makeLegend: visualizations.makeLegend
            }
        });

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

        // spiral.randomData();
        this.spiral.processData(data);
        this.html = this.spiral.render();
    };

    SpiralVisualization.prototype.update = function(elementID, state) {
        /*
        var data = [];
        var spirals = nodes.getVizs(elementID);
        for (var j = 0; j < spirals.length; j++) {
            populate(data, spirals[j]);
        }
        */

        var node = nodes.getCurrentNode();
        var spiral = node.model.vizs[0];
        if (state.binning) {
            this.binning = state.binning;
            this.make(node.model.id, spiral.id, spiral.isChecked);
        }
        if (state.medications) {
            this.medications = state.medications;
        }
        if (state.currentMedication) {
            if (this.currentMedication !== state.currentMedication) {
                this.currentMedication = state.currentMedication;
                this.make(node.model.id, spiral.id, spiral.isChecked);
            } else {
                this.populate(this.data, spiral.id);
            }
        }
    };

    return SpiralVisualization;
}]);
