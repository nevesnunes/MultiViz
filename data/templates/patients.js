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
    var habitsFrequencies = [
        { name: 'Nunca', value: null, factor: null },
        { name: 'Várias vezes por mês', value: 14, factor: 1 },
        { name: 'Uma vez por semana', value: 7, factor: 1 },
        { name: 'Várias vezes por semana', value: 3, factor: 1 },
        { name: 'Todos os dias', value: 1, factor: 1 },
        { name: 'Várias vezes ao dia', value: 1, factor: 2 },
    ];
    var habitsObjectGenerator = function(element) {
        return {
            name: element,
            frequency: pickRandomElement(habitsFrequencies)
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
        { name: 'Colutório', type: null, specifyDuration: false },
        { name: 'Prótese Dentária',
            type: [
                'Fixa sobre dentes',
                'Fixa sobre implantes',
                'Prótese removivel esquelética',
                'Prótese removivel acrílica'
            ],
            specifyDuration: true
        }
    ];
    var habitsHigieneFrequencies = [
        { name: 'Nunca', value: null, factor: null },
        { name: 'Uma vez por mês', value: 30, factor: 1 },
        { name: '2-3 vezes por mês', value: 14, factor: 1 },
        { name: '1 vez por semana', value: 7, factor: 1 },
        { name: '2-6 vezes por semana', value: 2, factor: 1 },
        { name: '1 vez por dia', value: 1, factor: 1 },
        { name: '2 ou mais vezes ao dia', value: 1, factor: 2 },
    ];
    var habitsHigieneBrushingFrequency;
    var habitsHigieneObjectGenerator = function(element) {
        return {
            name: element,
            frequency: pickRandomElement(habitsHigieneFrequencies),
            typedFrequency: pickRandomElementOrNone(habitsHigieneWithType)
        };
    };

    //
    // General
    //
    var habitsGeneral = [
        'Fumador',
        'Consumidor de Alcool',
        'Consumidor de Estupefacientes'
    ];
    var habitsGeneralObjectGenerator = function() {
        return {
            type: pickRandomElementOrNone(habitsGeneral)
        };
    };

    //
    // Biomedical
    //
    var biomedicalLabExams = [
        'Glicémia',
        'Colestrol Total',
        'HDL',
        'LDL',
        'Proteína C',
        'Índice artériogénico'
    ];
    var biomedicalExtraOralExams = [
        'Configuração crâniofacial',
        'Assimetrias ou alterações faciais',
        'Dimensão vertical',
        'Limitação dos movimentos mandibulares',
        'Presença sons articulares',
        'Sintomatologia dolorosa da ATM'
    ];
    var biomedicalIntraOralExams = [
        'Alterações dos tecidos moles',
        'Hemorragia gengival',
        'Mobilididade dentária',
        'Alterações das estruturas dentárias'
    ];
    var biomedicalComplementaryExams;
    var biomedicalObjectGenerator = function() {
		var age = Math.floor(Math.random() * (100 - 1)) + 1;
        var ageGroup;
        if (age >= 16 && age <= 25)
            ageGroup = "16-25";
        else if (age >= 26 && age <= 35)
            ageGroup = "26-35";
        else if (age >= 36 && age <= 45)
            ageGroup = "36-45";
        else if (age >= 46 && age <= 55)
            ageGroup = "46-55";
        else if (age >= 56 && age <= 65)
            ageGroup = "56-65";
        else if (age >= 66 && age <= 75)
            ageGroup = "66-75";
        else if (age >= 76 && age <= 85)
            ageGroup = "76-85";
        else if (age >= 86 && age <= 95)
            ageGroup = "86-95";
        else
            ageGroup = ">96";
		var weight = Math.floor(Math.random() * (200 - 1)) + 1;
		var height = Math.floor(Math.random() * (200 - 1)) + 1;

        // Body-Mass Index
        var BMI = height / (weight * weight);

        // INR (viscosidade do sangue)
        // FIXME: INR
        
        // FIXME: exams
        
        return {
            age: age,
            ageGroup: ageGroup,
            weight: weight,
            height: height,
            BMI: BMI
        };
    };

    //
    // Diagnosis
    //
    var diagnosis;
    var lastDentalCorrectionDate;
    var rangeTeethPain = [0, 10]; // 10 = Worst pain possible
    var reasonOfLastVisit = [
        {
            name: 'Aconselhamento',
            hasDescription: false
        }, {
            name: 'Dor ou complicações com os dentes, gengivas ou boca',
            hasDescription: true
        }, {
            name: 'Tratamento',
            hasDescription: true
        }, {
            name: 'Check-up de rotina',
            hasDescription: false
        }
    ];
    var reasonOfVisit = [
        'Revisão',
        'Estético',
        'Funcional',
        'Algia'
    ];
    var diagnosisObjectGenerator = function(element) {
        // FIXME
    };

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
    var treatmentObjectGenerator = function(element) {
        // FIXME
    };

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
		// Randomize the array
		array.sort(function () {
			return Math.random() - 0.5;
		});

		var length = Math.floor(Math.random() * (array.length - 1)) + 1;
		var pickedElements = [];
		for (var i = 0; i < length; i++) {
            var chance = Math.floor(Math.random() * (4 - 1)) + 1;
            if (chance < 3)
                continue;

            // Check if element wasn't already picked
            var element = pickRandomElement(array);
            if (arrayObjectIndexOf(pickedElements, element, property) === -1) {
                var generatedObject = objectGenerator(element);
                // Skip objects that have a null/undefined property
                if (generatedObject[property]) {
                    pickedElements.push(generatedObject);
                }
            }
		}

        return pickedElements;
    };

    var pickRandomElement = function(array) {
        return array[~~(Math.random() * array.length)];
    };

    var pickRandomElementOrNone = function(array) {
        var chance = Math.floor(Math.random() * (4 - 1)) + 1;
        return (chance < 3) ? null : array[~~(Math.random() * array.length)];
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
                habits, habitsObjectGenerator, "name");
		var pickedHabitsHigiene = makeRandomArray(
                habitsHigiene, habitsHigieneObjectGenerator, "name");
        var pickedHabitsGeneral = makeRandomArray(
                habitsGeneral, habitsGeneralObjectGenerator, "type");

        // Biomedical
        var pickedBiomedicalAttributes = biomedicalObjectGenerator();

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
            biomedicalAttributes: pickedBiomedicalAttributes,
			diseases: pickedDiseases,
			medications: pickedMedications,
            habits: pickedHabits,
            habitsHigiene: pickedHabitsHigiene,
            habitsGeneral: pickedHabitsGeneral,
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
