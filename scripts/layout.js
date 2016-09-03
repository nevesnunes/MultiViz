var moduleSplits = angular.module('moduleSplits',
        ['shagstrom.angular-split-pane']);
var moduleVisualizations = angular.module('moduleVisualizations');
var moduleLayout = angular.module('moduleLayout',
        ['moduleIndex', 'moduleVisualizations']);

moduleLayout.controller('controllerPanes',
        ['$scope', 'patientData',
        function($scope, patientData) {
    // Patient attribute lists
    $scope.diseases = patientData.getAttributeList(
        patientData.KEY_PATIENTS, 'diseases');
    $scope.medications = patientData.getAttributeList(
        patientData.KEY_PATIENTS, 'medications');
    $scope.selectedDiseases = $scope.diseases
        .map(function(attribute) {
            return {
                name: attribute,
                selected: true
            };
    });
    $scope.selectedMedications = $scope.medications
        .map(function(attribute) {
            return {
                name: attribute,
                selected: true
            };
    });

    // Populated by directive panes
    $scope.APIPanes = {};

    // Populated by directive actionPanel
    $scope.APIActionPanel = {};
}]);

moduleLayout.directive("directiveActionPanel",
        ['$compile', '$timeout', 'visualizations',
        function($compile, $timeout, visualizations) {
	return { 
        scope: true,
        link: function(scope, element, attrs) {
            var html = "";

            var updateActionPanel = function() {
                element.html($compile(
                    html
                )(scope));
            };

            scope.chooseCircularTime = function() {
                scope.APIPanes.makePaneSplit(
                    scope.APIPanes.vizType.CIRCULAR_TIME);
            };

            scope.chooseHeatmap = function() {
                scope.APIPanes.makePaneSplit(scope.APIPanes.vizType.HEAT_MAP);
            };

            // FIXME: Just for testing
            scope.chooseTODO = function() {
                scope.APIPanes.makePaneSplit(scope.APIPanes.vizType.NONE);
            };

            // FIXME: Just for testing
            scope.makeTODOActionPanel = function() {
                html = "<span>TODO</span>";

                updateActionPanel();
            };

            scope.cancelSplit = function() {
                scope.nodeToSplit = undefined;

                scope.makeDefaultActions();
            };

            scope.makeViewChooser = function() {
                var cancelButton = '';
                if (scope.APIPanes.getTreeRoot() !== undefined) {
                    cancelButton = '<button class="tooltip-wrapper btn btn-secondary custom-btn-secondary" title="Cancelar" directive-static-tooltip custom-placement="left" ng-click="cancelSplit()">' +
                    '<img src="images/controls/black/remove.svg" class="custom-btn-svg">' +
                    '</button>';
                }
                html = cancelButton +
                    '<h4>Escolha uma visualização:</h4>' +
                    '<div class="view-choice" ng-click="chooseHeatmap()">' +
                    '<img src="images/views/heatmap.svg" class="view-choice-svg">Comparação entre múltiplos pacientes</img>' +
                    '</div>' +
                    '<div class="view-choice" ng-click="chooseCircularTime()">' +
                    '<img src="images/views/circulartime.svg" class="view-choice-svg">Análise temporal de atributos</img>' +
                    '</div>' +
                    '<div class="view-choice" ng-click="chooseTODO()">' +
                    '<img src="images/views/circular.svg" class="view-choice-svg">TODO</img>' +
                    '</div>';
                
                updateActionPanel();
            };

            scope.attributeType = Object.freeze({
                NONE: "none",
                DISEASES: "diseases",
                MEDICATIONS: "medications"
            });
            scope.currentAttributeType = scope.attributeType.DISEASES;
            scope.setAttributeType = function(type) {
                scope.currentAttributeType = type;
                scope.makeDefaultActions();
            };
            scope.isAttributeTypeActive = function(type) {
                return (type === scope.currentAttributeType) ?
                    "buttonSelected" :
                    "";
            };

            var arrayObjectIndexOf = function(myArray, searchTerm, property) {
                for (var i = 0, len = myArray.length; i < len; i++) {
                    if (myArray[i][property] === searchTerm)
                        return i;
                }
                return -1;
            };

            // Select a property from the view's active property list
            scope.check = function(name) {
                var array = [];
                if (scope.currentAttributeType === 'diseases') {
                    array = scope.selectedDiseases;
                } else if (scope.currentAttributeType === 'medications') {
                    array = scope.selectedMedications;
                }

                var index = arrayObjectIndexOf(array, name, "name");
                if (index === -1)
                    return;

                array[index].selected = !(array[index].selected);

                // Redraw visualizations
                visualizations.updateData(
                    scope.selectedDiseases,
                    scope.selectedMedications
                );
                scope.APIPanes.updateLayout();
            };

            scope.checkAll = function() {
                var array = [];
                if (scope.currentAttributeType === 'diseases') {
                    array = scope.selectedDiseases;
                } else if (scope.currentAttributeType === 'medications') {
                    array = scope.selectedMedications;
                }

                for (var i = 0, len = array.length; i < len; i++)
                    array[i].selected = true;

                // Redraw visualizations
                visualizations.updateData(
                    scope.selectedDiseases,
                    scope.selectedMedications
                );
                scope.APIPanes.updateLayout();
            };

            scope.checkNone = function() {
                var array = [];
                if (scope.currentAttributeType === 'diseases') {
                    array = scope.selectedDiseases;
                } else if (scope.currentAttributeType === 'medications') {
                    array = scope.selectedMedications;
                }

                for (var i = 0, len = array.length; i < len; i++)
                    array[i].selected = false;

                // Redraw visualizations
                visualizations.updateData(
                    scope.selectedDiseases,
                    scope.selectedMedications
                );
                scope.APIPanes.updateLayout();
            };

            scope.isSelected = function(name) {
                var array = [];
                if (scope.currentAttributeType === 'diseases') {
                    array = scope.selectedDiseases;
                } else if (scope.currentAttributeType === 'medications') {
                    array = scope.selectedMedications;
                }

                var index = arrayObjectIndexOf(array, name, "name");
                if (index === -1)
                    return false;

                return array[index].selected;
            };

            scope.makeDefaultActions = function() {
                html = "";
                var rootHasNoChildren = 
                    (scope.APIPanes.getTreeRoot() !== undefined) &&
                    (!scope.APIPanes.getTreeRoot().hasChildren());
                var viewNotRoot =
                    scope.APIPanes.getCurrentNode().model.id !==
                    scope.APIPanes.getTreeRoot().model.id;
                if(rootHasNoChildren || viewNotRoot) {
                    var list = scope.currentAttributeType;
                    html = '<div class="btn-group" role="group" aria-label="...">' +
                        '    <button type="button" id="btnDiseases" class="btn btn-default" ng-class="isAttributeTypeActive(\'' + scope.attributeType.DISEASES + '\')" ng-click="setAttributeType(\'' + scope.attributeType.DISEASES + '\')">Doenças</button>' +
                        '    <button type="button" id="btnMedications" class="btn btn-default" ng-class="isAttributeTypeActive(\'' + scope.attributeType.MEDICATIONS + '\')" ng-click="setAttributeType(\'' + scope.attributeType.MEDICATIONS + '\')">Medicações</button>' +
                        '</div>' +
                        '<p/>' +
                        '<div class="right-inner-addon">' +
                        '    <i class="glyphicon glyphicon-search"></i>' +
                        '    <input type="text" id="input-attribute" class="form-control" placeholder="Procurar..." ng-model="attributeModel" ng-key-select autofocus tabindex=1>' +
                        '</div>' +
                        '<span>Selecionar:</span>' +
                            '<button class="btn btn-link custom-btn-link" ng-click="checkAll()">Todos</button>' +
                            '|' +
                            '<button class="btn btn-link custom-btn-link" ng-click="checkNone()">Nenhum</button>' +
                        '<div class="table table-condensed table-bordered patient-table">' +
                        '    <div class="checkboxInTable patient-table-entry" ng-repeat="attribute in filteredAttributes = (' + list + ' | filter:attributeModel)"  ng-click="check(attribute)">' +
                        '        <div style="display: inline-block" ng-class="isEntrySelected($index)">' +
                        '           <input class="custom-checkbox" type="checkbox" ng-checked="isSelected(attribute)" ng-click="check(attribute)">' +
                        '           {{::attribute}}' +
                        '        </div>' +
                        '    </div>' +
                        '</div>';
                } else {
                    html = '<span>Pode <b>Maximizar</b> ( <img src="images/controls/black/maximize.svg" class="custom-btn-svg"> ) uma vista para configurar os atributos visíveis.</span>';
                }
            
                updateActionPanel();
            };

            // Populate API
            scope.APIActionPanel.makeTODOActionPanel = scope.makeTODOActionPanel;
            scope.APIActionPanel.cancelSplit = scope.cancelSplit;
            scope.APIActionPanel.makeViewChooser = scope.makeViewChooser;
            scope.APIActionPanel.makeDefaultActions =
                scope.makeDefaultActions;

            // Initialize
            updateActionPanel();
        } //link
    }; //return
}]);

