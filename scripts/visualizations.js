var moduleProviders = angular.module('moduleProviders');
var moduleUtils = angular.module('moduleUtils');
var moduleWidgetBuilder = angular.module('moduleWidgetBuilder');
var moduleVisualizations = angular.module('moduleVisualizations',
        ['moduleProviders', 'moduleUtils', 'moduleWidgetBuilder']);

moduleVisualizations.factory('visualizations',
        ['patientData', 'retrievePatientData', 'utils', 'nodes',
        function(patientData, retrievePatientData, utils, nodes) {
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
        extractBBoxes: extractBBoxes
    };
}]);
