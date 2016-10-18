function Spiral(parameters) {
    this.option = {
        graphType: parameters.graphType || "custom-path",
        numberOfPoints: parameters.numberOfPoints || null,
        period: parameters.period || 12,
        svgHeight: parameters.svgHeight || 0,
        svgWidth: parameters.svgWidth || 0,
        lineRange: {
            x: parameters.svgWidth * 2,
            y: parameters.svgHeight / 10
        },
        margin: parameters.margin || {
            top: 10,
            right: 10,
            bottom: 10,
            left: 30
        },
        marginLine: 60,
        padding: parameters.padding || 10,
        spacing: parameters.spacing || 1,
        lineWidth: parameters.lineWidth || 50,
        targetElement: parameters.targetElement || '#chart',
        data: parameters.data || [],
        tickMarkNumber: parameters.tickMarkNumber || [],
        tickMarkLabels: parameters.tickMarkLabels || [],
        color: parameters.color || 'black',
        colors: parameters.colors || ["#bdbdbd","#969696","#737373","#525252","#252525","#000000"],
        functions: parameters.functions || {},
        currentMedication: parameters.currentMedication,
        intervalDates: [],
        intervalPos: [],
        isBeingCreated: true,
        isIntervalBeingChanged: false
    };

    this.make();
}

Spiral.prototype.make = function() {
    // Compute position
    var width = this.option.svgWidth - 
            this.option.margin.left - this.option.margin.right;
    var height = this.option.svgHeight - 
            this.option.margin.top - this.option.margin.bottom;
    this.option.x = d3.scaleLinear()
            .range([0, width])
            .domain([-this.option.svgWidth, this.option.svgWidth]);
    this.option.y = d3.scaleLinear()
            .range([height, 0])
            .domain([-this.option.svgHeight, this.option.svgHeight]);

    // Make initial element properties
    var svg = d3.select('#' + this.option.targetElement);

    // Details
    svg.select('#' + this.option.targetElement + "-details")
        .style('float', 'right');
    svg.select('#' + this.option.targetElement + "-attribute-text")
        // Align with axis
        .style('margin-left',
            (this.option.margin.left + this.option.marginLine) + "px")
        .style('margin-bottom', "20px");
    svg.select('#' + this.option.targetElement + "-current-binning")
        // Align with axis
        .style('margin-left',
            (this.option.margin.left + this.option.marginLine) + "px")
        .style('margin-bottom', "20px");
    svg.select('#' + this.option.targetElement + "-svg-line-text")
        // Align with axis
        .style('margin-left',
            (this.option.margin.left + this.option.marginLine) + "px");
    svg.select('#' + this.option.targetElement + "-svg-line")
        .append("svg")
        .append("g")
            .attr("transform", "translate(" +
                (this.option.margin.left + this.option.marginLine) + "," +
                (this.option.padding / 2) + ")");

    // Main
    svg.select('#' + this.option.targetElement + "-main")
        .style('float', 'left');
    svg.select('#' + this.option.targetElement + "-title")
        .style('margin-left',
            (this.option.margin.left) + "px")
        .style("width", this.option.svgWidth);
    svg.select('#' + this.option.targetElement + "-svg-spiral")
        .append("svg")
        .append("g")
            .attr("transform", "translate(" +
                this.option.margin.left + "," +
                this.option.margin.top + ")");
    this.option.html = svg;
};

Spiral.prototype.set = function(key, value) {
    this.option[key] = value;
    return this;
};

Spiral.prototype.cartesian = function(radius, angle, size) {
    var self = this;
    var option = self.option;

    var xPos = option.x(radius * Math.cos(angle));
    var yPos = option.y(radius * Math.sin(angle));
    return [xPos, yPos, size];
};

Spiral.prototype.getIntervalDates = function() {
    return this.option.intervalDates;
};