moduleLayout.directive("directivePanes",
        ['$compile', '$timeout', 'patientData', 'visualizations',
        function($compile, $timeout, patientData, visualizations) {
	return { 
        scope: true,
        link: function(scope, element, attrs) {
            scope.splitType = Object.freeze({
                NONE: "none",
                VERTICAL: "vertical",
                HORIZONTAL: "horizontal"
            });

            scope.vizType = Object.freeze({
                NONE: "none",
                HEAT_MAP: "heat_map",
                CIRCULAR_TIME: "circular_time"
            });

            scope.currentNode = undefined;
            scope.treeRoot = undefined;

            // Store our view layout in a tree
            scope.treeModel = new TreeModel();

            function makeImgButton(id, method, text, img) {
                // Make sure all child elements have the id property, since the
                // user may click on one of them and activate functions
                // which expect the id to be present in the clicked element
                return '<button class="tooltip-wrapper btn btn-primary" ' +
                    'directive-static-tooltip custom-placement="top" ' +
                    'data-id="' + id + '" ' +
                    'ng-click="' + method + '" ' +
                    'title="' + text + '">' +                     
                    '<img src="' + img + '" ' +
                        'data-id="' + id + '" ' +
                        'class="custom-btn-svg">' +
                    '</button>';
            }

            // FIXME: Split size changes should be tracked
            function makeSplitComponent(orientation, node) {
                return '<div data-split-pane-component data-' + orientation + '="50%">' +
                makeChildrenLayout(node) +
                '</div>';
            }

            function makeSplitDivider(orientation) {
				return '<div data-split-pane-divider data-' + orientation + '="5px"></div>';
            }

            function makeSplitPane(orientation, node1, node2) {
                return '<div data-split-pane>' +
                    makeSplitComponent(orientation, node1) +
                    makeSplitDivider(orientation) +
                    makeSplitComponent(orientation, node2) +
                    '</div>';
            }

            function makeSplitInner(id) {
                var node = scope.treeRoot.first(function(node1) {
                    return node1.model.id === id;
                });

                var visualization = '';
                if (node.model.viz !== scope.vizType.NONE) {
                    visualization = '<div id=' + id + '></div>'; 
                }

                var viewportButton = '';
                if (!node.isRoot()) {
                    if (scope.currentNode.model.id === id) {
                        viewportButton = makeImgButton(
                            id,
                            "paneColapse()",
                            " Colapsar Vista",
                            "images/controls/colapse.svg");
                    } else {
                        viewportButton = makeImgButton(
                            id,
                            "paneMaximize($event)",
                            " Maximizar Vista",
                            "images/controls/maximize.svg");
                    }
                }

                return '<div class="pretty-split-pane-component-inner"><p>' + id + '</p>' +
                    makeImgButton(
                        id,
                        "paneRemove($event)",
                        " Remover Vista",
                        "images/controls/remove.svg") +
                    viewportButton +
                    makeImgButton(
                        id,
                        "paneSplitVertical($event)",
                        " Separar na Vertical",
                        "images/controls/split-vertical.svg") +
                    makeImgButton(
                        id,
                        "paneSplitHorizontal($event)",
                        " Separar na Horizontal",
                        "images/controls/split-horizontal.svg") +
                    visualization +
                    '</div>';
            }

            function makeChildrenLayout(node) {
                if (node.hasChildren()) {
                    if (node.children.length < 2) {
                        console.log("[WARN] @makeChildrenLayout: less than 2 childs");
                    } else {
                        console.log("[INFO] @makeChildrenLayout: splitting children");
                        var orientation = 
                            (node.model.split === scope.splitType.VERTICAL) ?
                            "height" :
                            "width";

                        return makeSplitPane(orientation, node.children[0], node.children[1]);
                    }
                } else {
                    return makeSplitInner(node.model.id);
                }

                return "";
            }

            scope.updateLayout = function() {
                // No nodes available: make first view functionality
                if (scope.currentNode === undefined) {

                    // There may be a previous view: nuke the layout
                    element.html($compile('')(scope));

                    scope.APIActionPanel.makeViewChooser();

                // Make html node layout
                } else {
                    element.html($compile(
                        makeChildrenLayout(scope.currentNode)
                    )(scope));

                    scope.treeRoot.walk(function(node) {
                        if (node.model.viz ===
                                scope.vizType.HEAT_MAP) {
                            visualizations.makeHeatMap(node.model.id);
                        } else if (node.model.viz ===
                                scope.vizType.CIRCULAR_TIME) {
                            visualizations.makeCircularTime(node.model.id);
                        }
                    });

                    scope.APIActionPanel.makeDefaultActions();
                }
            };

            scope.paneRemove = function(button) {
                var id = angular.element(button.target).data('id');
                var node = scope.treeRoot.first(function (node1) {
                    return node1.model.id === id;
                });

                // Colapse the view if it is maximized
                if (scope.currentNode.model.id === id) {
                    scope.currentNode = scope.treeRoot;
                }

                // Cancel any pending splits
                scope.APIActionPanel.cancelSplit();

                // Update parent
                var parentNode = node.parent;
                if (parentNode !== undefined) {
                    console.log("[INFO] Removing " + node.model.id);
                    var otherChildNode = (parentNode.children[0].model.id === id) ? parentNode.children[1] : parentNode.children[0];

                    // Copy relevant child properties
                    if (parentNode.isRoot()) {
                        scope.treeRoot = scope.treeModel.parse({
                            id: otherChildNode.model.id,
                            split: otherChildNode.model.split,
                            viz: otherChildNode.model.viz,
                            children: otherChildNode.model.children
                        });
                        scope.currentNode = scope.treeRoot;
                    } else {
                        node.parent.config = otherChildNode.config;
                        node.parent.model = otherChildNode.model;
                        node.parent.children = otherChildNode.children;
                    }

                    // Children are garbage
                    node = undefined;
                    otherChildNode = undefined;
                } else {
                    node = undefined;
                    scope.treeRoot = undefined;
                    scope.currentNode = undefined;
                }
                
                scope.updateLayout();
            };

            scope.paneMaximize = function(button) {
                var id = angular.element(button.target).data('id');
                var node = scope.treeRoot.first(function (node1) {
                    return node1.model.id === id;
                });
                scope.currentNode = node;

                scope.updateLayout();
            };

            scope.paneColapse = function() {
                scope.currentNode = scope.treeRoot;

                scope.updateLayout();
            };

            scope.paneSplitVertical = function(button) {
                var buttonID = angular.element(button.target).data('id');
                scope.nodeToSplit = {
                    id: buttonID,
                    split: scope.splitType.VERTICAL
                };

                if (scope.currentNode.model.id !== scope.treeRoot.model.id) {
                    scope.paneColapse();
                }
                scope.APIActionPanel.makeViewChooser();
            };

            scope.paneSplitHorizontal = function(button) {
                var buttonID = angular.element(button.target).data('id');
                scope.nodeToSplit = {
                    id: buttonID,
                    split: scope.splitType.HORIZONTAL
                };

                if (scope.currentNode.model.id !== scope.treeRoot.model.id) {
                    scope.paneColapse();
                }
                scope.APIActionPanel.makeViewChooser();
            };

            scope.makePaneSplit = function(vizType) {
                // First view
                if (scope.treeRoot === undefined) {
                    scope.treeRoot = scope.treeModel.parse({
                        id: "view-" + uuid.v1(),
                        split: scope.splitType.NONE,
                        viz: vizType,
                        children: []
                    });
                } else {
                    if (scope.nodeToSplit !== undefined) {
                        var node = scope.treeRoot.first(function (node1) {
                            return node1.model.id === scope.nodeToSplit.id;
                        });

                        console.log("[INFO] Splitting in " +
                            scope.nodeToSplit.split +
                            " " +
                            node.model.id);
                        node.addChild(
                            scope.treeModel.parse({
                                id: "view-" + uuid.v1(),
                                split: scope.splitType.NONE,
                                viz: node.model.viz,
                                children: []
                            }));
                        node.addChild(
                            scope.treeModel.parse({
                                id: "view-" + uuid.v1(),
                                split: scope.splitType.NONE,
                                viz: vizType,
                                children: []
                            }));

                        // Update parent properties
                        node.model.split = scope.nodeToSplit.split;
                        node.model.viz = scope.vizType.NONE;
                    }
                }

                scope.paneColapse();
            };

            // Populate API
            scope.APIPanes.vizType = scope.vizType;
            scope.APIPanes.getCurrentNode = function() {
                return scope.currentNode;
            };
            scope.APIPanes.getTreeRoot = function() {
                return scope.treeRoot;
            };
            scope.APIPanes.makePaneSplit = scope.makePaneSplit; 
            scope.APIPanes.updateLayout = scope.updateLayout; 

            // Initialize
            visualizations.updateData(
                scope.selectedDiseases,
                scope.selectedMedications
            );
            scope.updateLayout();
        } //link
    }; //return
}]);

angular.module("moduleCombined", ["moduleIndex", "moduleLayout", "moduleSplits"]);
