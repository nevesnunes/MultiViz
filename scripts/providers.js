var moduleUtils = angular.module('moduleUtils');
var moduleProviders = angular.module('moduleProviders',
        ['moduleUtils']);

moduleProviders.factory('patientData',
        ['$window', 'utils', function($window, utils) {
    var KEY_PATIENT = 'App.patient';
    var KEY_PATIENTS = 'App.patients';
    var attributes = {};

    var addData = function(key, newObj) {
        var mydata = $window.sessionStorage.getItem(key);
        if (mydata) {
            mydata = JSON.parse(mydata);
        } else {
            mydata = [];
        }
        mydata.push(newObj);
        $window.sessionStorage.setItem(key, JSON.stringify(mydata));
        attributes[key] = getData(key);
    };

    var setData = function(key, newObj) {
        $window.sessionStorage.setItem(key, JSON.stringify(newObj));
        attributes[key] = getData(key);
    };

    var getData = function(key) {
        var mydata = $window.sessionStorage.getItem(key);
        if (mydata) {
            mydata = JSON.parse(mydata);
        }
        return mydata || [];
    };

    var getAttribute = function(key) {
        return attributes[key];
    };

    var getObjectByID = function(key, id) {
        var index = utils.arrayObjectIndexOf(
            attributes[key], id, "id");
        return (index !== -1) ?
            attributes[key][index] :
            null;
    };

    var reduceDataArray = function(previous, current, i) {
        current.forEach(function(element) {
            if (previous.indexOf(element) === -1) {
                previous.push(element);
            }
        });
        return previous;
    };

    // Collects all values of a given array
    var getAttributeList = function(key, attributeType) {
        // FIXME:
        // Invalid lists, due to loading url without stored attributes;
        // Will probably change to some REST API
        if (attributes[key].length === 0) {
            window.location.href = "index.html";
        }

        return attributes[key]
            .map(function(patient) {
                return patient[attributeType];
            })
            .reduce(reduceDataArray, []);
    };

    // Wraps non-array property into array before collection
    var getAttributePropertyList = function(key, attributeType) {
        // FIXME:
        // Invalid lists, due to loading url without stored attributes;
        // Will probably change to some REST API
        if (attributes[key].length === 0) {
            window.location.href = "index.html";
        }

        return attributes[key]
            .map(function(patient) {
                return [patient[attributeType]];
            })
            .reduce(reduceDataArray, []);
    };

    // Used when the property is an object, therefore we need to
    // specify the key in order to reduce an array made with each
    // object's key
    var getAttributeListByProperty = function(key, attributeType, property) {
        // FIXME:
        // Invalid lists, due to loading url without stored attributes;
        // Will probably change to some REST API
        if (attributes[key].length === 0) {
            window.location.href = "index.html";
        }

        return attributes[key]
            .map(function(patient) {
                return patient[attributeType].map(function(obj) {
                    return obj[property];
                });
            })
            .reduce(reduceDataArray, []);
    };

    var cloneAttributeList = function(obj) {
        return (obj === undefined) ?
            {} :
            {
                name: obj.name,
                startDate: obj.startDate
            };
    };

    // Initialize
    attributes[KEY_PATIENT] = getData(KEY_PATIENT);
    attributes[KEY_PATIENTS] = getData(KEY_PATIENTS);

    return {
        KEY_PATIENT: KEY_PATIENT,
        KEY_PATIENTS: KEY_PATIENTS,
        addData: addData,
        setData: setData,
        getData: getData,
        getAttribute: getAttribute,
        getAttributeList: getAttributeList,
        getAttributeListByProperty: getAttributeListByProperty,
        getAttributePropertyList: getAttributePropertyList,
        getObjectByID: getObjectByID,
        cloneAttributeList: cloneAttributeList
    };
}]);

moduleProviders.factory('retrievePatientData', ['$http', function($http) {
    var retrieveData = function(filename) {
        return $http
            .get('data/' + filename)
            .then(function(result) {
                return result.data;
            });
    };

    return {
        retrieveData: retrieveData
    };
}]);

