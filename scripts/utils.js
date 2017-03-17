var moduleUtils = angular.module('moduleUtils', []);

moduleUtils.factory('utils', ['$q', function($q) {
    // Match one property
    var arrayObjectIndexOf = function(array, value, property) {
        for (var i = 0, len = array.length; i < len; i++) {
            if (array[i][property] === value)
                return i;
        }
        return -1;
    };

    // Match all properties
    var arrayObjectFullIndexOf = function(array, values, properties) {
        for (var i = 0, len = array.length; i < len; i++) {
            var allMatched = true;
            for (var j = 0, len2 = properties.length; j < len2; j++) {
                var value = values[j];
                var property = properties[j];
                if (array[i][property] !== value)
                    allMatched = false;
            }
            if (allMatched)
                return i;
        }
        return -1;
    };

    var capitalizeEachWord = function(str) {
        return str.replace(/\w\S*/g, function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    };

    var removeSpaces = function(str) {
        return str.replace(/ /g,'');
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

    // Replace object if exists, otherwise add it
    var updateObjectInArray = function(array, key, value, object) {
        var index = arrayObjectIndexOf(array, value, key);
        if (index > -1) {
            array[index] = object;
        } else {
            array.push(object);
        }

        return extend(array, []);
    };

    // Remove object if exists
    var spliceObjectInArray = function(array, key, value) {
        var index = arrayObjectIndexOf(array, value, key);
        if (index > -1) {
            array.splice(index, 1);
        }

        return array;
    };

    /*
     * Run additional functionality before executing a function.
     *
     * Example:
     *
	 * augment(visualizations, function(name, fn) {
	 *     console.log("calling " + name);
	 * });
	 */
    var augment = function(fnHolder, withFn) {
        var name, fn;
        for (name in fnHolder) {
            fn = fnHolder[name];
            if (typeof fn === 'function') {
                fnHolder[name] = (function(name, fn) {
                    var args = arguments;
                    return function() {
                        withFn.apply(this, args);
                        return fn.apply(this, arguments);

                    };
                })(name, fn);
            }
        }
    };

    return {
        arrayObjectIndexOf: arrayObjectIndexOf,
        arrayObjectFullIndexOf: arrayObjectFullIndexOf,
        arrayObjectPairIndexOf: arrayObjectPairIndexOf,
        arrayObjectFullPairIndexOf: arrayObjectFullPairIndexOf,
        capitalizeEachWord: capitalizeEachWord,
        removeSpaces: removeSpaces,
        spliceObjectInArray: spliceObjectInArray,
        updateObjectInArray: updateObjectInArray,
        extractValueFromPair: extractValueFromPair,
        resolveEvents: resolveEvents,
        augment: augment,
        extend: extend
    };
}]);
