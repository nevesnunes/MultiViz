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

        var data = [];
        var countPoints = 100;
        var size = 300;

        // FIXME: There's probably a less hardcoded way to compute adjustments...
        var spacing = 275 / countPoints;
        if (countPoints < 100)
            spacing *= (countPoints / 100) + 0.25 * ((100 - countPoints) / 100);
        if (countPoints < 10)
            spacing *= 1.25 * (countPoints / 10);

        // FIXME: Fill array from expectedFrequency with these values
        var patient = patientData.getAttribute(patientData.KEY_PATIENT);
        var patientMedicationIndex = utils.arrayObjectIndexOf(
                patient.medications, this.currentMedication, "name");
        var startMoment = moment(
                patient.medications[patientMedicationIndex].startDate);
        var endMoment = moment(
                patient.medications[patientMedicationIndex].endDate);
        var patientMedicationFrequency = 
                patient.medications[patientMedicationIndex].expectedFrequency;
        var countTimeSpan = 0;
        switch (patientMedicationFrequency) {
            case 'Anual': {
                countTimeSpan += endMoment.diff(startMoment, 'years');
                break;
            }
            case 'Mensal': {
                countTimeSpan += endMoment.diff(startMoment, 'months');
                break;
            }
            case 'Semanal': {
                countTimeSpan += endMoment.diff(startMoment, 'weeks');
                break;
            }
            case 'Diário': {
                countTimeSpan += endMoment.diff(startMoment, 'days');
                break;
            }
            default: {
            }
        } //switch

        var spiral = new Spiral({
            graphType: 'custom-path',
            numberOfPoints: countPoints,
            period: '7',
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
        spiral.randomData();
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
