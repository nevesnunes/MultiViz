var moduleUtils = angular.module('moduleUtils', []);

moduleUtils.factory('utils', function() {
    var arrayObjectIndexOf = function(myArray, searchTerm, property) {
        for (var i = 0, len = myArray.length; i < len; i++) {
            if (myArray[i][property] === searchTerm)
                return i;
        }
        return -1;
    };

    return {
        arrayObjectIndexOf: arrayObjectIndexOf
    };
});
