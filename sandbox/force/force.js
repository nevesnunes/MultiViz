var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    g = svg.append("g");

/*
var n = 100,
    nodes = d3.range(n).map(function(i) { return {index: i}; }),
    links = d3.range(n).map(function(i) { return {source: i, target: (i + 3) % n}; });

*/
var nodes = [
    {
        id: "a"
    },
    {
        id: "b"
    },
    {
        id: "c"
    },
    {
        id: "d"
    }
];
var links = [
    {
        source: "a",
        target: "b"
    },
    {
        source: "a",
        target: "c"
    },
    {
        source: "b",
        target: "c"
    },
    {
        source: "b",
        target: "d"
    }
];
var distance = height / 2;
var strengthValues = [0.01, 0.01, 1, 0.1];
var strength = function(d, i) {
    return strengthValues[i];
};
var id = function(d) {
    return d.id;
};

var simulation = d3.forceSimulation(nodes)
    .force("charge", d3.forceManyBody()
        .strength(-100)
        .distanceMax([height / 2]))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("link", d3.forceLink(links)
        .id(id)
        .distance(distance)
        .strength(strength)
        .iterations(1))
    .force("x", d3.forceX())
    .force("y", d3.forceY())
    .stop();

var loading = svg.append("text")
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .text("Simulating. One moment please…");

// Use a timeout to allow the rest of the page to load first.
d3.timeout(function() {
    loading.remove();

    // See https://github.com/d3/d3-force/blob/master/README.md#simulation_tick
    for (var i = 0, n = Math.ceil(
            Math.log(simulation.alphaMin()) / 
                Math.log(1 - simulation.alphaDecay()));
            i < n;
            ++i) {
        simulation.tick();
    }

    g.append("g")
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5)
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("x1", function(d) {
            return d.source.x;
        })
        .attr("y1", function(d) {
            return d.source.y;
        })
        .attr("x2", function(d) {
            return d.target.x;
        })
        .attr("y2", function(d) {
            return d.target.y;
        });

    g.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("fill", function(d, i) {
            return (d.id === "a") ? "#ff0000" : (d.id === "b") ? "#dd6666" : "#000";
        })
        .attr("cx", function(d) {
            return d.x;
        })
        .attr("cy", function(d) {
            return d.y;
        })
        .attr("r", 10);
});
