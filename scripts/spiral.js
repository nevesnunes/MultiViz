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
                    "</div>" +
                    "</br>" +
                    "<div style=\"text-align: left\" class=\"p\">" +
                        "Os <b>intervalos sobrepostos</b> " +
                        "são assinalados (" +
                        "<div style=\"display: inline-block\" class=\"" +
                            "markPatientAttribute markOverlap markSquare\" />" +
                        ")." +
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
        this.currentMedication = [options.currentMedication];
        this.currentAttributeType = attributeType.DISEASES;
        this.currentModificationType = modificationType.DATA;

        // Specific state is maintained in a separate object,
        // which we will use in our facade
        this.visualizationRenderer = null;

        // When we create a joined spiral, we store the state of the
        // original objects
        this.visualizationAncestors = [];

        this.attributeData = null;
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

    var toLabel = function(names) {
        return names.reduce(function(old, property, index) {
            var delimiter = (index > 0) ? " + " : "";
            return old + delimiter + property;
        }, '');
    };

    SpiralVisualization.prototype.makeDescription = function(elementID) {
        if (elementID === undefined) {
            console.log("[WARN] @make: undefined id.");
            return;
        }
        
        return '<p class="viz-title">' +
                'Análise temporal de medicações' +
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

        self.layout = {
            size: 300,
            marginLine: 60,
            padding: 10
        };

        // Compute size based on available view width and spiral width
        self.layout.vizWidth = angular.element('.main')[0]
            .offsetWidth - (self.layout.size / 3);
        this.visualizationRenderer = new Spiral({
            svgWidth: self.layout.size,
            svgHeight: self.layout.size + 50,
            lineRangeX: (self.layout.vizWidth - self.layout.size) - 
                (self.layout.marginLine * 2) - 
                (self.layout.padding * 2),
            margin: {
                top: -30,
                right: 0,
                bottom: 0,
                left: 0
            },
			marginLine: self.layout.marginLine,
			padding: self.layout.padding,
            parentElement: elementID,
            targetElement: spiralID,
            colors: visualizations.colors,
            customReds: visualizations.customReds,
            functions: {
                // This is ugly, this is amazing, this is js ;)
                makeBins: (function() {
                   self.makeBins();
                }).bind(self),
                makeLegend: visualizations.makeLegend,
                adjustHandles: visualizations.adjustHandles,
                extractDatesWithInterval: visualizations.extractDatesWithInterval,
                translateInterval: visualizations.translateInterval
            },
            currentMedication: toLabel(self.currentMedication)
        });

        // Store new spiral for later joins
        if (self.visualizationAncestors.length === 0)
            self.visualizationAncestors.push(
                utils.extend(self.visualizationRenderer)
            );

        self.makeBins();
    };

    SpiralVisualization.prototype.makeBins = function() {
        // Extract patient data
        var patientMedications;
        if (this.attributeData) {
            patientMedications = this.attributeData;
        } else {
            // FIXME: Hardcoded first index, we expect this condition
            // to only happen on spiral creation
            var patient = patientData.getAttribute(patientData.KEY_PATIENT);
            var patientMedicationIndex = utils.arrayObjectIndexOf(
                    patient.medications, this.currentMedication[0], "name");
            patientMedications = patient.medications[patientMedicationIndex];
        }
        var recordedDosage = patientMedications.dosage;
        this.recordedDosage = recordedDosage;
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
        var binDosageObjects = [];
        for (var i = 0, currentDateIndex = 0; !isLastDate; i++) {
            var recordedMoment = moment(recordedFrequency[currentDateIndex]);
            var diffDates = currentMoment.diff(recordedMoment, interval);
            var diffBinDate = currentMoment.diff(currentBinMoment, interval);

            isBeforeEndDate = 
                (currentMoment.diff(lastRecordedMoment, interval) <= 0);
            isFirstDate = (currentDateIndex === 0);
            isLastDate = (currentDateIndex == recordedFrequency.length - 1);

            // Keep track of any new names in bin interval
            if (currentDateIndex < recordedDosage.length) {
                recordedDosage[currentDateIndex].forEach(function(dosage) {
                    var binDosageIndex = utils.arrayObjectIndexOf(
                        binDosageObjects, dosage.name, "name");
                    if (binDosageIndex === -1) {
                        binDosageObjects.push(dosage);
                    }
                });
            }

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

                // Extract all dosages for each medication in the current date
                var dosage = (accumulatorBinDays > 0) ? (binDosageObjects
                    .reduce(function(old, property, index) {
                        var delimiter = (index > 0) ? " + " : "";
                        return old + delimiter + property.dosage +
                            ' (' + property.name + ') ';
                    }, '')) :
                    "0";

                // If moment is contained in the brush interval, add date to
                // brushed data
                if ((currentMoment.diff(intervalStartMoment, interval) >= 0) &&
                        (currentMoment.diff(intervalEndMoment, interval) <= 0)) {
                    brushedData.push({
                        value: accumulatorBinDays,
                        dosage: dosage,
                        date: dateString,
                        startDate: startDateString,
                        endDate: endDateString,
                        binFactor: binFactor,
                        countAttributes: binDosageObjects.length
                    });
                }
                data.push({
                    value: accumulatorBinDays,
                    dosage: dosage,
                    date: dateString,
                    startDate: startDateString,
                    endDate: endDateString,
                    binFactor: binFactor,
                    countAttributes: binDosageObjects.length
                });

                accumulatorBinDays = 0;
                binDosageObjects = [];

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
            .set('currentMedication', toLabel(this.currentMedication))
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
        var self = this;

        // Remove previous nodes/handlers, since they are invalidated by the
        // new DOM layout
        this.visualizationRenderer.remove();

        // View size may have change, so compute a new temporal line width
        self.layout.vizWidth = angular.element('.main')[0]
            .offsetWidth - (self.layout.size / 3);
        this.visualizationRenderer
            .set('lineRangeX', (self.layout.vizWidth - self.layout.size) - 
                (self.layout.marginLine * 2) - 
                (self.layout.padding * 2));

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

    SpiralVisualization.prototype.makeFilters = function(
            nodeID, vizID) {
        d3.select('#filters-' + nodeID)
            .html('<div>TODO</div>');
    };

    SpiralVisualization.prototype.update = function(nodeID, vizID, state) {
        // FIXME: Review makeBins not called more than once
        var spiral = nodes.getVizByIDs(nodeID, vizID);
        var areBinsBeingCreated = false;
        if (state.binning) {
            this.binning = state.binning;
            this.visualizationRenderer.set('binning', this.binning);

            areBinsBeingCreated = true;
        }
        if (state.medications) {
            // Remove all previous data,
            // including attribute data from joined spirals
            this.medications = state.medications;
            this.attributeData = null;
        }
        if (state.currentMedication) {
            if (this.currentMedication.indexOf(state.currentMedication) === -1) {
                this.binning = null;
                this.currentMedication.push(state.currentMedication);
                this.visualizationRenderer
                    .set('currentMedication', toLabel(this.currentMedication))
                    // Invalidate previous brushing
                    .set('intervalDates', [])
                    .set('intervalPos', []);
            }

            areBinsBeingCreated = true;
        }
        if (state.joinData) {
            this.attributeData = state.joinData.attributeData;

            this.visualizationAncestors.push(
                state.joinData.targetRenderer
            );

            // Expected frequency has changed: use the most fine-grained one
            var diffIntervals = visualizations.diffInterval(
                visualizations.translateFrequency(
                    this.attributeData.expectedFrequency),
                visualizations.translateFrequency(
                    this.expectedFrequency));
            this.expectedFrequency = (diffIntervals > 0) ?
                this.attributeData.expectedFrequency :
                this.expectedFrequency;

            // Invalidate previous binning: Data has changed, therefore
            // we need to compute the appropriate binning
            this.binning = null;
            /*
            this.binning = visualizations.translateFrequency(
                this.expectedFrequency);
             */

            this.visualizationRenderer
                .set('binning', this.binning)
                // Invalidate previous brushing: Data has changed
                .set('intervalDates', [])
                .set('intervalPos', []);
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

    var modificationType = Object.freeze({
        NONE: "none",
        DATA: "data",
        FILTERS: "filters"
    });

    SpiralVisualization.prototype.isModificationTypeActive = function(type) {
        return this.currentModificationType === type;
    };

    SpiralVisualization.prototype.getModificationTypes = function(type) {
        return modificationType;
    };

    SpiralVisualization.prototype.setCurrentModificationType = function(type) {
        this.currentModificationType = type;
    };

    visualizations.validateInterface(
        SpiralVisualization.prototype, "SpiralVisualization"
    );
            
    return SpiralVisualization;
}]);
