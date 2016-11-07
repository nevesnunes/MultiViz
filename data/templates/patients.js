var node_fs = require('fs');

var uuid = require('../../node_modules/node-uuid/uuid.js');
var moment = require('../../node_modules/moment/moment.js');
moment().format();

// Databases
var firstNames = require('../../modules/random-name/first-names.json');
var middleNames = require('../../modules/random-name/middle-names.json');
var lastNames = require('../../modules/random-name/names.json');

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

    var genericFrequencies = [
        'Anual',
        'Mensal',
        'Semanal',
        'Diário'
    ];

    var makeRandomDays = function(frequency, startDate, endDate) {
        var days = [];
        var startMoment = moment(startDate);
        var endMoment = moment(endDate);
        var countDays = endMoment.diff(startMoment, 'days');
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
            case 'Diário': {
                recordedFrequency = makeRandomDays(1, startDate, endDate);
                break;
            }
            default: {
            }
        } //switch

        return recordedFrequency;
    };

    var logDateDifference = function(startDate, endDate) {
        var startMoment = moment(startDate);
        var endMoment = moment(endDate);
        console.log(
                startMoment.format('YYYY/MM/DD') + 
                ' - ' + 
                endMoment.format('YYYY/MM/DD'));
        console.log('years: ' + endMoment.diff(startMoment, 'years'));
        console.log('months: ' + endMoment.diff(startMoment, 'months'));
        console.log('weeks: ' + endMoment.diff(startMoment, 'weeks'));
        console.log('days: ' + endMoment.diff(startMoment, 'days'));
    };

    //
    // Diseases
    //
    var diseases = [
        'Artrite',
        'Candidiase Oral',
        'Doença Cardíaca Congénita',
        'Doença da Tiroide',
        'Doença Venérea',
        'Enfarte Miocárdio',
        'Febre Reumática',
        'Gânglios aumentados de volume',
        'Glaucoma',
        'Osteoporose'
    ];
    var diseaseObjectGenerator = function(element) {
        var startDate = randomDate(new Date(2012, 0, 1), new Date());
        var endDate = randomDate(startDate, new Date());

        return {
            name: element,
            startDate: startDate,
            endDate: endDate
        };
    };

    //
    // Medications
    //
    var medications = [
        'Anti-hipertensor',
        'Broncodilatador',
        'Anti-depressor',
        'Anti-ácidos',
        'Estatinas',
        'Anti-diabéticos',
        'Análgésicos',
        'Aspirina',
        'Esteróides'
    ];
    var medicationObjectGenerator = function(element) {
        var startDate = randomDate(new Date(2012, 0, 1), new Date());
        var endDate = randomDate(startDate, new Date());

        var expectedFrequency = pickRandomElement(genericFrequencies);
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

    //
    // Food
    //
    var habits = [
        'Fruta',
        'Biscoitos e bolos',
        'Geleia e mel',
        'Pastilhas com açúcar',
        'Doces',
        'Limonada e refrigerantes',
        'Chá com açúcar',
        'Café com açúcar'
    ];
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

    //
    // Higiene
    //
    var habitsHigiene = [
        'Escova de dentes manual',
        'Escova de dentes mecânica',
        'Palitos de madeira',
        'Palitos de plástico',
        'Carvão vegetal',
        'Pastilha elástica',
        'Fio Dentário',
        'Escovilhão Dentário',
    ];
    var habitsHigieneWithType = [
        'Colutório',
        'Prótese Dentária'
    ];
    var habitsHigieneBrushingFrequency;
    var habitsHigieneObjectGenerator = function(element) {
        // FIXME
    };

    //
    // General
    //
    var habitsGeneral = [
        'Fumador',
        'Consumidor de Alcool',
        'Consumidor de Estupefacientes'
    ];
    var habitsGeneralObjectGenerator = function(element) {
        // FIXME
    };

    //
    // Bio-Metrics
    //
    var bioMetricsLabExams = [
        'Glicémia',
        'Colestrol Total',
        'HDL',
        'LDL',
        'Proteína C',
        'Índice artériogénico'
    ];
    var bioMetricsExtraOralExams = [
        'Configuração crâniofacial',
        'Assimetrias ou alterações faciais',
        'Dimensão vertical',
        'Limitação dos movimentos mandibulares',
        'Presença sons articulares',
        'Sintomatologia dolorosa da ATM'
    ];
    var bioMetricsIntraOralExams = [
        'Alterações dos tecidos moles',
        'Hemorragia gengival',
        'Mobilididade dentária',
        'Alterações das estruturas dentárias'
    ];
    var bioMetricsComplementaryExams;
    var bioMetricsObjectGenerator = function(element) {
        // FIXME
    };

    //
    // Diagnosis
    //
    var diagnosis;
    var reasonOfVisit = [
        'Revisão',
        'Estético',
        'Funcional',
        'Algia'
    ];
    // FIXME

    //
    // Treatment Plan
    //
    var treatmentPlans = [
        'MDP',
        'Endodontia',
        'Cirurgia',
        'Dentisteria Operatória',
        'Periodontologia',
        'Reabilitação Oral',
        'Implantologia',
        'Odontopediatria',
        'Odontogeriatria',
        'Patologia Oral',
        'Ortodontia'
    ];
    // FIXME

    //
    // Utility methods
    //
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

	var makeInstance = function() {
        // ID
        var id = uuid.v1();
        var name =
                pickRandomElement(firstNames) +
                ' ' +
                pickRandomElement(lastNames);

        // Categories
		var pickedDiseases = makeRandomArray(
                diseases, diseaseObjectGenerator, "name");
		var pickedMedications = makeRandomArray(
                medications, medicationObjectGenerator, "name");
		var pickedHabits = makeRandomArray(
                habits, habitObjectGenerator, "name");

        // Bio-Metrics
		var age = Math.floor(Math.random() * (100 - 1)) + 1;
        var ageGroup; // FIXME

        // Last Visit
        var lastVisit = randomDate(new Date(2012, 0, 1), new Date());
        var lastVisitPeriod = "";
        var lastVisitMoment = moment(lastVisit);
        var todayMoment = moment(new Date());
        var diffLastVisitToTodayYears =
                todayMoment.diff(lastVisitMoment, 'years');
        var diffLastVisitToTodayMonths =
                todayMoment.diff(lastVisitMoment, 'months');
        if (diffLastVisitToTodayYears < 0) {
            if (diffLastVisitToTodayMonths < 6) {
                lastVisitPeriod = "Menos de 6 meses";
            } else {
                lastVisitPeriod = "6 a 12 meses";
            }
        } else if (diffLastVisitToTodayYears < 2) {
            lastVisitPeriod = "Mais que 1 ano e menos que 2 anos";
        } else if (diffLastVisitToTodayYears < 5) {
            lastVisitPeriod = "Mais que 2 anos e menos que 5 anos";
        } else {
            lastVisitPeriod = "Mais que 5 anos";
        }

		return {
			id: id,
			name: name,
			age: age,
			diseases: pickedDiseases,
			medications: pickedMedications,
            habits: pickedHabits,
            lastVisit: lastVisit,
            lastVisitPeriod: lastVisitPeriod
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
node_fs.writeFile(filename, jsonData, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("Saved " + filename);
}); 
