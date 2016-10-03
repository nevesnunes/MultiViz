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
        this.dataIncidences = null;

        // Patient attribute lists
        this.medications = options.medications;
        this.currentMedication = options.currentMedication;

        this.html = null;
    };

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
                period = 7;
                break;
            }
            case 'Diário': {
                interval = 'days';
                break;
            }
            default: {
            }
        } //switch
        countTimeSpan += endMoment.diff(startMoment, interval);

        // Populate data by checking if values are present for each given moment
        var data = [];
        var currentMoment = startMoment.clone();	
        for (var i = 0, currentDateIndex = 0; i < countTimeSpan; i++) {
            currentMoment.add(1, interval);	

            var recordedMoment = moment(recordedFrequency[currentDateIndex]);
            var diffDates = currentMoment.diff(recordedMoment, interval);
            console.log(diffDates);
            
            // Recorded date is earlier than expected: Include missing values
            if (diffDates > 0) {
                while (diffDates !== 0) {
                    data.push({
                        value: 0,
                        date: recordedMoment.format('YYYY/MM/DD')
                    });
                    recordedMoment.add(1, interval);
                    diffDates = currentMoment.diff(recordedMoment, interval);
                } 
            }

            // Value is present
            if (diffDates === 0) {
                data.push({
                    value: 1 * patientMedications.dosage,
                    date: recordedMoment.format('YYYY/MM/DD')
                });
                currentDateIndex++;

            // No value in expected moment
            } else {
                data.push({
                    value: 0,
                    date: recordedMoment.format('YYYY/MM/DD')
                });
            }
        }

        var countPoints = countTimeSpan;
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
        // spiral.randomData();
        spiral.processData(data);
        this.html = spiral.render();

        this.populate(data, this.html);
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
        this.medications = state.medications;
        this.currentMedication = state.currentMedication;
        this.make(node.model.id, spiral.id, spiral.isChecked);
    };

    return SpiralVisualization;
}]);
