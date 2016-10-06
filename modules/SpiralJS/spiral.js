function Spiral(parameters) {
    this.option = {
        graphType: parameters.graphType || "points",
        numberOfPoints: parameters.numberOfPoints || null,
        period: parameters.period || 12,
        svgHeight: parameters.svgHeight || 0,
        svgWidth: parameters.svgWidth || 0,
        margin: parameters.margin || {
            top: 10,
            right: 10,
            bottom: 10,
            left: 30
        },
        spacing: parameters.spacing || 1,
        lineWidth: parameters.lineWidth || 50,
        targetElement: parameters.targetElement || '#chart',
        data: parameters.data || [],
        tickMarkNumber: parameters.tickMarkNumber || [],
        tickMarkLabels: parameters.tickMarkLabels || [],
        color: parameters.color || 'black',
        colors: parameters.colors || ["#bdbdbd","#969696","#737373","#525252","#252525","#000000"],
        functions: parameters.functions || {}
    };

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

    // Make initial svg element
    var svg = d3.select('#' + this.option.targetElement);
    svg.append('div')
        .attr('id', this.option.targetElement + "-attribute-text");
    svg.append("svg")
            .attr("width", this.option.svgWidth)
            .attr("height", this.option.svgHeight)
        .append("g")
            .attr("transform", "translate(" +
                this.option.margin.left + "," +
                this.option.margin.top + ")");
    this.option.html = svg;
}

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

Spiral.prototype.renderNoData = function() {
    var option = this.option;
    option.html.select('#' + option.targetElement + "-attribute-text")
        .html('<p><b>' +
                option.currentMedication +
            '</b></p>' +
            '<p>Nenhuma contagem registada.</p>');
    option.html.selectAll("svg").selectAll("g").selectAll("path").remove();

    // Don't leave empty space in svg
    option.html.selectAll("svg")
            .attr("width", 0)
            .attr("height", 0);
};

Spiral.prototype.render = function() {
    var self = this;
    var option = self.option;

    d3.select(
        '#' + option.targetElement + "-attribute-text")
        .html('<b>' +
                option.currentMedication +
            '</b><br/>' +
            'Frequência prescrita: ' +
                option.expectedFrequency +
            '<br/>' +
            'Intervalo: ' +
                option.timespan +
            '');
    d3.select(
        '#' + option.targetElement + "-binning")
        .html(option.functions.translateFrequency(option.binning));

    var svg = option.html.selectAll("svg")
            .attr("width", option.svgWidth)
            .attr("height", option.svgHeight);
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
    } else if (option.graphType === "custom-path") {
        option.data.forEach(function(datum, t) {
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
            var arcPath = "M" + startPoint[0] + " " + startPoint[1] +
                "L" + point2[0] + " " + point2[1] +
                "Q" + outerControlPoint[0] + " " + outerControlPoint[1] +
                    " " + point3[0] + " " + point3[1] +
                "L" + point4[0] + " " + point4[1] +
                "Q" + innerControlPoint[0] + " " + innerControlPoint[1] +
                    " " + startPoint[0] + " " + startPoint[1] +
                "Z";
            datum[1] = arcPath;
        });

        var buckets = option.colors.length;
        var colorScale = d3.scaleQuantile()
            .domain([0, buckets - 1, d3.max(option.data, function(d) {
                return d[2].value;
            })])
            .range(option.colors);

        var sectorsTip = d3.tip()
            .attr('class', 'tooltip tooltip-element tooltip-d3')
            .offset([-10, 0])
            .direction('n')
            .html(function(d) {
                return "<span>Contagem: " + d[2].value + "</span><br/>" +
                    "<span>Dose: " + d[2].dosage + "</span><br/>" +
                    "<span>Datas: " + d[2].date + "</span>";
            });
        svg.call(sectorsTip);
        var spiralPaths = svg.selectAll("g").selectAll(".spiral-sector")
            .data(option.data, function(d) {
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
                    sectorsTip.show(d);
                })
                .on("mouseout", function(d) {
                    sectorsTip.hide(d);
                })
                .attr("d", function(d) {
                    return d[1];
                });

        var padding = 10;
        var gridWidth = (option.svgWidth - 2 * padding) / buckets;
        var gridHeight = gridWidth / 2;
        option.functions.makeLegend(
                svg, 
                colorScale, 
                gridWidth, 
                gridHeight,
                padding, 
                option.svgHeight - 30);

    } else if (option.graphType === "non-spiral") {
        // --------------------vvv Standard Line Graph vvv---------------------------
        var x2 = d3.scaleLinear().range([0, 730]);
        var y2 = d3.scaleLinear().range([480, 0]);
        x2.domain(d3.extent(option.data, function(d) {
            return d[0];
        }));
        y2.domain(d3.extent(option.data, function(d) {
            return d[1];
        }));
        var line = d3.line()
            .x(function(d) {
                return x2(d[0]);
            })
            .y(function(d) {
                return y2(d[1]);
            });

        /*
            var xAxis = d3.svg.axis().scale(x2)
              .orient("bottom").ticks(5);

            var yAxis = d3.svg.axis().scale(y2)
              .orient("left").ticks(5);

            svg.append("g")
              .attr("class", "x axis viz-spiral-axis")
              .attr("transform", "translate("+option.margin.left+"," + 480 + ")")
              .call(xAxis)
              .append("text")
                .attr("x", 710)
                .attr("y", -3)
                .attr("dy", "-.35em")
                .style("text-anchor", "middle")
                .text("time");

            svg.append("g")
              .attr("class", "y axis viz-spiral-axis")
              .attr("transform", "translate("+option.margin.left+",0)")
              .call(yAxis)
              .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("Signal (a.u.)");
        */
        svg.append("path")
            .datum(option.data)
            .attr("class", "line")
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke-width", "1")
            .attr("stroke", option.color)
            .attr("transform", "translate(" + option.margin.left + ",0)");
    }

    return svg;
};

Spiral.prototype.randomData = function() {
    var self = this;
    var option = self.option;

    option.data = [];
    for (var i = 0; i < option.numberOfPoints; i++) {
        var angle = theta(i, option.period);
        var rad = radius(option.spacing, angle);
        var size = Math.floor((Math.random() * 5) + 1);
        var chance = Math.floor((Math.random() * 5) + 1);
        if (chance < 3) {
            size = 0;
        }

        if (option.graphType === 'non-spiral') {
            option.data.push([i, size * option.period, 2]);
        } else {
            option.data.push(this.cartesian(rad, angle, size));
        }
    }
};

/**
 * @param {float[]} values - dataset values that are displayed in tooltip
 * @param {integer} expectedCount - number of possible values in the time span
 * established for this dataset
 * @param {integer} valueFactor - multiplier applied to each value
 */
Spiral.prototype.processData = function(data) {
    var self = this;
    var option = self.option;

    option.data = [];
    for (var i = 0; i < data.length; i++) {
        var angle = theta(i, option.period);
        var rad = radius(option.spacing, angle);

        if (option.graphType === 'non-spiral') {
            option.data.push([i, values[i] * option.period, 2]);
        } else {
            option.data.push(this.cartesian(rad, angle, data[i]));
        }
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
