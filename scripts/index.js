var moduleIndex = angular.module('moduleIndex', []);

moduleIndex.factory('retrievePatientData', ['$http', function($http) {
    var retrieveData = function() {
        return $http
            .get('data/patients.json')
            .then(function(result) {
                return result.data;
            });
    };

    return {
        retrieveData: retrieveData
    };
}]);

moduleIndex.factory('patientData', function($window) {
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

    var arrayObjectIndexOf = function(myArray, searchTerm, property) {
        for (var i = 0, len = myArray.length; i < len; i++) {
            if (myArray[i][property] === searchTerm)
                return i;
        }
        return -1;
    };

    var getAttributeList = function(key, attributeType) {
        return attributes[key]
            .map(function(patient) {
                return patient[attributeType];
            })
            .reduce(reduceDataArray, []);
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
        getAttributeList: getAttributeList
    };
});

moduleIndex.controller('controllerAddData',
        ['$scope', '$http', 'patientData', 'retrievePatientData',
        function($scope, $http, patientData, retrievePatientData, $location) {
    var patientDataPromise = retrievePatientData.retrieveData();
    patientDataPromise.then(function(result) {
        $scope.patientList = result.map(function(data, index) {
            return {
                id: index,
                name: data.name
            };
        });
        patientData.setData(patientData.KEY_PATIENTS, result);

        $scope.clonePatient = function(obj) {
            return (obj === undefined) ?
                {} :
                {
                    id: obj.id,
                    name: obj.name
                };
        };

        $scope.getPatientByID = function(id) {
            var result;
            $scope.patientList.some(function(patient, i) {
                return (patient.id === id) ? ((result = patient), true) : false;
            });
            return result;
        };

        $scope.getPatientByName = function(name) {
            var result;
            $scope.patientList.some(function(patient, i) {
                return (patient.name === name) ? ((result = patient), true) : false;
            });
            return result;
        };

        $scope.patientListContainsName = function(text) {
            return $scope.patientList.some(function(patient) {
                return patient.name === text;
            });
        };

        $scope.isDisabled = function(button) {
            var input = angular.element('#input-patient').scope();
            var inputModel = input.patientModel;

            var emptyText = (inputModel === undefined) ||
                (inputModel.name === "");
            var mismatchedText = (inputModel === undefined) ||
                !($scope.patientListContainsName(inputModel.name));
            return emptyText || mismatchedText;
        };

        $scope.setTooltipText = function(button) {
            var input = angular.element('#input-patient').scope();
            var inputModel = input.patientModel;

            var emptyText = (inputModel === undefined) ||
                (inputModel.name === "");
            var mismatchedText = (inputModel === undefined) ||
                !($scope.patientListContainsName(inputModel.name));
            if (emptyText) {
                $scope.tooltipText = "Nenhum paciente foi escolhido";
            } else if (mismatchedText) {
                $scope.tooltipText = "O paciente escolhido não existe";
            } else {
                $scope.tooltipText = "";
            }
        };
    });

    $scope.dataToShare = [];
    $scope.selectedOption = -1;

    $scope.gotoViews = function(button, patientModel) {
        $scope.dataToShare = $scope.getPatientByID(patientModel.id);

        // User only introduced text, thus no id was assigned;
        // we have to search with this text
        if ($scope.dataToShare === undefined) {
            $scope.dataToShare = $scope.getPatientByName(patientModel.name);
        } 
        patientData.setData(patientData.KEY_PATIENT, $scope.dataToShare);

        window.location.href = "layout.html";
    };

    $scope.selectEntry = function(button, patient) {
        var input = angular.element('#input-patient').scope();
        input.patientModel = $scope.clonePatient(patient);

        $scope.dataToShare = $scope.clonePatient(patient);
        patientData.setData(patientData.KEY_PATIENT, $scope.dataToShare);

        $scope.selectedOption = -1;
    };

    $scope.isEntrySelected = function(id) {
        return (id === $scope.selectedOption) ? "entrySelected" : "";
    };
}]);

moduleIndex.controller('controllerGoToIndex',
        ['$scope', 'patientData', function($scope, patientData) {
    $scope.patient = patientData.getAttribute(patientData.KEY_PATIENT);
    $scope.gotoIndex = function(button) {
        window.location.href = "index.html";
    };
}]);

moduleIndex.directive('directiveStaticTooltip', [function() {
    return {
        link: function(scope, element, attributes) {
            element
                .on('mouseenter', function() {
                    element
                        .tooltip('hide')
                        
                        // Avoid oclusion with custom placement
                        .attr('data-placement', element.attr('custom-placement'))
                        .tooltip('fixTitle')
                        .tooltip('show');
                })
                .on('mouseleave', function() {
                    element.tooltip('hide');
                });
        } //link
    }; //return
}]);

moduleIndex.directive('directiveTooltip', [function() {
    return {
        link: function(scope, element, attributes) {
            element
                .on('mouseenter', function() {
                    scope.setTooltipText();
                    element
                        .tooltip('hide')
                        .attr('data-placement', 'right')
                        .attr('data-original-title', scope.tooltipText)
                        .attr('title', scope.tooltipText)
                        .tooltip('fixTitle')
                        .tooltip('show');
                })
                .on('mouseleave', function() {
                    element.tooltip('hide');
                });
        } //link
    }; //return
}]);

moduleIndex.directive('ngKeySelect', ['$compile', '$timeout', 'patientData',
    function($compile, $timeout, patientData) {
        return {
            scope: false, // Use the same scope to not break filter of ng-model
            link: function(scope, element, attrs) {
                element.bind("keyup", function(event) {
                    var elems = scope.filteredPatientList;
                    switch (event.which) {
                        case 40: {
                            $timeout(function() {
                                if (scope.selectedOption === -1) {
                                    scope.selectedOption = 0;
                                } else {
                                    scope.selectedOption = scope.selectedOption === elems.length - 1 ?
                                        scope.selectedOption :
                                        scope.selectedOption + 1;
                                }
                                event.preventDefault();
                                console.log(scope.selectedOption + ": " + elems[scope.selectedOption].name);
                            }, 0);
                            break;
                        }
                        case 38: {
                            $timeout(function() {
                                if (scope.selectedOption === -1) {
                                    scope.selectedOption = elems.length - 1;
                                } else {
                                    scope.selectedOption = scope.selectedOption === 0 ?
                                        0 : scope.selectedOption - 1;
                                }
                                event.preventDefault();
                                console.log(scope.selectedOption + ": " + elems[scope.selectedOption].name);
                            }, 0);
                            break;
                        }
                        case 13: {
                            $timeout(function() {
                                if (!scope.isDisabled() && (scope.selectedOption === -1)) {
                                    scope.gotoViews(event, scope.patientModel);
                                } else {
                                    scope.patientModel = scope.clonePatient(elems[scope.selectedOption]);

                                    scope.dataToShare = scope.clonePatient(elems[scope.selectedOption]);
                                    patientData.setData(patientData.KEY_PATIENT, scope.dataToShare);

                                    scope.selectedOption = -1;
                                }

                                event.preventDefault();
                            }, 0);
                            break;
                        }
                        default: {
                            $timeout(function() {
                                scope.selectedOption = -1;
                            }, 0);
                        }
                    } //switch
                }); //bind
            } //link
        }; //return
    }
]);
