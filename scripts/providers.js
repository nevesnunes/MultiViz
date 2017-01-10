var moduleProviders = angular.module('moduleProviders', []);

moduleProviders.factory('patientData', function($window) {
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
        cloneAttributeList: cloneAttributeList
    };
});

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
