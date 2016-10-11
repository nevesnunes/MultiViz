var moduleIndex = angular.module('moduleIndex', []);

moduleIndex.factory('retrievePatientData', ['$http', function($http) {
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

moduleIndex.controller('controllerAddData',
        ['$scope', '$http', 'patientData', 'retrievePatientData',
        function($scope, $http, patientData, retrievePatientData, $location) {
    var patientDataPromise = retrievePatientData.retrieveData('patients.json');
    patientDataPromise.then(function(result) {
        $scope.patientList = result.map(function(data, index) {
            return {
                index: index,
                id: data.id,
                name: data.name,
                age: data.age,
                diseases: data.diseases,
                medications: data.medications,
                habits: data.habits,
                lastVisit: data.lastVisit
            };
        });
        patientData.setData(patientData.KEY_PATIENTS, result);

        $scope.clonePatient = function(obj) {
            return (obj === undefined) ?
                {} :
                {
                    index: obj.index,
                    id: obj.id,
                    name: obj.name,
                    age: obj.age,
                    diseases: obj.diseases,
                    medications: obj.medications,
                    habits: obj.habits,
                    lastVisit: obj.lastVisit
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

        //
        // directive-option-list API
        //
        $scope.optionListCondition = function(button) {
            var input = angular.element('#input-patient');
            var inputModel = input.scope().optionListModel;

            var emptyText = (inputModel === undefined) ||
                (inputModel.name === "");
            var mismatchedText = (inputModel === undefined) ||
                !($scope.patientListContainsName(inputModel.name));
            // Pass if button is not disabled
            return !(emptyText || mismatchedText);
        };
        $scope.optionListAction = function(button, optionListModel) {
            $scope.gotoViews(button, optionListModel);
        };

        $scope.setTooltipText = function(button) {
            var input = angular.element('#input-patient');
            var inputModel = input.scope().optionListModel;

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

    $scope.gotoViews = function(button, optionListModel) {
        var dataToShare = $scope.getPatientByID(optionListModel.id);

        // User only introduced text, thus no id was assigned;
        // we have to search with this text
        if (dataToShare === undefined) {
            dataToShare = $scope.getPatientByName(optionListModel.name);
        } 
        patientData.setData(patientData.KEY_PATIENT, dataToShare);

        window.location.href = "layout.html";
    };

    $scope.selectEntry = function(button, patient) {
        var input = angular.element('#input-patient').scope();
        input.optionListModel = $scope.clonePatient(patient);

        patientData.setData(patientData.KEY_PATIENT, input.optionListModel);
    };
}]);

moduleIndex.controller('controllerMainPanel',
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
                    element.tooltip('hide')
                        .attr('html', true)

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
                    element.tooltip('hide')
                        .attr('data-html', true)
                        .attr('data-container', 'body')
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

moduleIndex.controller('controllerOptionList',
        ['$scope', function($scope) {
    $scope.selectedOption = 0;
    $scope.setSelectedOption = function(index) { $scope.selectedOption = index; };
    $scope.getSelectedOption = function() { return $scope.selectedOption; };

    $scope.focusedEntry = function(button, patient) {
        $scope.selectedOption = patient.index;
    };

    $scope.isEntrySelected = function(index) {
        return (index === $scope.selectedOption) ? "entrySelected" : "";
    };
}]);

moduleIndex.directive('directiveOptionList', ['$compile', '$timeout', 'patientData',
    function($compile, $timeout, patientData) {
        return {
            scope: false, // Use the same scope to not break filter of ng-model
            link: function(scope, element, attrs) {
                var selectOptionDown = function(elems) {
                    if (scope.getSelectedOption() === -1) {
                        scope.setSelectedOption(elems.length - 1);
                    } else {
                        scope.setSelectedOption(
                            (scope.getSelectedOption() === 0) ?
                                0 :
                                scope.getSelectedOption() - 1);
                    }
                };

                var selectOptionUp = function(elems) {
                    if (scope.getSelectedOption() === -1) {
                        scope.setSelectedOption(0);
                    } else {
                        scope.setSelectedOption(
                            (scope.getSelectedOption() === elems.length - 1) ?
                                scope.getSelectedOption() :
                                scope.getSelectedOption() + 1);
                    }
                };

                element.bind("keyup", function(event) {
                    var elems = scope.filteredAttributes;
                    $timeout(function() {
                        switch (event.which) {
                            // Arrow Up
                            case 40: {
                                selectOptionUp(elems);
                                event.preventDefault();

                                break;
                            }
                            // Arrow Down
                            case 38: {
                                selectOptionDown(elems);
                                event.preventDefault();

                                break;
                            }
                            // Enter
                            case 13: {
                                // Input matches an existing entry
                                if (scope.optionListCondition()) {
                                    // Instant selection
                                    if(!scope.optionListModel) {
                                        scope.optionListModel =
                                            elems[scope.getSelectedOption()];
                                    }
                                    scope.optionListAction(
                                        event, scope.optionListModel);
                                // Either fill in the selected entry or
                                // clear the input when no entry is available
                                } else {
                                    // FIXME: Refactor to be generic
                                    var input = angular.element('#input-patient');
                                    var newModel = scope.clonePatient(
                                        elems[scope.getSelectedOption()]
                                    );
                                    input.scope().optionListModel = newModel;
                                    input.focus();

                                    scope.setSelectedOption(0);
                                }
                                event.preventDefault();

                                break;
                            }
                            default: {
                                scope.setSelectedOption(0);
                            }
                        } //switch
                    }, 0);
                }); //bind
            } //link
        }; //return
    }
]);
