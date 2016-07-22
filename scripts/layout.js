var layoutApp = angular.module('layoutApp',[]);

layoutApp.controller('layoutCtrl', ['$scope', function($scope){
    $scope.Types = [{}];
    $scope.width = 12;
    
    $scope.addColumn = function(){
      $scope.Types.push({});
      $scope.width = $scope.Types.length < 7 ? Math.floor(12/$scope.Types.length) : 1;
    };
}]);

layoutApp.directive("splitvertical", function($compile){
	return function(scope, element, attrs){
		element.bind("click", function(){
			scope.count++;
			angular
                .element(
                    document.getElementById('layout-rows'))
                .append($compile(
                    "<div class='row'>" +
                    "<div class='col-md-8'>" +
                    "<div class='layout-view'>.col-md-8</div>" +
                    "</div>" +
                    "</div>"
                )(scope));
		});
	};
});
