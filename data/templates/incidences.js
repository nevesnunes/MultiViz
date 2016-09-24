var _node_fs = require('fs');

var generator = (function() {
	var iterations = 80;

	var attributePairs = (function() {
		var pairIndexOf = function(pairs, pair, property) {
			for (var i = 0, len = pairs.length; i < len; i++) {
				if ((pairs[i][property][0] === pair[0]) &&
						(pairs[i][property][1] === pair[1]))
					return i;
			}
			return -1;
		};

		var diseases = ['Artrite', 'Candidiase Oral', 'Doença Cardíaca Congénita', 'Doença da Tiroide', 'Doença Venérea', 'Enfarte Miocárdio', 'Febre Reumática', 'Gânglios aumentados de volume', 'Glaucoma', 'Osteoporose'];
		var medications = ['Anti-hipertensor', 'Broncodilatador', 'Anti-depressor', 'Anti-ácidos', 'Estatinas', 'Anti-diabéticos', 'Análgésicos', 'Aspirina', 'Esteróides'];

		// Create pairs with all possible combinations
		var pairs = [];
		for (var i = 0; i < diseases.length; i++) {
			for (var j = 0; j < medications.length; j++) {
				// Check if the complementary pair doesn't exist
				// before pushing a new pair
				if (pairIndexOf(pairs, [j, i], "id") === -1) {
					pairs.push({
						id: [i, j],
						disease: diseases[i],
						medication: medications[j]
					});
				}
			}
		}

		// Randomize the array
		pairs.sort(function () {
			return Math.random() - 0.5;
		});

		return pairs;
	})();

	var canMakeInstance = function() {
		return attributePairs.length > 0;
	};

	var makeInstance = function() {
		var incidences = Math.floor(Math.random() * iterations) + 1;
		var pair = attributePairs.pop();

		return {
			incidences: incidences,
			disease: pair.disease,
			medication: pair.medication
		};
	};

	return {
		canMakeInstance: canMakeInstance,
		makeInstance: makeInstance,
		iterations: iterations
	};
})();

// Generate data
var data = [];
for (var i = 0; i < generator.iterations; i++) {
	if (generator.canMakeInstance()) {
		data.push(generator.makeInstance());
	}
}

// Output data
var jsonData = JSON.stringify(data, null, 4);
var filename = __dirname + "/../incidences.json";
_node_fs.writeFile(filename, jsonData, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("Saved " + filename);
}); 
