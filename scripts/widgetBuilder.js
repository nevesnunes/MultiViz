var moduleWidgetBuilder = angular.module('moduleWidgetBuilder',
        ['moduleProviders']);

moduleWidgetBuilder.factory('widgets', [function() {
    // HACK: Caller must have accordion element:
    // <div id="accordion" role="tablist" aria-multiselectable="true">
    var makeAccordionCard = function(options) {
        options.contents = options.contents || "Contents";
        options.header = options.header || "Header";
        options.parentPrefix = options.parentPrefix || "filters-";
        return '<div class="card">' +
            '<div class="card-header" role="tab" id="heading-' + options.name + '">' +
              '<h5 class="mb-0">' +
                '<a class="collapsed" data-toggle="collapse" data-parent="#' + options.parentPrefix + 'accordion" href="#collapse-' + options.name + '" aria-expanded="true" aria-controls="collapse-' + options.name + '">' +
                  options.header +
                '</a>' +
              '</h5>' +
            '</div>' +

            '<div id="collapse-' + options.name + '" class="collapse show" role="tabpanel" aria-labelledby="heading-' + options.name + '">' +
              '<div class="card-block">' +
                options.contents +
              '</div>' +
            '</div>' +
          '</div>';
    };

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

    var makeAttributePillsOnlyData = function(options) {
        var html = '<ul class="nav nav-pills nav-justified">' +
                '<li ' +
                    'id="btnDisplayData" ' +
                    'class="active">' + 
                    '<a href="#">Dados</a>' +
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
            '<p/>' +
            // Selection choices
            '<span>Selecionar:</span>' +
                '<br/>' +
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
            makeListWithEntryBars({
                list: options.list,
                controller: 'controllerEntryBarFill'
            }) :
            '<div id="filters-' + options.currentNode.model.id + '">' +
                '<div id="filters-accordion" role="tablist" aria-multiselectable="true">' +
                '</div>' +
        '</div>';

        return html;
    };

    var makeListWithEntryBars = function(options) {
        options.checkMethod = options.checkMethod || 'check';
        var checkMethodCall = (options.checkMethod === 'checkFilter') ?
             '(attribute, \'' +
                 options.list + '\', \'' +
                 options.filter +  '\')' :
             '(attribute)';
        options.directive = options.directive || 'directive-entry-bar-fill';
        options.entryType = options.entryType || 'checkbox';
        options.isSelectedMethod =
            options.isSelectedMethod || 'isSelected';
        var isSelectedMethodCall =
                (options.isSelectedMethod === 'isListInputSelected') ?
             '(attribute, \'' + 
                 options.list + '\', \'' +
                 options.filter +  '\')' :
             '(attribute)';
        return '<form ng-controller="' + options.controller + '" class="table table-condensed table-bordered patient-table">' +
                '<div ' + options.directive + ' class="checkboxInTable patient-table-entry" ' +
                    'ng-repeat="attribute in filteredAttributes = (' + options.list + ' | filter:optionListModel | orderBy:orderByProportion)" ' +
                    'ng-click="' + options.checkMethod + checkMethodCall + '" ' +
                    'ng-mouseenter="vizStyleFromMouseEnter(attribute)" ' +
                    'ng-mouseleave="vizStyleFromMouseLeave(attribute)" ' +
                    'ng-class="isEntrySelected($index)">' +
                    '<div class="patient-table-entry-text">' +
                        '<div style="display: inline-block" ' +
                            'ng-class="isEntryCurrentPatientAttribute(attribute)">' +
                        '</div>' +
                        '<input ' +
                            'class="custom-checkbox" ' +
                            'name="' + options.list + '" ' +
                            'type="' + options.entryType + '" ' +
                            'ng-checked="' + options.isSelectedMethod +
                                isSelectedMethodCall + '"> ' +
                            '{{::attribute}}' +
                    '</div>' +
                    '<div class="patient-table-entry-bar"> ' +
                        '<div class="patient-table-entry-bar-fill" attribute="attribute" style="width:{{::proportion}}%"> ' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</form>';
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
        makeAccordionCard: makeAccordionCard,
        makeAttributePills: makeAttributePills,
        makeAttributePillsOnlyData: makeAttributePillsOnlyData,
        makeAttributePillsContents: makeAttributePillsContents,
        makeListWithEntryBars: makeListWithEntryBars,
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
            var placement = element.attr('custom-placement') || 'right';
            element
                .on('mouseenter', function() {
                    scope.setTooltipText();
                    element.tooltip('hide')
                        .attr('data-html', true)
                        .attr('data-container', 'body')
                        .attr('data-placement', placement)
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
