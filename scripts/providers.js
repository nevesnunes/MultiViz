var moduleProviders = angular.module('moduleProviders', []);

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
        ['patientData', 'retrievePatientData',
        function(patientData, retrievePatientData) {
    var retrieveAges = function() {
        var counts = {};

        counts.minAge = Number.MAX_SAFE_INTEGER;
        counts.maxAge = Number.MIN_SAFE_INTEGER;
        var patients = patientData.getAttribute(
            patientData.KEY_PATIENTS);
        var length = patients.length;
        while (length--) {
            if (patients[length].biomedicalAttributes.age > counts.maxAge) {
                counts.maxAge = patients[length].biomedicalAttributes.age;
            }
            if (patients[length].biomedicalAttributes.age < counts.minAge) {
                counts.minAge = patients[length].biomedicalAttributes.age;
            }
        }

        // Data is an array, where each position stores the count of 
        // patients of the corresponding age
        var agesLength = counts.maxAge - counts.minAge + 1;
        counts.data = Array
            .apply(null, Array(agesLength))
            .map(Number.prototype.valueOf, 0);
        length = patients.length;
        while (length--) {
            var age = patients[length].biomedicalAttributes.age;
            counts.data[age - counts.minAge]++;
        }

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

    return {
        retrieveAges: retrieveAges,
        retrieveIncidences: retrieveIncidences
    };
}]);
