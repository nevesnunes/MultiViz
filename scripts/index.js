var moduleProviders = angular.module('moduleProviders');
var moduleWidgetBuilder = angular.module('moduleWidgetBuilder');
var moduleIndex = angular.module('moduleIndex',
    ['moduleProviders', 'moduleWidgetBuilder']);

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
                age: data.biomedicalAttributes.age,
                ageGroup: data.biomedicalAttributes.ageGroup,
                biomedicalAttributes: data.biomedicalAttributes,
                diseases: data.diseases,
                medications: data.medications,
                habits: data.habits,
                habitsHigiene: data.habitsHigiene,
                habitsGeneral: data.habitsGeneral,
                lastVisit: data.lastVisit,
                lastVisitPeriod: data.lastVisitPeriod
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
                    ageGroup: obj.ageGroup,
                    biomedicalAttributes: obj.biomedicalAttributes,
                    diseases: obj.diseases,
                    medications: obj.medications,
                    habits: obj.habits,
                    habitsHigiene: obj.habitsHigiene,
                    habitsGeneral: obj.habitsGeneral,
                    lastVisit: obj.lastVisit,
                    lastVisitPeriod: obj.lastVisitPeriod
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
            var input = angular.element('#input-option-list');
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
            var input = angular.element('#input-option-list');
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
        var input = angular.element('#input-option-list').scope();
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