moduleProviders.factory('retrieveCountsData',
        ['patientData', 'retrievePatientData', 'utils',
        function(patientData, retrievePatientData, utils) {
    var fillOrderedArray = function(attributeParent, attributeName) {
        var counts = {};

        counts.min = Number.MAX_SAFE_INTEGER;
        counts.max = Number.MIN_SAFE_INTEGER;
        var patients = patientData.getAttribute(
            patientData.KEY_PATIENTS);
        var length = patients.length;
        var value;
        while (length--) {
            value = (attributeParent) ?
                patients[length][attributeParent][attributeName] :
                patients[length][attributeName];
            if (value > counts.max) {
                counts.max = value;
            }
            if (value < counts.min) {
                counts.min = value;
            }
        }

        // Data is an array, where each position stores the count of 
        // patients of the corresponding attribute value
        var dataLength = counts.max - counts.min + 1;
        counts.data = Array
            .apply(null, Array(dataLength))
            .map(Number.prototype.valueOf, 0);
        length = patients.length;
        while (length--) {
            value = (attributeParent) ?
                patients[length][attributeParent][attributeName] :
                patients[length][attributeName];
            counts.data[value - counts.min]++;
        }

        return counts;
    };

    var retrieveAges = function() {
        var counts = fillOrderedArray('biomedicalAttributes', 'age');

        // Include current patient value, adjusted to corresponding array index
        var patient = patientData.getAttribute(
            patientData.KEY_PATIENT);
        counts.currentPatientData = patient.age - counts.min + 1;

        return counts;
    };

    var retrieveHeights = function() {
        var counts = fillOrderedArray('biomedicalAttributes', 'height');

        // Include current patient value, adjusted to corresponding array index
        var patient = patientData.getAttribute(
            patientData.KEY_PATIENT);
        counts.currentPatientData = 
            patient.biomedicalAttributes.height - counts.min + 1;

        return counts;
    };

    var retrieveWeights = function() {
        var counts = fillOrderedArray('biomedicalAttributes', 'weight');

        // Include current patient value, adjusted to corresponding array index
        var patient = patientData.getAttribute(
            patientData.KEY_PATIENT);
        counts.currentPatientData = 
            patient.biomedicalAttributes.weight - counts.min + 1;

        return counts;
    };

    var retrieveIncidences = retrievePatientData.retrieveData('counts.json')
        .then(function(result) {
            var counts = {};
            counts.data = result;

            var patients = patientData.getAttribute(
                patientData.KEY_PATIENTS);
            counts.countPatients = patients.length;

            counts.maxIncidences = Number.MIN_SAFE_INTEGER;
            var length = result.length;
            while (length--) {
                if (result[length].incidences > counts.maxIncidences) {
                    counts.maxIncidences = result[length].incidences;
                }
            }

            return counts;
        });

    var retrieveHabitsHigiene = retrievePatientData.retrieveData(
            'patientDataTypes.json')
        .then(function(result) {
            var counts = [];

            var patients = patientData.getAttribute(
                patientData.KEY_PATIENTS);

            var habits = result.habitsHigiene;
            var frequencies = result.habitsHigieneFrequencies;

            // Collect all existing habits
            counts.data = [];
            var length = patients.length;
            while (length--) {
                var patient = patients[length];
                for (var i in patient.habitsHigiene) {
                    var habit = patient.habitsHigiene[i];
                    var index = utils.arrayObjectIndexOf(
                        counts.data, habit.name, 'name');
                    // Store habit if new
                    if (index === -1) {
                        counts.data.push({
                            name: habit.name,
                            htmlName: utils.removeSpaces(
                                utils.capitalizeEachWord(habit.name))
                                .replace(/[^a-zA-Z\d]/g, '_'),
                        frequencies: []
                    });
                    index = utils.arrayObjectIndexOf(
                        counts.data, habit.name, 'name');
                }

                // Store frequency if new
                var frequencyIndex = utils.arrayObjectIndexOf(
                    counts.data[index].frequencies,
                    habit.frequency.name,
                    'name');
                if (frequencyIndex === -1) {
                    counts.data[index].frequencies.push({
                        name: habit.frequency.name,
                        htmlName: counts.data[index].htmlName +
                            utils.removeSpaces(
                                utils.capitalizeEachWord(
                                        habit.frequency.name))
                                .replace(/[^a-zA-Z\d]/g, '_'),
                            incidences: habit.frequency.value,
                            patientIDs: []
                        });
                        frequencyIndex = utils.arrayObjectIndexOf(
                            counts.data[index].frequencies,
                            habit.frequency.name,
                            'name');
                    }
                    // Count patient with current frequency
                    if (counts
                            .data[index]
                            .frequencies[frequencyIndex]
                            .patientIDs
                            .indexOf(patient.id) === -1)
                        counts
                            .data[index]
                            .frequencies[frequencyIndex]
                            .patientIDs
                            .push(patient.id);
                }
            }

            // Sort frequencies
            for (var habitIndex in counts.data) {
                counts.data[habitIndex]
                    .frequencies.sort(function(a, b) {
                        if (a.incidences < b.incidences) return -1;
                        if (a.incidences > b.incidences) return 1;
                        return 0;
                  });
            }

            // Include current patient value
            var currentPatient = patientData.getAttribute(
                patientData.KEY_PATIENT);
            // TODO

            return counts;
        });

    return {
        retrieveAges: retrieveAges,
        retrieveHabitsHigiene: retrieveHabitsHigiene,
        retrieveHeights: retrieveHeights,
        retrieveWeights: retrieveWeights,
        retrieveIncidences: retrieveIncidences
    };
}]);
