var moduleVisualizations = angular.module('moduleVisualizations');

moduleVisualizations.directive('directiveSpiralTooltip', function() {
    return {
        link: function (scope, element, attrs) {
            scope.setTooltipText = function(button) {
                scope.tooltipText = 
                    "<div style=\"text-align: left\" class=\"p\">" +
                        "Encontre padrões temporais em atributos " +
                        "do paciente actual." +
                    "</div>" +
                    "</br>" +
                    "<div style=\"text-align: left\" class=\"p\">" +
                        "As <b>datas mais recentes</b> " +
                        "correspondem a sectores mais afastados do " +
                        "centro de uma espiral." +
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
        this.currentAttributeType = attributeType.DISEASES;

        // Specific state is maintained in a separate object,
        // which we will use in our facade
        this.visualizationRenderer = null;

        this.binning = null;
        this.expectedFrequency = null;
        this.hasData = true;
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
                '<img class="tooltip-wrapper help" ' +
                    'title="{{tooltipText}}" ' + 
                    'directive-tooltip directive-spiral-tooltip ' +
                    'src="images/controls/info.svg">' +
                '</img>' +
                '</p>';
    };

    SpiralVisualization.prototype.make = function(elementID, spiralID) {
        var self = this;
        if (elementID === undefined) {
            console.log("[WARN] @make: undefined id.");
            return;
        }

        // Compute size based on available view width
        var vizWidth = angular.element('#' + elementID)[0]
            .offsetWidth;
        var size = 300;
        var marginLine = 60;
        var padding = 10;
        this.visualizationRenderer = new Spiral({
            svgWidth: size,
            svgHeight: size + 50,
            lineRangeX: (vizWidth - size) - (marginLine * 2) - (padding * 2),
            margin: {
                top: -30,
                right: 0,
                bottom: 0,
                left: 0
            },
			marginLine: marginLine,
			padding: padding,
            parentElement: elementID,
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

    SpiralVisualization.prototype.makeBins = function(attributeData) {
        // Extract patient data
        var patientMedications;
        if (attributeData) {
            patientMedications = attributeData;
        } else {
            var patient = patientData.getAttribute(patientData.KEY_PATIENT);
            var patientMedicationIndex = utils.arrayObjectIndexOf(
                    patient.medications, this.currentMedication, "name");
            patientMedications = patient.medications[patientMedicationIndex];
        }
        var expectedFrequency = patientMedications.expectedFrequency;
        this.expectedFrequency = expectedFrequency;
        var recordedFrequency = patientMedications.recordedFrequency;
        this.recordedFrequency = recordedFrequency;

        // Check if interval was defined in temporal line brush;
        // Otherwise, use expected start and end dates
        var intervalStartMoment = moment(recordedFrequency[0]);
        var intervalEndMoment = moment(
                recordedFrequency[recordedFrequency.length - 1]);
        var interval = visualizations.translateFrequency(expectedFrequency);
        var intervalDates = this.visualizationRenderer.getIntervalDates();
        if (intervalDates.length > 0) {
            // Brush intervals may specify dates outside of the recorded range,
            // so we only apply them if they are inside this range
            if (intervalStartMoment.diff(intervalDates[0], interval) <= 0) {
                intervalStartMoment = intervalDates[0];
            }
            if (intervalEndMoment.diff(intervalDates[1], interval) >= 0) {
                intervalEndMoment = intervalDates[1];
            }
        }

        // Special case: Only one data point causes interval start and end to be
        // the same, so we rectify that here
        var startMoment = moment(patientMedications.startDate);
        var endMoment = moment(patientMedications.endDate);
        if (intervalStartMoment.diff(intervalEndMoment, 'days') === 0) {
            intervalStartMoment = startMoment.clone();
        }

        // No recorded data available;
        // Remember this check for visualization updates
        if (recordedFrequency.length === 0) {
            this.hasData = false;
            this.visualizationRenderer.renderNoData();

            return;
        } else {
            this.hasData = true;
        }

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

        // Populate data by checking if values are present
        // for each possible moment
        var data = [];
        var brushedData = [];
        var currentMoment = startMoment.clone();	
        var previousBinMoment = moment(recordedFrequency[0]);
        var currentBinMoment;

        // If our bin interval is a single value, then the previous and
        // current bin moments are the same
        if (binFactor > 0) {
            currentBinMoment = previousBinMoment.clone().add(1, binInterval);
        } else {
            currentBinMoment = previousBinMoment.clone();
        }

        // Instead of relying in time difference between the
        // start moment and the end moment, we compute the difference between the
        // current moment and the last recorded moment.
        // This way we avoid incorrect time span counting due to factors such as
        // daylight saving time adjustments between dates.
        var lastRecordedMoment = moment(recordedFrequency[
            recordedFrequency.length - 1
        ]);
        var isBeforeEndDate = true;
        var isFirstDate = false;
        var isLastDate = false;

        var recordedStartMoment = moment(recordedFrequency[0]);
        var recordedEndMoment = moment(
                recordedFrequency[recordedFrequency.length - 1]);

        var accumulatorBinDays = 0;
        for (var i = 0, currentDateIndex = 0; !isLastDate; i++) {
            var recordedMoment = moment(recordedFrequency[currentDateIndex]);
            var diffDates = currentMoment.diff(recordedMoment, interval);
            var diffBinDate = currentMoment.diff(currentBinMoment, interval);

            isBeforeEndDate = 
                (currentMoment.diff(lastRecordedMoment, interval) <= 0);
            isFirstDate = (currentDateIndex === 0);
            isLastDate = (currentDateIndex == recordedFrequency.length - 1);

            // A recorded value in the current date is present:
            // Save it and advance to the next recorded date
            if ((diffDates === 0) ||
                    // Recorded moment not reached by time span
                    // FIXME: dirty workaround
                    ((!isBeforeEndDate || isLastDate) && (diffDates < 0))) {
                accumulatorBinDays++;
                currentDateIndex++;
            }

            // The bin interval ended or point limit reached:
            // Add accumulated values to data
            if ((diffBinDate === 0) || isLastDate) {
                // First and last bins should limit interval with recorded date
                if (isFirstDate || isLastDate)
                    currentBinMoment = recordedMoment.clone();

                var startDateString;
                var endDateString;
                var dateString;
                if (binFactor > 0) {
                    startDateString = previousBinMoment.format('YYYY/MM/DD');
                    endDateString = currentBinMoment.format('YYYY/MM/DD');
                    dateString = startDateString + ' - ' + endDateString;
                } else {
                    // If our bin interval is a single value, then
                    // use the recorded date, otherwise a user may think the
                    // bin date is the recorded date
                    if (accumulatorBinDays > 0) {
                        startDateString = recordedMoment.format('YYYY/MM/DD');
                    } else {
                        startDateString = currentBinMoment.format('YYYY/MM/DD');
                    }
                    endDateString = startDateString;
                    dateString = endDateString;
                }

                // Extract multiple attribute names, if this is a joined spiral
                var attributeNames = (patientMedications.attributeNames) ?
                    patientMedications.attributeNames[currentDateIndex] :
                    null;

                // If moment is contained in the brush interval, add date to
                // brushed data
                if ((currentMoment.diff(intervalStartMoment, interval) >= 0) &&
                        (currentMoment.diff(intervalEndMoment, interval) <= 0)) {
                    brushedData.push({
                        value: accumulatorBinDays,
                        dosage: patientMedications.dosage,
                        date: dateString,
                        startDate: startDateString,
                        endDate: endDateString,
                        binFactor: binFactor,
                        attributeNames: attributeNames
                    });
                }
                data.push({
                    value: accumulatorBinDays,
                    dosage: patientMedications.dosage,
                    date: dateString,
                    startDate: startDateString,
                    endDate: endDateString,
                    binFactor: binFactor,
                    attributeNames: attributeNames
                });

                accumulatorBinDays = 0;

                // Advance to the next bin;
                // Add a day to the start of the next sector,
                // since that day has been counted in the previous sector.
                previousBinMoment = currentBinMoment.clone().add(1, "days");
                currentBinMoment.add(1, binInterval);
            }

            // Advance to the next possible date
            currentMoment.add(1, interval);	
        }

        // The difference for the bin interval may be zero, but the time span
        // should always be greater then zero
        binTimeSpan = Math.max(binTimeSpan, 1);

        var countPoints = binTimeSpan;

        // Set default period for the given interval
        var period = 7;
        if (binInterval === 'days')
            period = 30;
        else if (binInterval === 'months')
            period = 12;

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
        if (this.hasData) {
            this.visualizationRenderer.render(true);
        } else {
            this.visualizationRenderer.renderNoData();
        }
    };

    SpiralVisualization.prototype.update = function(nodeID, vizID, state) {
        // FIXME: Review makeBins not called more than once
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
        if (state.attributeData) {
            this.makeBins(state.attributeData);
        }
    };

    var possibleBinnings = [
        { bin: 'days', label: 'Dia' },
        { bin: 'weeks', label: 'Semana' },
        { bin: 'months', label: 'Mês' },
        { bin: 'years', label: 'Ano' }
    ];
    SpiralVisualization.prototype.extractAvailableBinnings = function() {
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

    SpiralVisualization.prototype.modifyDetailsVisibility =
            function(isMaximized) {
        // When we don't have data, we simply show all the attribute text
        if (isMaximized || !(this.hasData)) {
            this.visualizationRenderer.renderVisibleDetails();
        } else {
            this.visualizationRenderer.renderNoVisibleDetails();
        }
    };

    var attributeType = Object.freeze({
        NONE: "none",
        DISEASES: "diseases",
        MEDICATIONS: "medications"
    });

    SpiralVisualization.prototype.isAttributeTypeActive = function(type) {
        return this.currentAttributeType === type;
    };

    SpiralVisualization.prototype.getAttributeTypes = function(type) {
        return attributeType;
    };

    SpiralVisualization.prototype.setCurrentAttributeType = function(type) {
        this.currentAttributeType = type;
    };

    visualizations.validateInterface(
        SpiralVisualization.prototype, "SpiralVisualization"
    );
            
    return SpiralVisualization;
}]);
