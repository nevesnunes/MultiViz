var moduleLayout = angular.module('module-layout',[]);

moduleLayout.controller('layoutCtrl', ['$scope', function($scope){
    $scope.Types = [[]];
    $scope.width = 12;

    $scope.addColumn = function(){
      $scope.Types.push([]);
      $scope.width = $scope.Types.length < 7 ? Math.floor(12/$scope.Types.length) : 1;
    };
    $scope.removeColumn = function(column){
      $scope.Types.splice($scope.Types.indexOf(column), 1);
    };
}]);

moduleLayout.directive("splitvertical", function($compile, $timeout){
	return { 
        restrict: 'A',
        link: function(scope, element, attrs){
            element.bind("click", function(){
                $timeout(function(){ angular
                    .element(
                        document.getElementById('layout-rows'))
                    .append($compile(
                        "<div class='row'>" +
                        "<div class='col-md-8'>" +
                        "<div class='layout-view'>{{$id}}</div>" +
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
                }, 0); //timeout
            }); //bind
        } //link
    }; //return
});

var moduleSplits = angular.module('module-splits', ['shagstrom.angular-split-pane']);

angular.module("moduleCombined", ["module-layout", "module-splits"]);
/*
angular.element(document).ready(function() {
    var divSplits = document.getElementById("div-splits");
    angular.bootstrap(divSplits, ['moduleSplits']);

    var divLayout = document.getElementById("div-layout");
    angular.bootstrap(divLayout, ['moduleLayout']);
});
*/
