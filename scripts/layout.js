var layoutApp = angular.module('layoutApp',[]);

layoutApp.controller('layoutCtrl', ['$scope', function($scope){
    $scope.Types = [{}];
    $scope.width = 12;
    
    $scope.addColumn = function(){
      $scope.Types.push({});
      $scope.width = $scope.Types.length < 7 ? Math.floor(12/$scope.Types.length) : 1;
    };
    $scope.removeColumn = function(column){
      $scope.Types.splice($scope.Types.indexOf(column), 1);
    };
}]);

layoutApp.directive("splitvertical", function($compile){
	return function(scope, element, attrs){
		element.bind("click", function(){
			angular
                .element(
                    document.getElementById('layout-rows'))
                .append($compile(
                    "<div class='row'>" +
                    "<div class='col-md-8'>" +
                    "<div class='layout-view'>.col-md-8</div>" +
                    "</div>" +
                    "</div>"
/*
"<div class='row'>" +
    "<div class='col-md-{{width}}' ng-repeat='Type in Types'>" +
        "<div class='layout-view'>" +
            "{{$index}}" +
            "<button class='btn btn-primary' ng-click='removeColumn(Type)'>Delete</button>"
        "</div>"
    "</div>"
"</div>"
*/
                )(scope));
		});
	};
});
