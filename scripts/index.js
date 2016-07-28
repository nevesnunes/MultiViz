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
  $scope.dataToShare = [];
  $scope.gotoViews = function (button, patient) {
    $scope.dataToShare = patient;
    patientData.setData($scope.dataToShare);
    
    window.location.href = "layout.html";
  };
}]);

moduleIndex.controller('controllerGetData', ['$scope', 'patientData', function($scope, patientData){
    $scope.patient = patientData.getData();
}]);
