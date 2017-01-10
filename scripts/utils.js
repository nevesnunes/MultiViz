var moduleUtils = angular.module('moduleUtils', []);

moduleUtils.factory('utils', ['$q', function($q) {
    var arrayObjectIndexOf = function(array, searchTerm, property) {
        for (var i = 0, len = array.length; i < len; i++) {
            if (array[i][property] === searchTerm)
                return i;
        }
        return -1;
    };

    // Match one of the elements of a pair
    var arrayObjectPairIndexOf = function(parameters) {
        for (var i = 0, len = parameters.array.length; i < len; i++) {
            var pairElement = parameters.array[i][parameters.propertyOfPair];
            if (
                    (pairElement[parameters.propertyOfType] ===
                    parameters.typeTerm) &&
                    (pairElement[parameters.propertyOfValue] ===
                    parameters.valueTerm))
                return i;
        }
        return -1;
    };

    // Match all elements of a pair
    var arrayObjectFullPairIndexOf = function(array, parameters1, parameters2) {
        for (var i = 0, len = array.length; i < len; i++) {
            var pairElement1 = array[i][parameters1.propertyOfPair];
            var pairElement2 = array[i][parameters2.propertyOfPair];
            if (
                    (pairElement1[parameters1.propertyOfType] ===
                    parameters1.typeTerm) &&
                    (pairElement1[parameters1.propertyOfValue] ===
                    parameters1.valueTerm) &&
                    (pairElement2[parameters2.propertyOfType] ===
                    parameters2.typeTerm) &&
                    (pairElement2[parameters2.propertyOfValue] ===
                    parameters2.valueTerm))
                return i;
            // Exchange parameters
            pairElement1 = array[i][parameters2.propertyOfPair];
            pairElement2 = array[i][parameters1.propertyOfPair];
            if (
                    (pairElement1[parameters1.propertyOfType] ===
                    parameters1.typeTerm) &&
                    (pairElement1[parameters1.propertyOfValue] ===
                    parameters1.valueTerm) &&
                    (pairElement2[parameters2.propertyOfType] ===
                    parameters2.typeTerm) &&
                    (pairElement2[parameters2.propertyOfValue] ===
                    parameters2.valueTerm))
                return i;
        }
        return -1;
    };

    var extractValueFromPair = function(parameters) {
        return (parameters.pair.first[parameters.propertyOfType] ===
                parameters.typeTerm) ?
            parameters.pair.first[parameters.propertyOfValue] :
            parameters.pair.second[parameters.propertyOfValue];
    };

    // Resolve an array of events sequencially
    var resolveEvents = function(events, arg1, arg2, arg3) {
        var deferred = $q.defer();
        var promise = deferred.promise;

        deferred.resolve();

        return events.reduce(function(promise, single_event) {
            return promise.then(function() { 
                return single_event(arg1, arg2, arg3);
            });
        }, promise);
    };

    // Extends 'from' object with members from 'to'. 
    // If 'to' is null, a deep clone of 'from' is returned.
    var extend = function(from, to) {
        if (from === null || typeof from != "object") 
            return from;
        if (from.constructor != Object && from.constructor != Array) 
            return from;
        if (from.constructor == Date || 
                from.constructor == RegExp || 
                from.constructor == Function ||
                from.constructor == String || 
                from.constructor == Number || 
                from.constructor == Boolean)
            return new from.constructor(from);

        to = to || new from.constructor();

        for (var name in from) {
            to[name] = typeof to[name] == "undefined" ? 
                extend(from[name], null) : 
                to[name];
        }

        return to;
    };

    return {
        arrayObjectIndexOf: arrayObjectIndexOf,
        arrayObjectPairIndexOf: arrayObjectPairIndexOf,
        arrayObjectFullPairIndexOf: arrayObjectFullPairIndexOf,
        extractValueFromPair: extractValueFromPair,
        resolveEvents: resolveEvents,
        extend: extend
    };
}]);
