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
        
    var randomDate = function(start, end) {
        return new Date(start.getTime() + 
            Math.random() * (end.getTime() - start.getTime()));
    };

    var simpleObjectGenerator = function(element) {
        return { name: element };
    };

    var genericObjectGenerator = function(element) {
        return {
            name: element,
            startDate: randomDate(new Date(2012, 0, 1), new Date())
        };
    };

    var habits = ['Fruta', 'Biscoitos e bolos', 'Geleia e mel', 'Pastilhas com açúcar', 'Doces', 'Limonada e refrigerantes', 'Chá com açúcar', 'Café com açúcar'];
    var habitFrequencies = [
            { name: 'Nunca', level: 0},
            { name: 'Várias vezes por mês', level: 1},
            { name: 'Uma vez por semana', level: 2},
            { name: 'Várias vezes por semana', level: 3},
            { name: 'Todos os dias', level: 4},
            { name: 'Várias vezes ao dia', level: 5},
    ];
    var habitObjectGenerator = function(element) {
        return {
            name: element,
            frequency: pickRandomElement(habitFrequencies)
        };
    };

    var arrayObjectIndexOf = function(myArray, searchTerm, property) {
        for (var i = 0, len = myArray.length; i < len; i++) {
            if (myArray[i][property] === searchTerm)
                return i;
        }
        return -1;
    };

    var makeRandomArray = function(array, objectGenerator, property) {
		var length = Math.floor(Math.random() * (array.length - 1)) + 1;
		var pickedElements = [];
		for (var i = 0; i < length; i++) {
            // Check if element wasn't already picked
            var element = pickRandomElement(array);
            if (arrayObjectIndexOf(pickedElements, element, property) === -1) {
                pickedElements.push(objectGenerator(element));
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
		var pickedDiseases = makeRandomArray(
                diseases, genericObjectGenerator, "name");
		var pickedMedications = makeRandomArray(
                medications, genericObjectGenerator, "name");
		var pickedHabits = makeRandomArray(
                habits, habitObjectGenerator, "name");

		return {
			id: id,
			name: name,
			diseases: pickedDiseases,
			medications: pickedMedications,
            habits: pickedHabits
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
