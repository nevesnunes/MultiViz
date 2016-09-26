var _node_fs = require('fs');

var _uuid = require('../../node_modules/node-uuid/uuid.js');

// Databases
var _firstNames = require('../../modules/random-name/first-names.json');
var _middleNames = require('../../modules/random-name/middle-names.json');
var _lastNames = require('../../modules/random-name/names.json');

var generator = (function() {
	var iterations = 80;

	var canMakeInstance = function() {
		return true; // FIXME
	};

    var makeRandomArray = function(array) {
		var length = Math.floor(Math.random() * (array.length - 1)) + 1;
		var pickedElements = [];
		for (var i = 0; i < length; i++) {
            // Check if element wasn't already picked
            var element = pickRandomElement(array);
            if (pickedElements.indexOf(element) === -1) {
                pickedElements.push(element);
            }
		}

        return pickedElements;
    };

    var pickRandomElement = function(array) {
        return array[~~(Math.random() * array.length)];
    };

    var diseases = ['Artrite', 'Candidiase Oral', 'Doença Cardíaca Congénita', 'Doença da Tiroide', 'Doença Venérea', 'Enfarte Miocárdio', 'Febre Reumática', 'Gânglios aumentados de volume', 'Glaucoma', 'Osteoporose'];
    var medications = ['Anti-hipertensor', 'Broncodilatador', 'Anti-depressor', 'Anti-ácidos', 'Estatinas', 'Anti-diabéticos', 'Análgésicos', 'Aspirina', 'Esteróides'];
	var makeInstance = function() {
        var id = _uuid.v1();
        var name =
            pickRandomElement(_firstNames) +
            ' ' +
            pickRandomElement(_lastNames);
		var pickedDiseases = makeRandomArray(diseases);
		var pickedMedications = makeRandomArray(medications);

		return {
			id: id,
			name: name,
			diseases: pickedDiseases,
			medications: pickedMedications
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
var filename = __dirname + "/../patients.json";
_node_fs.writeFile(filename, jsonData, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("Saved " + filename);
}); 
