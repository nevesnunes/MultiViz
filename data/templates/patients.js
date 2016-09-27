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

    var diseaseObjectGenerator = function(element) {
        return {
            name: element,
            startDate: randomDate(new Date(2012, 0, 1), new Date())
        };
    };

    var genericFrequencies = [
            'Anual',
            'Mensal',
            'Semanal',
            'Diário'
    ];

    var treatAsUTC = function(date) {
        var result = new Date(date);
        result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
        return result;
    };

    var daysBetween = function(startDate, endDate) {
        var millisecondsPerDay = 24 * 60 * 60 * 1000;
        return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
    };

    var makeRandomDays = function(frequency, startDate, endDate) {
        var days = [];
        var countDays = daysBetween(startDate, endDate);
        var currentDay = 0;
        while (currentDay <= countDays) {
            var chance = Math.floor(Math.random() * (4 - 1)) + 1;
            if (chance < 3) {
                var newDate = new Date(startDate);
                newDate.setDate(newDate.getDate() + currentDay);
                days.push(newDate);
            }

            currentDay += 1 * frequency;
        }

        return days;
    };

    var makeRandomRecordedFrequency = function(frequency, startDate, endDate) {
        var recordedFrequency = [];
        // FIXME: hardcoded aproximation of days in frequency
        switch (frequency) {
            case 'Anual': {
                recordedFrequency = makeRandomDays(365, startDate, endDate);
                break;
            }
            case 'Mensal': {
                recordedFrequency = makeRandomDays(30, startDate, endDate);
                break;
            }
            case 'Semanal': {
                recordedFrequency = makeRandomDays(7, startDate, endDate);
                break;
            }
            case 'Diária': {
                recordedFrequency = makeRandomDays(1, startDate, endDate);
                break;
            }
            default: {
            }
        } //switch

        return recordedFrequency;
    };

    var medicationObjectGenerator = function(element) {
        var startDate = randomDate(new Date(2012, 0, 1), new Date());
        var endDate = randomDate(startDate, new Date());
        var expectedFrequency = pickRandomElement(genericFrequencies);
        // TODO
        var recordedFrequency = makeRandomRecordedFrequency(
                expectedFrequency, startDate, endDate);
        var dosage = Math.floor(Math.random() * (4 - 1)) + 1;
        return {
            name: element,
            startDate: startDate,
            endDate: endDate,
            expectedFrequency: expectedFrequency,
            recordedFrequency: recordedFrequency,
            dosage: dosage
        };
    };

    var habits = ['Fruta', 'Biscoitos e bolos', 'Geleia e mel', 'Pastilhas com açúcar', 'Doces', 'Limonada e refrigerantes', 'Chá com açúcar', 'Café com açúcar'];
    var habitFrequencies = [
            { name: 'Nunca', value: null, factor: null },
            { name: 'Várias vezes por mês', value: 14, factor: 1 },
            { name: 'Uma vez por semana', value: 7, factor: 1 },
            { name: 'Várias vezes por semana', value: 3, factor: 1 },
            { name: 'Todos os dias', value: 1, factor: 1 },
            { name: 'Várias vezes ao dia', value: 1, factor: 2 },
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
                diseases, diseaseObjectGenerator, "name");
		var pickedMedications = makeRandomArray(
                medications, medicationObjectGenerator, "name");
		var pickedHabits = makeRandomArray(
                habits, habitObjectGenerator, "name");
		var age = Math.floor(Math.random() * (100 - 1)) + 1;
        var lastVisit = randomDate(new Date(2012, 0, 1), new Date());

		return {
			id: id,
			name: name,
			age: age,
			diseases: pickedDiseases,
			medications: pickedMedications,
            habits: pickedHabits,
            lastVisit: lastVisit
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
