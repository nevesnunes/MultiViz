var moduleWidgetBuilder = angular.module('moduleWidgetBuilder',
        ['moduleProviders']);

moduleWidgetBuilder.factory('widgets', [function() {
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
        return '<button class="tooltip-wrapper btn custom-btn-margin ' +
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

    return {
        makeImgButton: makeImgButton
    };
}]);

moduleWidgetBuilder.directive('directiveStaticTooltip', [function() {
    return {
        link: function(scope, element, attributes) {
            element
                .on('mouseenter', function() {
                    element.tooltip('hide')
                        .attr('html', true)

                        // Avoid oclusion with custom placement
                        .attr('data-placement', element.attr('custom-placement'))
                        .tooltip('fixTitle')
                        .tooltip('show');
                })
                .on('mouseleave', function() {
                    element.tooltip('hide');
                });
        } //link
    }; //return
}]);

moduleWidgetBuilder.directive('directiveTooltip', [function() {
    return {
        link: function(scope, element, attributes) {
            element
                .on('mouseenter', function() {
                    scope.setTooltipText();
                    element.tooltip('hide')
                        .attr('data-html', true)
                        .attr('data-container', 'body')
                        .attr('data-placement', 'right')
                        .attr('data-original-title', scope.tooltipText)
                        .attr('title', scope.tooltipText)
                        .tooltip('fixTitle')
                        .tooltip('show');
                })
                .on('mouseleave', function() {
                    element.tooltip('hide');
                });
        } //link
    }; //return
}]);

moduleWidgetBuilder.controller('controllerOptionList',
        ['$scope', function($scope) {
    $scope.selectedOption = 0;
    $scope.setSelectedOption = function(index) { $scope.selectedOption = index; };
    $scope.getSelectedOption = function() { return $scope.selectedOption; };

    $scope.focusedEntry = function(button, patient) {
        $scope.selectedOption = patient.index;
    };

    $scope.isEntrySelected = function(index) {
        return (index === $scope.selectedOption) ? "entrySelected" : "";
    };
}]);

moduleWidgetBuilder.directive('directiveOptionList',
        ['$compile', '$timeout', 'patientData',
        function($compile, $timeout, patientData) {
    return {
        scope: false, // Use the same scope to not break filter of ng-model
        link: function(scope, element, attrs) {
            var selectOptionDown = function(elems) {
                if (scope.getSelectedOption() === -1) {
                    scope.setSelectedOption(elems.length - 1);
                } else {
                    scope.setSelectedOption(
                        (scope.getSelectedOption() === 0) ?
                            0 :
                            scope.getSelectedOption() - 1);
                }
            };

            var selectOptionUp = function(elems) {
                if (scope.getSelectedOption() === -1) {
                    scope.setSelectedOption(0);
                } else {
                    scope.setSelectedOption(
                        (scope.getSelectedOption() === elems.length - 1) ?
                            scope.getSelectedOption() :
                            scope.getSelectedOption() + 1);
                }
            };

            element.bind("keyup", function(event) {
                var elems = scope.filteredAttributes;
                $timeout(function() {
                    switch (event.which) {
                        // Arrow Up
                        case 40: {
                            selectOptionUp(elems);
                            event.preventDefault();

                            break;
                        }
                        // Arrow Down
                        case 38: {
                            selectOptionDown(elems);
                            event.preventDefault();

                            break;
                        }
                        // Enter
                        case 13: {
                            // Input matches an existing entry
                            if (scope.optionListCondition()) {
                                // Instant selection
                                if(!scope.optionListModel) {
                                    scope.optionListModel =
                                        elems[scope.getSelectedOption()];
                                }
                                scope.optionListAction(
                                    event, scope.optionListModel);
                            // Either fill in the selected entry or
                            // clear the input when no entry is available
                            } else {
                                // FIXME: Refactor to be generic
                                var input = angular.element('#input-option-list');
                                var newModel = scope.clonePatient(
                                    elems[scope.getSelectedOption()]
                                );
                                input.scope().optionListModel = newModel;
                                input.focus();

                                scope.setSelectedOption(0);
                            }
                            event.preventDefault();

                            break;
                        }
                        default: {
                            scope.setSelectedOption(0);
                        }
                    } //switch
                }, 0);
            }); //bind
        } //link
    }; //return
}]);