Spiral.prototype.renderVisibleDetails = function() {
    var svg = d3.select('#' + this.option.targetElement);
    svg.select('#' + this.option.targetElement + "-details")
        .style("visibility", "initial")
        .style("width", "initial")
        .style("height", "initial");
    svg.select('#' + this.option.targetElement + "-title")
        .style("visibility", "hidden")
        .style("width", 0)
        .style("height", 0);
};

Spiral.prototype.renderNoVisibleDetails = function() {
    var svg = d3.select('#' + this.option.targetElement);
    svg.select('#' + this.option.targetElement + "-details")
        .style("visibility", "hidden")
        .style("width", 0)
        .style("height", 0);
    svg.select('#' + this.option.targetElement + "-title")
        .style("visibility", "initial")
        .style("width", "initial")
        .style("height", "initial");
};

Spiral.prototype.renderNoData = function() {
    var self = this;
    var option = self.option;

    option.html.select('#' + option.targetElement + "-attribute-text")
        .style('margin-left',
            (option.margin.left) + "px")
        .html('<h4><b>' +
                option.currentMedication +
            '</h4></b>' +
            '<p>Nenhuma contagem registada.</p>');
    d3.select('#' + option.targetElement + "-svg-line-text")
        .html('');
    option.html.selectAll("svg").selectAll("g").selectAll("path").remove();

    // Don't leave empty space in svg
    option.html.selectAll("svg")
            .attr("width", 0)
            .attr("height", 0);
};

Spiral.prototype.remove = function() {
    var self = this;
    var option = self.option;

    var svg = option.html
        .select('#' + this.option.targetElement + "-svg-spiral")
        .selectAll("svg");
    var spiralPaths = svg.selectAll("g").selectAll(".spiral-sector");
    spiralPaths
        .on("mouseover", null)
        .on("mouseout", null);
    svg.selectAll("g").selectAll(".spiral-sector")
        .remove();

    var svgLine = option.html
        .select('#' + this.option.targetElement + "-svg-line")
        .selectAll("svg");
    var linePaths = svgLine.selectAll("g").selectAll(".temporal-line");
    svgLine.selectAll("g").selectAll(".temporal-line")
        .remove();

    // TODO: legend and brush

    svgLine.remove();
    svg.remove();
};

