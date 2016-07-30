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

    var addData = function(key, newObj) {
        var mydata = $window.sessionStorage.getItem(key);
        if (mydata) {
            mydata = JSON.parse(mydata);
        } else {
            mydata = [];
        }
        mydata.push(newObj);
        $window.sessionStorage.setItem(key, JSON.stringify(mydata));
    };

    var setData = function(key, newObj) {
        $window.sessionStorage.setItem(key, JSON.stringify(newObj));
    };

    var getData = function(key) {
        var mydata = $window.sessionStorage.getItem(key);
        if (mydata) {
            mydata = JSON.parse(mydata);
        }
        return mydata || [];
    };

    return {
        KEY_PATIENT: KEY_PATIENT,
        KEY_PATIENTS: KEY_PATIENTS,
        addData: addData,
        setData: setData,
        getData: getData
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
                isSelected: false,
                name: data.name
            };
        });
        patientData.setData(patientData.KEY_PATIENTS, result);

        $scope.patientListContainsName = function(text) {
            return $scope.patientList.some(function(patient) {
                return patient.name === text;
            });
        };

        $scope.isDisabled = function(button) {
            var input = angular.element('#input-patient').scope();
            var text = input.patientText && input.patientText.name;

            var emptyText = ((text === undefined) || (text === ""));
            var mismatchedText = !($scope.patientListContainsName(text));
            return emptyText || mismatchedText;
        };

        $scope.setTooltipText = function(button) {
            var input = angular.element('#input-patient').scope();
            var text = input.patientText && input.patientText.name;

            var emptyText = ((text === undefined) || (text === ""));
            var mismatchedText = !($scope.patientListContainsName(text));
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

    $scope.gotoViews = function(button, patient) {
        $scope.dataToShare = patient;
        patientData.setData(patientData.KEY_PATIENT, $scope.dataToShare);

        window.location.href = "layout.html";
    };

    $scope.selectPatient = function(button, patient) {
        var input = angular.element('#input-patient').scope();
        input.patientText = patient;

        $scope.dataToShare = input.patientText;
        patientData.setData(patientData.KEY_PATIENT, $scope.dataToShare);

        $scope.selectedOption = -1;
    };

    $scope.isSelected = function(id) {
        return (id === $scope.selectedOption) ? "entrySelected" : "";
    };
}]);

moduleIndex.controller('controllerGetData',
        ['$scope', 'patientData', function($scope, patientData) {
    $scope.patient = patientData.getData(patientData.KEY_PATIENT);
}]);

moduleIndex.controller('controllerGoToIndex',
        ['$scope', 'patientData', function($scope, patientData) {
    $scope.gotoIndex = function(button) {
        window.location.href = "index.html";
    };
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
                                        scope.gotoViews(event, scope.patientText);
                                    } else {
                                        scope.patientText = scope.filteredPatientList[scope.selectedOption];

                                        scope.dataToShare = scope.patientText;
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
