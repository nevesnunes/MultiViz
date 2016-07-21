angular.module('app',[])
  .controller('layoutCtrl', ['$scope', function($scope){
    
    $scope.Types = [{}];
    $scope.width = 12;
    
    $scope.add = function(){
      $scope.Types.push({});
      $scope.width = $scope.Types.length < 7 ? Math.floor(12/$scope.Types.length) : 1;
    };
  }]);