Spiral.prototype.render = function(reusePaths) {
    var self = this;
    var option = self.option;
    reusePaths = reusePaths || false;

    d3.select('#' + option.targetElement + "-title")
        .html('<h4><b>' +
                option.currentMedication +
            '</b></h4>');
    d3.select('#' + option.targetElement + "-attribute-text")
        .html('<h4><b>' +
                option.currentMedication +
            '</b></h4>' +
            'Frequência prescrita: ' +
                option.expectedFrequency +
            '<br/>' +
            'Intervalo: ' +
                option.startDate + ' - ' + option.endDate);
    d3.select('#' + option.targetElement + "-svg-line-text")
        .html('<span>Intervalo:</span>');
    d3.select('#' + option.targetElement + "-binning")
        .html(option.functions.translateInterval(option.binning));

    // Always set size, since it may have been modified previously
    var svg = option.html
        .select('#' + this.option.targetElement + "-svg-spiral")
        .selectAll("svg")
        .attr("width", option.svgWidth)
        .attr("height", option.svgHeight);
    var svgLine = option.html
        .select('#' + this.option.targetElement + "-svg-line")
        .selectAll("svg")
        .attr("width", this.option.lineRange.x + this.option.marginLine * 2)
        .attr("height", this.option.lineRange.y + this.option.padding * 4);

    if (option.graphType === "points") {
        svg.selectAll("g").selectAll("dot")
            .data(option.data)
            .enter().append("circle")
            .attr("r", function(d) {
                return d[2].value;
            })
            .attr("cx", function(d) {
                return d[0];
            })
            .attr("cy", function(d) {
                return d[1];
            });
    } else {
        //
        // Spiral sectors
        //
        // For each sector, calculate the four points that limit it's
        // boundaries and the control points for curvature of lines. Unfortunately
        // d3.js offers no functions that produce separate paths,
        // so we have to create each svg path manually...
        if (!reusePaths) {
            option.spiralData.forEach(function(datum, t) {
                t = t + 2 * (option.lineWidth / option.spacing);
                var start = startAngle(t, option.period);
                var end = endAngle(t, option.period);

                var startCenter = radius(option.spacing, start);
                var endCenter = radius(option.spacing, end);
                var startInnerRadius = startCenter - option.lineWidth * 0.5;
                var startOuterRadius = startCenter + option.lineWidth * 0.5;
                var endInnerRadius = endCenter - option.lineWidth * 0.5;
                var endOuterRadius = endCenter + option.lineWidth * 0.5;

                var ctrlInnerRad = 0.01;
                var ctrlOuterRad = 0.01;
                var angle = theta(t, option.period);
                var rad = radius(option.spacing, angle);
                var innerControlPoint = self.cartesian(
                    rad - option.lineWidth * 0.5 + ctrlInnerRad, angle);
                var outerControlPoint = self.cartesian(
                    rad + option.lineWidth * 0.5 + ctrlOuterRad, angle);

                var startPoint = self.cartesian(startInnerRadius, start);
                var point2 = self.cartesian(startOuterRadius, start);
                var point3 = self.cartesian(endOuterRadius, end);
                var point4 = self.cartesian(endInnerRadius, end);
                datum[1] = "M" + startPoint[0] + " " + startPoint[1] +
                    "L" + point2[0] + " " + point2[1] +
                    "Q" + outerControlPoint[0] + " " + outerControlPoint[1] +
                        " " + point3[0] + " " + point3[1] +
                    "L" + point4[0] + " " + point4[1] +
                    "Q" + innerControlPoint[0] + " " + innerControlPoint[1] +
                        " " + startPoint[0] + " " + startPoint[1] +
                    "Z";
            });
        }

        var buckets = option.colors.length;
        var dataExtent = d3.extent(option.spiralData, function(d) {
                return d[2].value;
            });
        var colorScale = d3.scaleQuantile()
            .domain(dataExtent)
            .range(option.colors);

        var sectorsTip = d3.tip()
            .attr('class', 'tooltip tooltip-element tooltip-d3')
            .offset([-10, 0])
            .direction('n')
            .html(function(d) {
                return "<div style=\"text-align: left\">" +
                    "<span><b>Contagem:</b> " + d[2].value + "</span><br/>" +
                    "<span><b>Dose:</b> " + d[2].dosage + "</span><br/>" +
                    "<span><b>Datas:</b> " + d[2].date + "</span>" +
                "</div>";
            });
        svg.call(sectorsTip);
        var spiralPaths = svg.selectAll("g").selectAll(".spiral-sector")
            .data(option.spiralData, function(d) {
                return d[1];
            });
        spiralPaths.exit().remove();
        var spiralGroup = spiralPaths.enter();
        spiralGroup.append("path")
            .attr("class", "spiral-sector")
            .merge(spiralPaths)
                .style("fill", function(d) {
                    return colorScale(d[2].value);
                })
                .on("mouseover", function(d) {
                    // Prevent tooltip from being left over
                    // when interacting with some problematic d3 functions,
                    // such as brushing callbacks
                    if (!option.isIntervalBeingChanged)
                        sectorsTip.show(d);
                })
                .on("mouseout", function(d) {
                    sectorsTip.hide(d);
                })
                .attr("d", function(d) {
                    return d[1];
                });

        //
        // Spiral legend
        //
        var gridWidth = (option.svgWidth - 2 * option.padding) / buckets;
        var gridHeight = gridWidth / 2;
        option.functions.makeLegend(
                svg, 
                colorScale, 
                gridWidth, 
                gridHeight,
                option.padding, 
                option.svgHeight - 30);

        //
        // Temporal line for interval brushing
        //
        var x2 = d3.scaleTime().range([0, option.lineRange.x]);
        var y2 = d3.scaleLinear().range([option.lineRange.y, 0]);
        var parseTime = function(date) {
            return moment(date, 'YYYY/MM/DD').toDate();
        };
        var dataStartDate = option.data[0][2].startDate;
        var dataEndDate = option.data[option.data.length - 1][2].endDate;
        x2.domain([parseTime(dataStartDate), parseTime(dataEndDate)]);
        y2.domain([0, d3.max(option.data, function(d) {
            return d[1];
        })]);
        var line = d3.line()
            .x(function(d, i) { 
                // The last point needs to be the endDate, to avoid
                // being the same value as the previous point
                return x2(parseTime((i == (option.data.length - 1)) ?
                        d[2].endDate :
                        d[2].startDate));
            })
            .y(function(d) { return y2(d[1]); });

        var linePaths = svgLine.selectAll("g").selectAll(".temporal-line")
            .data([option.data]);
        linePaths.exit().remove();
        var lineGroup = linePaths.enter();
        lineGroup.append("path")
            .merge(linePaths)
                .attr("class", "temporal-line")
                .attr("d", line)
                .attr("fill", "white")
                .attr("stroke-width", "2")
                .attr("stroke", option.color);

        //
        // Temporal line axis
        //
        // FIXME: Hardcoded for years
        var xAxis = d3.axisBottom(x2)
            .tickValues(option.functions.extractDatesWithInterval(
                dataStartDate, dataEndDate, 'years'))
            .tickFormat(d3.timeFormat("%Y/%m/%d"));
        svgLine.selectAll(".temporal-line-axis").remove();
        svgLine.append("g")
            .attr("class", "x axis temporal-line-axis")
            .attr("transform", "translate(" +
                (option.margin.left + option.marginLine) + "," +
                (option.lineRange.y + option.padding + 1) + ")")
            .call(xAxis)
            .append("text")
                .attr("x", option.lineRange.x - option.padding * 2)
                .attr("y", option.lineRange.y)
                .attr("dy", "-.35em")
                .style("text-anchor", "middle")
                .text("time");

        //
        // Temporal line brush
        //
        var brushed = function() {
            option.isIntervalBeingChanged = false;

            // ignore brush-by-zoom
            if ((d3.event.sourceEvent && 
                    d3.event.sourceEvent.type === "zoom") ||
                    // Ignore empty selections.
                    (!d3.event.selection)) {
                option.intervalDates = [];
                option.intervalPos = [];
                return; 
            }

            // The current function is called even on brush creation, so we need a 
            // guard to avoid a function call loop involving the spiral factory
            if (option.isBeingCreated) {
                option.isBeingCreated = false;
            } else {
                var d0 = d3.event.selection.map(x2.invert),
                    d1 = d0.map(d3.timeDay.round);
                // Record the new dates to be used when calculating new bins
                option.intervalDates = [
                    moment(d1[0]),
                    moment(d1[1])
                ];
                // Record selection coordinates in order to restore them
                // after the new bins are made
                option.intervalPos = [
                    d3.event.selection[0],
                    d3.event.selection[1]
                ];

                // Need to recalculate bins, since interval was changed
                option.functions.makeBins();
            }
        };
        var brushPos;
        if (option.intervalPos.length > 0) {
            brushPos = option.intervalPos.slice();
        } else {
            brushPos = x2.range();
        }
        var brush = d3.brushX()
            .extent([
                [0, 0],
                [option.lineRange.x, option.lineRange.y + 10]
            ])
            .on("start", function() {
                option.isIntervalBeingChanged = true;
            })
            .on("end", brushed);
        svgLine.selectAll(".temporal-line-brush").remove();
        svgLine.append("g")
            .attr("class", "brush temporal-line-brush")
            .attr("transform", "translate(" +
                (option.margin.left + option.marginLine) + "," +
                0 + ")")
            .call(brush)
            .call(brush.move, brushPos);
    }
};

