var moduleUtils = angular.module('moduleUtils', []);

moduleUtils.factory('utils', function() {
    var makeImgButton = function(options) {
        options.clazz = options.clazz || "btn-primary";
        options.directive = options.directive || "";
        options.id = options.id || "";
        options.nodeID = options.nodeID || "";
        options.placement = options.placement || "top";
        options.style = options.style || "";
        options.text = options.text || "";
        options.title = options.title || "";
        options.checkable = options.checkable || false;
        options.isChecked = options.isChecked || false;

        var img = '<img src="' + options.img + '" ' +
                'data-id="' + options.id + '" ' +
                'class="custom-btn-svg"> ';
        var imgChecked = "";

        // Apply styling for existing checked visualizations
        if (options.isChecked) {
            options.clazz = options.clazz + " " + options.clazzChecked;
            imgChecked = '<img src="' + options.imgChecked + '" ' +
                'data-id="' + options.id + '" ' +
                'class="custom-btn-svg custom-btn-svg-checked"> ';
        }

        // Make sure all child elements have the id property, since the
        // user may click on one of them and activate functions
        // which require the id to be present in the clicked element
        return '<button class="tooltip-wrapper btn ' +
            options.clazz + '" ' +
            'ng-class="isButtonChecked()" ' +
            'style="' + options.style + '" ' +
            options.directive + ' ' +
            'directive-static-tooltip ' +
            'custom-placement="' + options.placement + '" ' +
            'data-id="' + options.id + '" ' +
            'data-node-id="' + options.nodeID + '" ' +
            'data-checkable="' + options.checkable + '" ' +
            'ng-click="' + options.method + '" ' +
            'title="' + options.title + '">' +
            img +
            imgChecked +
            options.text +
            '</button>';
    };

    var arrayObjectIndexOf = function(array, searchTerm, property) {
        for (var i = 0, len = array.length; i < len; i++) {
            if (array[i][property] === searchTerm)
                return i;
        }
        return -1;
    };

    var arrayObjectPairIndexOf = function(parameters) {
        for (var i = 0, len = parameters.array.length; i < len; i++) {
            var pairElement = parameters.array[i][parameters.propertyOfPair];
            if ((pairElement[parameters.propertyOfType] ===
                    parameters.typeTerm) &&
                    (pairElement[parameters.propertyOfValue] ===
                    parameters.valueTerm))
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

    return {
        arrayObjectIndexOf: arrayObjectIndexOf,
        arrayObjectPairIndexOf: arrayObjectPairIndexOf,
        extractValueFromPair: extractValueFromPair,
        makeImgButton: makeImgButton
    };
});
