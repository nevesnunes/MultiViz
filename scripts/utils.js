var moduleUtils = angular.module('moduleUtils', []);
/*
moduleUtils.directive("directiveButton",function($compile) {
  return {
    link: function(scope, element, attrs) {
        scope.isButtonChecked = function() {
        var a = element.data('checked');
        var b = element.attr('data-checked');

            return "";
        };
    }
  };
});
*/
moduleUtils.factory('utils', function() {
    var makeImgButton = function(options) {
        options.clazz = options.clazz || "btn-primary";
        options.directive = options.directive || "";
        options.id = options.id || "";
        options.placement = options.placement || "top";
        options.style = options.style || "";
        options.text = options.text || "";
        options.title = options.title || "";
        options.checkable = options.checkable || false;

        // Make sure all child elements have the id property, since the
        // user may click on one of them and activate functions
        // which expect the id to be present in the clicked element
        return '<button class="tooltip-wrapper btn ' +
            options.clazz + '" ' +
            'ng-class="isButtonChecked()" ' +
            'style="' + options.style + '" ' +
            options.directive + ' ' +
            'directive-static-tooltip custom-placement="' + options.placement + '" ' +
            'data-id="' + options.id + '" ' +
            'data-checkable="' + options.checkable + '" ' +
            'data-checked="false" ' +
            'ng-click="' + options.method + '" ' +
            'title="' + options.title + '">' +
            '<img src="' + options.img + '" ' +
                'data-id="' + options.id + '" ' +
                'class="custom-btn-svg"> ' +
            options.text +
            '</button>';
    };

    var arrayObjectIndexOf = function(myArray, searchTerm, property) {
        for (var i = 0, len = myArray.length; i < len; i++) {
            if (myArray[i][property] === searchTerm)
                return i;
        }
        return -1;
    };

    return {
        arrayObjectIndexOf: arrayObjectIndexOf,
        makeImgButton: makeImgButton
    };
});