Spiral.prototype.randomData = function() {
    var self = this;
    var option = self.option;

    option.data = [];
    option.spiralData = [];
    for (var i = 0; i < option.numberOfPoints; i++) {
        var angle = theta(i, option.period);
        var rad = radius(option.spacing, angle);
        var size = Math.floor((Math.random() * 5) + 1);
        var chance = Math.floor((Math.random() * 5) + 1);
        if (chance < 3) {
            size = 0;
        }

        option.data.push([i, size * option.period, 2]);
        option.spiralData.push(this.cartesian(rad, angle, size));
    }
};

/**
 * @param {float[]} data - dataset values that are displayed in tooltip
 */
Spiral.prototype.processData = function(data, brushedData) {
    var self = this;
    var option = self.option;

    option.data = [];
    option.spiralData = [];
    for (var i = 0; i < data.length; i++) {
        option.data.push([i, data[i].value * 10, data[i]]);
    }

    for (i = 0; i < brushedData.length; i++) {
        var angle = theta(i, option.period);
        var rad = radius(option.spacing, angle);

        option.spiralData.push(this.cartesian(rad, angle, brushedData[i]));
    }
};

Spiral.prototype.autocorrelate = function() {
    var n = this.option.numberOfPoints;
    var index = this.option.graphType === 'non-spiral' ? 1 : 2;

    var sum = 0;
    for (var i = 0; i < n; i++) {
        sum += this.option.data[i][index];
    }
    var avg = sum / n;

    var sigma2 = 0;
    for (var j = 0; j < n; j++) {
        sigma2 += Math.pow((this.option.data[j][index] - avg), 2);
    }

    var coeff;
    var coeffArray = [];

    for (var tau = 0; tau < n; tau++) {
        var sigma1 = 0;
        for (j = 0; j < n - tau; j++) {
            sigma1 += (this.option.data[j][index] - avg) * (this.option.data[j + tau][index] - avg);
        }

        coeff = sigma1 / sigma2;
        coeffArray.push([tau, coeff]);
    }

    return coeffArray;
};

