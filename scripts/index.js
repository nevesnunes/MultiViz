var moduleIndex = angular.module('moduleIndex',[]);

moduleIndex.factory('retrievePatientData', ['$http',
        function($http) {
    var retrieveData = function() {
    return $http.get('data/patients.json')
        .then(function(result) { return result.data; });
    };

    return { retrieveData: retrieveData };
}]);

moduleIndex.service('patientData', function($window) {
    var KEY = 'App.patientData';

    var addData = function(newObj) {
      var mydata = $window.sessionStorage.getItem(KEY);
      if (mydata) {
        mydata = JSON.parse(mydata);
      } else {
        mydata = [];
      }
      mydata.push(newObj);
      $window.sessionStorage.setItem(KEY, JSON.stringify(mydata));
    };

    var setData = function(newObj) {
        $window.sessionStorage.setItem(KEY, JSON.stringify(newObj));
    };

    var getData = function(){
        var mydata = $window.sessionStorage.getItem(KEY);
        if (mydata) {
            mydata = JSON.parse(mydata);
        }
        return mydata || [];
    };

    return {
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
      $scope.patientList = result.map(function(data) {
          return data.name;
      });

      $scope.isDisabled = function (button) {
        var input = angular.element('#input-patient').scope();
        var text = input.patientText;

        var emptyText = ((text === undefined) || (text === ""));
        var mismatchedText = ($scope.patientList.indexOf(text) === -1);
        return emptyText || mismatchedText;
      };

      $scope.setTooltipText = function (button) {
        var input = angular.element('#input-patient').scope();
        var text = input.patientText;

        var emptyText = ((text === undefined) || (text === ""));
        var mismatchedText = ($scope.patientList.indexOf(text) === -1);
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

  $scope.gotoViews = function (button, patient) {
    $scope.dataToShare = patient;
    patientData.setData($scope.dataToShare);
    
    window.location.href = "layout.html";
  };

  $scope.selectPatient = function (button, patient) {
    var input = angular.element('#input-patient').scope();
    input.patientText = patient;

    $scope.dataToShare = input.patientText;
    patientData.setData($scope.dataToShare);
  };
}]);

moduleIndex.controller('controllerGetData', ['$scope', 'patientData', function($scope, patientData){
    $scope.patient = patientData.getData();
}]);

moduleIndex.controller('controllerGoToIndex', ['$scope', 'patientData', function($scope, patientData){
  $scope.gotoIndex = function (button) {
    window.location.href = "index.html";
  };
}]);

moduleIndex.directive('directivePatientText', [function() {
    return {
        link: function(scope, element, attributes) {
            element
                .on('mouseenter',function() {
                    element.css({'background-color':'#c4e3f3', 'color':'#31708f'});
                })
                .on('mouseleave',function() {
                    element.css({'background-color':'white', 'color':'black'});
                });
        }
    };
}]);

moduleIndex.directive('directiveTooltip', [function() {
    return {
        link: function(scope, element, attributes) {
            element
                .on('mouseenter',function() {
                    scope.setTooltipText();
                    element.tooltip('hide')
                        .attr('data-placement', 'right')
                        .attr('data-original-title', scope.tooltipText)
                        .attr('title', scope.tooltipText)
                        .tooltip('fixTitle')
                        .tooltip('show');
                })
                .on('mouseleave',function() {
                    element.tooltip('hide');
                });
        }
    };
}]);

moduleIndex.directive('ngEnter', function() {
	return function(scope, element, attrs) {
		element.bind("keydown keypress", function(event) {
			if (event.which === 13) {
                if (!scope.isDisabled()) {
                  scope.$apply(function(){
                    scope.$eval(attrs.ngEnter);
                  });
                  
                  event.preventDefault();
                }
			}
		});
	};
});

moduleIndex.directive('ngKeySelect', ['$timeout', 'patientData', function($timeout, patientData) {
	return function(scope, element, attrs) {
		element.bind("keydown keypress", function(event) {
			if (event.which === 40) {
                $timeout(function() {
                    var input = angular.element('#input-patient').scope();
                    input.patientText = scope.filteredPatientList[0];

                    scope.dataToShare = input.patientText;
                    patientData.setData(scope.dataToShare);

                    event.preventDefault();
                }, 0);
			}
		});
	};
}]);
