var moduleIndex = angular.module('moduleIndex',[]);

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

moduleIndex.controller('controllerAddData', ['$scope', 'patientData', function($scope, patientData, $location) {
  $scope.patientList = ["Alice", "Bob", "Pedro Paulo Pinto Peixoto"];
  var i;	
  for (i = 0; i < 100; i++)
    $scope.patientList.push("Nome " + i.toString());
  $scope.dataToShare = [];

  $scope.gotoViews = function (button, patient) {
    $scope.dataToShare = patient;
    patientData.setData($scope.dataToShare);
    
    window.location.href = "layout.html";
  };
  $scope.selectPatient = function (button, patient) {
	var input = angular.element('#input-patient').scope();
	input.patientText = patient;

    $scope.dataToShare = patient;
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

moduleIndex.directive('ngEnter', function() {
	return function(scope, element, attrs) {
		element.bind("keydown keypress", function(event) {
			if(event.which === 13) {
				scope.$apply(function(){
					scope.$eval(attrs.ngEnter);
				});
				
				event.preventDefault();
			}
		});
	};
});
