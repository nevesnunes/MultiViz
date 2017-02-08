var moduleProviders = angular.module('moduleProviders');
var moduleUtils = angular.module('moduleUtils');
var moduleWidgetBuilder = angular.module('moduleWidgetBuilder');
var moduleVisualizations = angular.module('moduleVisualizations',
        ['moduleProviders', 'moduleUtils', 'moduleWidgetBuilder']);

moduleVisualizations.factory('visualizations',
        ['patientData', 'retrievePatientData', 'retrieveCountsData', 'utils', 'nodes',
        function(patientData, retrievePatientData, retrieveCountsData, utils, nodes) {
    // Each visualization's public interface (used by layout directives)
    // consists of the following methods
    var interfaceNames = [
        'make',
        
        'remove',
        
        // Used to recreate visualization nodes during layout updates.
        // Unfortunately there is no easy way to store previous nodes while
        // retaining their functionality, but we can still avoid
        // recreating the visualization object and computing all it's paths.
        'update'
    ];
    
    // Check if a object implements a function with the provided signature
    var isImplemented = function(object, name) {
        return (typeof object[name] === 'function');
    };

    // Check if the visualization implements the interface
    // defined in the factory
    var validateInterface = function(object, objectName) {
        for (var i in interfaceNames)
            if (!isImplemented(object, interfaceNames[i]))
                console.log('[Error] @validateInterface: ' + objectName +
                    ' does not implement "' + interfaceNames[i] + '"');
    };

    var customDarkGreys = 
            ["#bdbdbd","#969696","#737373","#525252","#252525","#000000"],
        buckets = customDarkGreys.length,
        colors = customDarkGreys;

    var customGreens =
            ["#c7e9c0","#a1d99b","#74c476","#41ab5d","#238b45","#005a32"];

    var processSelectedList = function(list) {
        return list.filter(function(obj) {
            return obj.selected;
        })
        .map(function(obj) {
            return obj.name;
        });
    };

    var intervals = {
        'years': {
            value: 0,
            translation: 'Ano'
        },
        'months': {
            value: 1,
            translation: 'Mês'
        },
        'weeks': {
            value: 2,
            translation: 'Semana'
        },
        'days': {
            value: 3,
            translation: 'Dia'
        }
    };

    var diffInterval = function(i1, i2) {
        return intervals[i1].value - intervals[i2].value;
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

    var translateInterval = function(interval) {
        return intervals[interval].translation;
    };
    
    // TODO: Hardcoded from filterNames
    var filterAttributes = {
        'age': {
            translation: 'Idade'
        },
        'height': {
            translation: 'Altura'
        },
        'weight': {
            translation: 'Peso'
        }
    };

    var translateFilterAttribute = function(attribute) {
        return filterAttributes[attribute].translation;
    };

    var frequencies = {
        'Anual': {
            translation: 'years'
        },
        'Mensal': {
            translation: 'months'
        },
        'Semanal': {
            translation: 'weeks'
        },
        'Diário': {
            translation: 'days'
        }
    };

    var translateFrequency = function(frequency) {
        return frequencies[frequency].translation;
    };

    var extractDatesWithInterval = function(startDate, endDate, interval) {
        var startMoment = moment(startDate, 'YYYY/MM/DD');
        var endMoment = moment(endDate, 'YYYY/MM/DD');
        var diffYears = endMoment.diff(startMoment, interval);
        var dates = [];
        while (diffYears--) {
            dates.push(startMoment.toDate());
            startMoment.add(1, interval);
        }

        // Don't include penultime date if it's too close to end date,
        // otherwise it's tick will overlap the end date tick
        if ((dates.length === 0) || (endMoment.diff(startMoment, "months") > 6))
            dates.push(startMoment.toDate());

        dates.push(endMoment.toDate());
        
        return dates;
    };

    var formatMillisecond = d3.timeFormat(".%L"),
        formatSecond = d3.timeFormat(":%S"),
        formatMinute = d3.timeFormat("%I:%M"),
        formatHour = d3.timeFormat("%I %p"),
        formatDay = d3.timeFormat("%a %d"),
        formatWeek = d3.timeFormat("%b %d"),
        formatMonth = d3.timeFormat("%B"),
        formatYear = d3.timeFormat("%Y");
    var multiFormat = function(date) {
        return (d3.timeSecond(date) < date ? formatMillisecond
            : d3.timeMinute(date) < date ? formatSecond
            : d3.timeHour(date) < date ? formatMinute
            : d3.timeDay(date) < date ? formatHour
            : d3.timeMonth(date) < date ?
                (d3.timeWeek(date) < date ? formatDay : formatWeek)
            : d3.timeYear(date) < date ? formatMonth
            : formatYear)(date);
    };

    var makeLegend = function(svg, colorScale, width, height, xMargin, y) {
        var legendRect = svg.selectAll(".legend-rect")
            .data([0].concat(colorScale.quantiles()), function(d) {
                return d;
            });
        legendRect.enter().append("rect")
            .attr("class", "legend-rect bordered")
            .merge(legendRect)
                .attr("x", function(d, i) {
                    return width * i + xMargin;
                })
                .attr("y", y)
                .attr("width", width)
                .attr("height", height / 2)
                .style("fill", function(d, i) {
                    return colors[i];
                })
                .on("mouseover", function(d) {
                    // select the parent and sort the paths
                    svg.selectAll(".legend-rect").sort(function (a, b) {
                        // a is not the hovered element, send "a" to the back
                        if (a != d) return -1;
                        // a is the hovered element, bring "a" to the front
                        else return 1;                             
                    });
                });
        legendRect.exit().remove();

        var legendText = svg.selectAll(".legend-text")
            .data([0].concat(colorScale.quantiles()), function(d) {
                return d;
            });
        legendText.enter().append("text")
            .attr("class", "legend-text text-label")
            .merge(legendText)
                .text(function(d) {
                    return "≥ " + Math.round(d);
                })
                .attr("x", function(d, i) {
                    return width * i + xMargin;
                })
                .attr("y", y + height);
        legendText.exit().remove();
    };

    var extractBBoxes = function(selection) {
        var textData = [];
        selection.each(function(d, i) {            
            var text = d3.select(this);
            textData.push({
                name: text.datum(),
                // FIXME: If invalid elements are present,
                // getBBox() causes firefox to throw exceptions
                width: text.node().getBBox().width 
            });
        });

        return textData;
    };

    var adjustHandles = function(group) {
        group.selectAll(".handle--e")
            .attr("width", 10)
            .attr("transform", "translate(" +
                3 + ")");
        group.selectAll(".handle--w")
            .attr("width", 10)
            .attr("transform", "translate(" +
                -3 + ")");
    };

    //
    // Adaptation of `observer` pattern to broadcast
    // filter changes to all visible views
    //
    // Generic observer with common methods
    //

    var filterObserver = Object.freeze({
        add: function(observer, nodeID) {
            if (observer.handlers.indexOf(nodeID) === -1)
                observer.handlers.push(nodeID);
        },
        dispatch: function(observer) {
            observer.handlers.forEach(function(handler) {
                populateWithFilters(handler);
            });
        },
        remove: function(observer, nodeID) {
            observer.handlers.pop(nodeID);
        }
    });

    //
    // Visualization methods for concrete observers
    //
    
    var makeFilterAge = function(nodeID) {
        var data = retrieveCountsData.retrieveAges();
        var filter = getFilterByName(filterNames.AGE);
        makeFilterHistogram(
            filter,
            {
                currentPatientData: data.currentPatientData,
                data: data.data,
                xMin: data.min,
                xMax: data.max,
            },
            filter.name,
            nodeID);
    };

    var extractFilterAgeState = function(renderer) {
        return renderer.intervalValues;
    };

    var makeFilterWeight = function(nodeID) {
        var data = retrieveCountsData.retrieveWeights();
        var filter = getFilterByName(filterNames.WEIGHT);
        makeFilterHistogram(
            filter,
            {
                currentPatientData: data.currentPatientData,
                data: data.data,
                xMin: data.min,
                xMax: data.max,
            },
            filter.name,
            nodeID);
    };

    var extractFilterWeightState = function(renderer) {
        return renderer.intervalValues;
    };

    var makeFilterHeight = function(nodeID) {
        var data = retrieveCountsData.retrieveHeights();
        var filter = getFilterByName(filterNames.HEIGHT);
        makeFilterHistogram(
            filter,
            {
                currentPatientData: data.currentPatientData,
                data: data.data,
                xMin: data.min,
                xMax: data.max,
            },
            filter.name,
            nodeID);
    };

    var extractFilterHeightState = function(renderer) {
        return renderer.intervalValues;
    };

    //
    // Concrete observers
    //

    var filterNames = Object.freeze({
        AGE: "age",
        WEIGHT: "weight",
        HEIGHT: "height"
    });

    var filters = [
        Object.freeze({
            handlers: [],
            make: makeFilterAge,
            name: filterNames.AGE,
            renderer: {
                intervalValues: [],
                intervalPos: [],
                x: null,
                brush: null,
                brushed: null
            },
            extractState: extractFilterAgeState
        }),
        Object.freeze({
            handlers: [],
            make: makeFilterWeight,
            name: filterNames.WEIGHT,
            renderer: {
                intervalValues: [],
                intervalPos: [],
                x: null,
                brush: null,
                brushed: null
            },
            extractState: extractFilterWeightState
        }),
        Object.freeze({
            handlers: [],
            make: makeFilterHeight,
            name: filterNames.HEIGHT,
            renderer: {
                intervalValues: [],
                intervalPos: [],
                x: null,
                brush: null,
                brushed: null
            },
            extractState: extractFilterHeightState
        })
    ];

    var getFilterByName = function(name) {
        var filter;
        filters.some(function(obj, i) {
            return (obj.name === name) ? ((filter = filters[i]), true) : false;
        });
        return filter;
    };

    var populateWithFilters = function(nodeID) {
        // FIXME: Hardcoded
        var vizObject = nodes.getVizs(nodeID)[0].vizObject;
        var extractedFilters = [];
        filters.forEach(function(filter) {
            extractedFilters.push({
                name: filter.name,
                state: filter.extractState(filter.renderer)
            });
        });
        vizObject.populate(extractedFilters);
    };

    var removeFilters = function() {
        filters.forEach(function(filter, i) {
            filter.handlers.forEach(function(handler) {
                filterObserver.remove(filters[i], handler);
            });
            d3.selectAll('#filters-' + filter.name)
                .remove();
        });
    };

    var addFiltersFromNames = function(nodeID, vizID, names) {
        filters.forEach(function(filter, i) {
            if (names.indexOf(filter.name) !== -1) {
                filterObserver.add(filters[i], nodeID, vizID);
            }
        });
    };

    var makeFilters = function() {
        // TODO: Support multiple views layout
        filters.forEach(function(filter, i) {
            if (filter.handlers.length)
                filter.make(filter.handlers[0]);
        });
    };

    var makeFilterHistogram = function(observer, dataObserver, name, nodeID) {
        var vizWidth = angular.element(
            '#action-panel'
        )[0].offsetWidth;
        var padding = 10;
        var vizHeight = padding * 8;
        var svg = d3.select('#filters-' + nodeID)
            .append("svg")
            .attr('id', 'filters' + name)
            .attr("width", vizWidth)
            .attr("height", vizHeight);

        //
        // reset
        //
        svg.append("text")
            .attr("transform", "translate(" +
                0 + "," +
                padding + ")")
            .text(translateFilterAttribute(observer.name));
        svg.append("a")
            .attr('xlink:href', '#')
            .append("text")
                .attr('id', 'filters-' + name + '-reset')
                .attr('class', 'link')
                .style('fill', '#337ab7')
                .style('text-anchor', 'end')
                .attr('startOffset', '100%')
                .attr("transform", "translate(" +
                    vizWidth + "," +
                    padding + ")")
                .text('Reset')
                .on('click', function() {
                    var svg = d3.select('#filters' + name);
                    svg.select(".temporal-line-brush")
                        .call(
                            observer.renderer.brush.move,
                            observer.renderer.x.range().slice());
                });

        //
        // axis
        //
        var vizContentWidth = vizWidth - padding * 4;
        
        var x2 = d3.scaleLinear().range([0, vizContentWidth]);
        x2.domain([dataObserver.xMin, dataObserver.xMax]);
        var xAxis = d3.axisBottom(x2)
            .tickValues([dataObserver.xMin, dataObserver.xMax]);
        var axisHeight = vizHeight / 2;
        svg.selectAll(".line-axis").remove();
        svg.append("g")
            .attr("class", "x axis line-axis")
            .attr("height", axisHeight)
            .attr("transform", "translate(" +
                ((vizWidth - vizContentWidth) / 2) + "," +
                (axisHeight + padding * 2) + ")")
            .call(xAxis);

        //
        // bars
        //
        var histogramHeight = vizHeight / 2;
        var x = d3.scaleBand().range([0, vizContentWidth + 1]),
            y = d3.scaleLinear().range([histogramHeight, 0]);

        var data = dataObserver.data;
        x.domain(data.map(function(d, i) { return i; }));
        var maxY = d3.max(data, function(d) { return d; });
        y.domain([0, maxY]);

        var g = svg.append("g")
            .attr("height", histogramHeight)
            .attr("transform", "translate(" +
                ((vizWidth - vizContentWidth) / 2) + "," +
                (padding * 2) + ")");
        var histogram = g.selectAll(".histogram")
            .data(data);
        var histogramGroup = histogram.enter();
        histogramGroup.append("rect")
            .attr("class", "filter-bar")
            .merge(histogram)
                .attr("x", function(d, i) { 
                        return x(i); 
                    })
                .attr("y", function(d) { return y(d); })
                .attr("width", x.bandwidth())
                .attr("height", function(d) { return histogramHeight - y(d); });

        //
        // patient mark
        //
        var diamondSize = 5;
        var diamondPath = "M " + (0) + " " +
                (diamondSize) + " " +
            "L " + (diamondSize * 1) + " " +
                (diamondSize * 2) + " " +
            "L " + (diamondSize * 2) + " " +
                (diamondSize * 1) + " " +
            "L " + (diamondSize) + " " +
                (0) + " " +
            "Z";
        svg.append("path")
            .attr("class", "markPresent")
            .attr("d", diamondPath)
            .attr("transform", function() {
                var xPos = x(dataObserver.currentPatientData); 
                var yPos = (axisHeight + padding * 2);

                return "translate(" + xPos + "," + yPos + ")";
            });

        //
        // brush
        //
        var brushed = function() {
            if ((d3.event.sourceEvent && 
                    // Ignore brush-by-zoom
                    d3.event.sourceEvent.type === "zoom") ||
                    // Ignore empty selections.
                    (!d3.event.selection)) {
                observer.renderer.intervalValues = [];
                observer.renderer.intervalPos = [];
                return; 
            }

            var d0 = d3.event.selection.map(x2.invert);

            // Record the new dates to be used when calculating new bins
            observer.renderer.intervalValues = [
                Math.floor(d0[0]),
                Math.floor(d0[1])
            ];

            // Record selection coordinates in order to restore them
            // after the new bins are made
            observer.renderer.intervalPos = [
                d3.event.selection[0],
                d3.event.selection[1]
            ];

            // Show `reset` button if changes were made
            var xRange = x.range();
            if ((observer.renderer.intervalPos[0] === xRange[0]) &&
                (observer.renderer.intervalPos[1] === xRange[1])) {
                d3.select('#filters-' + name + '-reset')
                    .style('display', 'none');
            } else {
                d3.select('#filters-' + name + '-reset')
                    .style('display', 'initial');
            }

            filterObserver.dispatch(observer);
        };

        var brushPos;
        if (observer.renderer.intervalPos.length > 0) {
            brushPos = observer.renderer.intervalPos.slice();
        } else {
            brushPos = x.range();
        }
        var brush = d3.brushX()
            .extent([
                [0, 0],
                [vizContentWidth, histogramHeight]
            ])
            .on("end", brushed);
        g.selectAll(".temporal-line-brush").remove();
        var gBrush = g.append("g")
            .attr("class", "brush temporal-line-brush")
            .call(brush);
        adjustHandles(gBrush);
        gBrush.call(brush.move, brushPos);

        // Store brush functions for later calls
        observer.renderer.x = x;
        observer.renderer.brush = brush;
        observer.renderer.brushed = brushed;
    };

    return {
        validateInterface: validateInterface,
        colors: colors,
        customGreens: customGreens,
        processSelectedList: processSelectedList,
        diffInterval: diffInterval,
        nextInterval: nextInterval,
        translateInterval: translateInterval,
        translateFrequency: translateFrequency,
        extractDatesWithInterval: extractDatesWithInterval, 
        makeLegend: makeLegend,
        extractBBoxes: extractBBoxes,
        adjustHandles: adjustHandles,
        removeFilters: removeFilters,
        makeFilters: makeFilters,
        addFiltersFromNames: addFiltersFromNames,
        populateWithFilters: populateWithFilters,
        getFilterByName: getFilterByName,
        filterObserver: filterObserver,
        filterNames: filterNames,
        filters: filters
    };
}]);
