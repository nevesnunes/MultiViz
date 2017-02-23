var moduleWidgetBuilder = angular.module('moduleWidgetBuilder',
        ['moduleProviders']);

moduleWidgetBuilder.factory('widgets', [function() {
    var makeAttributePills = function(options) {
        var html = '<ul class="nav nav-pills nav-justified">' +
                '<li ' +
                    'id="btnDisplayData" ' +
                    'ng-class="isModificationTypeActive(\'' + 
                        options.modificationTypes.DATA + '\')" ' +
                    'ng-click="setModificationType(\'' + 
                        options.modificationTypes.DATA + '\')">' +
                    '<a href="#">Dados</a>' +
                '</li>' +
                '<li ' +
                    'id="btnDisplayFilters" ' +
                    'ng-class="isModificationTypeActive(\'' + 
                        options.modificationTypes.FILTERS + '\')" ' +
                    'ng-click="setModificationType(\'' + 
                        options.modificationTypes.FILTERS + '\')">' +
                    '<a href="#">Filtros</a>' +
                '</li>' +
            '</ul>' +
            '<div class="custom-separator" />';

        return html;
    };

    var makeAttributePillsContents = function(options) {
        var html = (options.currentModificationType === options.modificationTypes.DATA) ?
            // Attribute lists
            '<div class="btn-group-vertical custom-container-width" ' +
                    'role="group" aria-label="...">' +
                '<button type="button" ' +
                    'id="btnDiseases" ' +
                    'class="btn btn-default custom-container-align" ' +
                    'ng-class="isAttributeTypeActive(\'' + 
                        options.attributeTypes.DISEASES + '\')" ' +
                    'ng-click="setAttributeType(\'' + 
                        options.attributeTypes.DISEASES + '\')">' +
                    'Doenças</button>' +
                '<button type="button" ' +
                    'id="btnMedications" ' +
                    'class="btn btn-default custom-container-align" ' +
                    'ng-class="isAttributeTypeActive(\'' + 
                        options.attributeTypes.MEDICATIONS + '\')" ' +
                    'ng-click="setAttributeType(\'' + 
                        options.attributeTypes.MEDICATIONS + '\')">' +
                    'Medicações</button>' +
            '</div>' +
            '<p/>' +
            // Search
            '<div class="right-inner-addon">' +
                '<i class="glyphicon glyphicon-search"></i>' +
                '<input type="text" ' +
                    'id="input-option-list" ' +
                    'class="form-control" ' +
                    'placeholder="Procurar..." ' +
                    'ng-model="optionListModel" ' +
                    'autofocus tabindex=1>' +
            '</div>' +
            // Selection choices
            '<span>Selecionar:</span>' +
                '<button class="btn btn-link custom-btn-link" ' +
                    'ng-click="checkAll()">Todos</button>' +
                '|' +
                '<button class="btn btn-link custom-btn-link" ' +
                    'ng-click="checkNone()">Nenhum</button>' +
            // Help
            '<div style="display: block"> ' +
                '<img class="tooltip-wrapper help" ' +
                    'title="{{tooltipText}}" ' + 
                    'directive-tooltip directive-menu-tooltip ' +
                    'src="images/controls/info.svg">' +
            '</div>' +
            '<p/>' +
            // List
            '<div ng-controller="controllerEntryBarFill" class="table table-condensed table-bordered patient-table">' +
                '<div directive-entry-bar-fill class="checkboxInTable patient-table-entry"' +
                    'ng-repeat="attribute in filteredAttributes = (' + options.list + ' | filter:optionListModel | orderBy:orderByProportion)" ' +
                    'ng-click="check(attribute)" ' +
                    'ng-mouseenter="vizStyleFromMouseEnter(attribute)" ' +
                    'ng-mouseleave="vizStyleFromMouseLeave(attribute)" ' +
                    'ng-class="isEntrySelected($index)">' +
                    '<div class="patient-table-entry-text">' +
                        '<div style="display: inline-block" ' +
                            'ng-class="isEntryCurrentPatientAttribute(attribute)">' +
                        '</div>' +
                        '<input ' +
                            'class="custom-checkbox" ' +
                            'type="checkbox" ' +
                            'ng-checked="isSelected(attribute)"> ' +
                            '{{::attribute}}' +
                    '</div>' +
                    '<div class="patient-table-entry-bar"> ' +
                        '<div class="patient-table-entry-bar-fill" attribute="attribute" style="width:{{::proportion}}%"> ' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' :
            '<div id="filters-' + options.currentNode.model.id + '">' +
            '</div>';

        return html;
    };

    var makeImgButton = function(options) {
        options.clazz = options.clazz || "btn-secondary";
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
        makeAttributePills: makeAttributePills,
        makeAttributePillsContents: makeAttributePillsContents,
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
        return (index === $scope.selectedOption) ? "entry-selected" : "";
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