// FIXME: This needs to be defined in our spiral factory in order to
// call populate()
Spiral.prototype.findPeriod = function() {
    var averageCoeff = 0;
    var coeffStdDev = 0;
    var coeffDiffSum = 0;
    var coeffArray = this.autocorrelate();
    var tauArray = [];
    var potentialPeriods = {};
    var periodOccurance = 1;
    var foundPeriod = 1;

    for (var i = 0; i < coeffArray.length; i++) {
        averageCoeff += coeffArray[i][1];
    }
    averageCoeff = averageCoeff / coeffArray.length;

    for (i = 0; i < coeffArray.length; i++) {
        coeffDiffSum += Math.pow((coeffArray[i][1] - averageCoeff), 2);
    }
    coeffStdDev = Math.sqrt(coeffDiffSum / coeffArray.length);

    for (i = 0; i < coeffArray.length / 2; i++) {
        if (coeffArray[i][1] >= averageCoeff + 3 * coeffStdDev) {
            tauArray.push(coeffArray[i][0]);
        }
    }

    for (i = 0; i < tauArray.length; i++) {
        var diff = tauArray[i] - tauArray[i - 1];
        potentialPeriods[diff] = potentialPeriods[diff] ? potentialPeriods[diff] + 1 : 1;
    }

    Object.keys(potentialPeriods).forEach(function(potentialPeriod) {
        if (potentialPeriods[potentialPeriod] > periodOccurance) {
            periodOccurance = potentialPeriods[potentialPeriod];
            foundPeriod = potentialPeriod;
        }
    });

    this.set('period', Number(foundPeriod));
    this.render();
};

function theta(t, period) {
    return 2 * Math.PI / (period) * t;
}

function startAngle(t, period) {
    return (theta(t - 1, period) + theta(t, period)) / 2;
}

function endAngle(t, period) {
    return (theta(t + 1, period) + theta(t, period)) / 2;
}

function radius(spacing, angle) {
    return spacing * angle;
}

function colorSelector(datum, opacityFlag) {
    if (opacityFlag) {
        return datum[2] / 9;
    } else {
        //d3 color scale
    }
}
