var moduleSplits = angular.module('moduleSplits',
        ['shagstrom.angular-split-pane']);

var moduleUtils = angular.module('moduleUtils');
var moduleVisualizations = angular.module('moduleVisualizations');
var moduleLayout = angular.module('moduleLayout',
        ['moduleIndex', 'moduleUtils', 'moduleVisualizations']);

moduleLayout.controller('controllerPanes',
        ['$scope', 'patientData',
        function($scope, patientData) {
    $scope.vizType = Object.freeze({
        NONE: "none",
        HEAT_MAP: "heat_map",
        SPIRAL: "spiral"
    });

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
        ['$compile', '$timeout', 'visualizations', 'utils',
        function($compile, $timeout, visualizations, utils) {
	return { 
        scope: true,
        link: function(scope, element, attrs) {
            var html = "";

            var updateActionPanel = function() {
                element.html($compile(
                    html
                )(scope));
            };

            scope.chooseSpiral = function() {
                scope.APIPanes.makePaneSplit(
                    scope.APIPanes.vizType.SPIRAL);
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
                    cancelButton = utils.makeImgButton({
                        clazz:  "btn-secondary custom-btn-secondary",
                        placement: "left",
                        method: "cancelSplit()",
                        title:  "Cancelar",
                        img:    "images/controls/black/remove.svg"
                    }) +
                    '</button>';
                }
                html = cancelButton +
                    '<h4>Escolha uma visualização:</h4>' +
                    '<div class="view-choice" ng-click="chooseHeatmap()">' +
                    '<img src="images/views/heatmap.svg" ' +
                        'class="view-choice-svg">' +
                        '<a class="discrete-link" href="#">' +
                            'Relação entre doenças e medicações' +
                        '</a>' +
                    '</img>' +
                    '</div>' +
                    '<div class="view-choice" ng-click="chooseSpiral()">' +
                    '<img src="images/views/circulartime.svg" ' +
                        'class="view-choice-svg">' +
                        '<a class="discrete-link" href="#">' +
                            'Análise temporal de atributos' +
                        '</a>' +
                    '</div>' +
                    '<div class="view-choice" ng-click="chooseTODO()">' +
                    '<img src="images/views/circular.svg" ' +
                        'class="view-choice-svg">' +
                        '<a class="discrete-link" href="#">' +
                            'TODO' +
                        '</a>' +
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

            // Redraw visualizations
            var updateFromSelections = function() {
                visualizations.updateData(
                    scope.selectedDiseases,
                    scope.selectedMedications
                );

                var node = scope.APIPanes.getCurrentNode();
                if (node.model.viz ===
                        scope.vizType.HEAT_MAP) {
                    visualizations.updateHeatMap(node.model.id);
                } else if (node.model.viz ===
                        scope.vizType.SPIRAL) {
                    visualizations.updateSpiral(node.model.id);
                }
            };

            // Select a property from the view's active property list
            scope.check = function(name) {
                var array = [];
                if (scope.currentAttributeType === 'diseases') {
                    array = scope.selectedDiseases;
                } else if (scope.currentAttributeType === 'medications') {
                    array = scope.selectedMedications;
                }

                var index = utils.arrayObjectIndexOf(array, name, "name");
                if (index === -1)
                    return;

                array[index].selected = !(array[index].selected);

                updateFromSelections();
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

                updateFromSelections();
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

                updateFromSelections();
            };

            scope.isSelected = function(name) {
                var array = [];
                if (scope.currentAttributeType === 'diseases') {
                    array = scope.selectedDiseases;
                } else if (scope.currentAttributeType === 'medications') {
                    array = scope.selectedMedications;
                }

                var index = utils.arrayObjectIndexOf(array, name, "name");
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
                if (rootHasNoChildren || viewNotRoot) {
                    if (scope.APIPanes.getCurrentNode().model.viz ===
                            scope.vizType.HEAT_MAP) {
                        var list = scope.currentAttributeType;
                        // Attribute lists
                        html = '<div class="btn-group" ' +
                            'role="group" aria-label="...">' +
                            '<button type="button" ' +
                                'id="btnDiseases" ' +
                                'class="btn btn-default" ' +
                                'ng-class="isAttributeTypeActive(\'' + 
                                    scope.attributeType.DISEASES + '\')" ' +
                                'ng-click="setAttributeType(\'' + 
                                    scope.attributeType.DISEASES + '\')">' +
                                'Doenças</button>' +
                            '<button type="button" ' +
                                'id="btnMedications" ' +
                                'class="btn btn-default" ' +
                                'ng-class="isAttributeTypeActive(\'' + 
                                    scope.attributeType.MEDICATIONS + '\')" ' +
                                'ng-click="setAttributeType(\'' + 
                                    scope.attributeType.MEDICATIONS + '\')">' +
                                'Medicações</button>' +
                            '</div>' +
                            '<p/>' +
                            // Search
                            '<div class="right-inner-addon">' +
                                '<i class="glyphicon glyphicon-search"></i>' +
                                '<input type="text" ' +
                                    'id="input-attribute" ' +
                                    'class="form-control" ' +
                                    'placeholder="Procurar..." ' +
                                    'ng-model="attributeModel" ' +
                                    'ng-key-select autofocus tabindex=1>' +
                            '</div>' +
                            // Selection choices
                            '<span>Selecionar:</span>' +
                                '<button class="btn btn-link custom-btn-link" ' +
                                    'ng-click="checkAll()">Todos</button>' +
                                '|' +
                                '<button class="btn btn-link custom-btn-link" ' +
                                    'ng-click="checkNone()">Nenhum</button>' +
                            // List
                            '<div class="table table-condensed table-bordered patient-table">' +
                                '<div class="checkboxInTable patient-table-entry" ' +
                                    'ng-repeat="attribute in filteredAttributes = (' + list + ' | filter:attributeModel)"' +
                                    'ng-click="check(attribute)">' +
                                    '<div style="display: inline-block" ' +
                                        'ng-class="isEntrySelected($index)">' +
                                        '<input ' +
                                            'class="custom-checkbox" ' +
                                            'type="checkbox" ' +
                                            'ng-checked="isSelected(attribute)">' +
                                            '{{::attribute}}' +
                                    '</div>' +
                                '</div>' +
                            '</div>';
                    } else {
                        html = "<span>TODO</span>";
                    }
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
        ['$compile', '$timeout', 'utils', 'patientData', 'visualizations',
        function($compile, $timeout, utils, patientData, visualizations) {
	return { 
        scope: true,
        link: function(scope, element, attrs) {
            scope.splitType = Object.freeze({
                NONE: "none",
                VERTICAL: "vertical",
                HORIZONTAL: "horizontal"
            });

            scope.currentNode = undefined;
            scope.treeRoot = undefined;

            // Store our view layout in a tree
            scope.treeModel = new TreeModel();

            // FIXME: Split size changes should be tracked
            function makeSplitComponent(orientation, node) {
                return '<div data-split-pane-component data-' + 
                    orientation + '="50%">' +
                    makeChildrenLayout(node) +
                    '</div>';
            }

            function makeSplitDivider(orientation) {
				return '<div data-split-pane-divider data-' + 
                    orientation + '="5px"></div>';
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

                // Create initial elements for visualization
                var visualization = '';
                if (node.model.viz !== scope.vizType.NONE) {
                    visualization = '<div id=' + id + '>';
                    var descriptionHTML = "";
                    if (node.model.viz ===
                            scope.vizType.HEAT_MAP) {
                        descriptionHTML =
                            visualizations.makeDescriptionHeatMap(node.model.id);
                    } else if (node.model.viz ===
                            scope.vizType.SPIRAL) {
                        descriptionHTML =
                            visualizations.makeDescriptionSpiral(node.model.id);
                    }
                    visualization += descriptionHTML; 
                    if (node.model.viz === scope.vizType.SPIRAL) {
                        visualization += utils.makeImgButton({
                            style:  'display: block',
                            id:     id,
                            method: "addSpiral($event)",
                            text:   "Adicionar espiral",
                            img:    "images/controls/add.svg"
                        });
                    }
                    visualization += '</div>'; 
                }

                var viewportButton = '';
                if (!node.isRoot()) {
                    if (scope.currentNode.model.id === id) {
                        viewportButton = utils.makeImgButton({
                            id:     id,
                            method: "paneColapse()",
                            title:  "Colapsar Vista",
                            img:    "images/controls/colapse.svg"
                        });
                    } else {
                        viewportButton = utils.makeImgButton({
                            id:     id,
                            method: "paneMaximize($event)",
                            title:  "Maximizar Vista",
                            img:    "images/controls/maximize.svg"
                        });
                    }
                }

                return '<div class="pretty-split-pane-component-inner"><p>' + 
                    id + '</p>' +
                    viewportButton +
                    utils.makeImgButton({
                        id:     id,
                        method: "paneSplitVertical($event)",
                        title:  "Separar na Vertical",
                        img:    "images/controls/split-vertical.svg"
                    }) +
                    utils.makeImgButton({
                        id:     id,
                        method: "paneSplitHorizontal($event)",
                        title:  "Separar na Horizontal",
                        img:    "images/controls/split-horizontal.svg"
                    }) +
                    utils.makeImgButton({
                        id:     id,
                        method: "paneRemove($event)",
                        title:  "Remover Vista",
                        img:    "images/controls/remove.svg"
                    }) +
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

                        return makeSplitPane(
                                orientation, 
                                node.children[0], 
                                node.children[1]);
                    }
                } else {
                    return makeSplitInner(node.model.id);
                }

                return "";
            }

            scope.addSpiral = function(button) {
                var id = angular.element(button.target).data('id');
                var node = scope.treeRoot.first(function (node1) {
                    return node1.model.id === id;
                });

                makeSpiral(node.model.id);
            };

            scope.removeSpiral = function(button) {
                var id = angular.element(button.target).data('id');
                var node = scope.treeRoot.first(function (node1) {
                    return node1.model.id === id;
                });

                // FIXME: Untrack in visualizations
                angular.element('#' + id).remove();
            };

            scope.pinSpiral = function(button) {
                // FIXME
            };

            // Two step creation: 
            // - first, angular elements we need to compile;
            // - then, d3 elements
            var makeSpiral = function(id) {
                var spiralID = visualizations.makeSpiralID();
                var html = '<div ' +
                    'id="' + spiralID + '" ' +
                    'class="viz-spiral">' +
                    '<div style="display: block">' + 
                        utils.makeImgButton({
                            id:     spiralID,
                            method: "dragSpiral($event)",
                            title:  "Arrastar Espiral",
                            img:    "images/controls/drag.svg"
                        }) +
                        utils.makeImgButton({
                            id:     spiralID,
                            method: "pinSpiral($event)",
                            title:  "Marcar Espiral como visualização principal",
                            img:    "images/controls/pin.svg"
                        }) +
                        utils.makeImgButton({
                            id:     spiralID,
                            method: "removeSpiral($event)",
                            title:  "Remover Espiral",
                            img:    "images/controls/remove.svg"
                        }) +
                    // FIXME: remove
                    spiralID +
                    '</div>' +
                    '</div>';
                var target = angular.element('#' + id);
                target.append($compile(html)(scope));
                visualizations.makeSpiral(
                    id, spiralID);
            };

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
                                scope.vizType.SPIRAL) {
                            makeSpiral(node.model.id);
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
                    var otherChildNode = (parentNode.children[0].model.id === id) ?
                        parentNode.children[1] : 
                        parentNode.children[0];

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
