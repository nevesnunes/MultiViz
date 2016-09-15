var moduleSplits = angular.module('moduleSplits',
        ['shagstrom.angular-split-pane']);

var moduleUtils = angular.module('moduleUtils');
var moduleVisualizations = angular.module('moduleVisualizations');
var moduleLayout = angular.module('moduleLayout',
        ['moduleIndex', 'moduleUtils', 'moduleVisualizations']);

moduleLayout.factory("nodes",
        ['utils', function(utils) {
    // Store our view layout in a tree.
    var treeModel = new TreeModel();
    var treeRoot;
    
    // Points to the node from which view layout is generated:
    // In an overview, it is the root node; 
    // In a maximized view, it is the maximized node.
    var currentNode;

    /**
     * @property {string} id - unique node id
     * @property {number} level - node depth in tree
     * @property {string} splitType - type of split
     * @property {string} vizType - type of visualization
     * @property {{id:string, html:string}[]} vizs - one or more visualization html, identified by a unique id in the context of the node; it will be used in layout updates
     * @property {string} currentVizID - id of visualization to be displayed on single/maximized view
     * @property {boolean} isValid - whether visualization html should be reused
     * @property {string[]} children - two child nodes
     */
    var makeNode = function(model) {
        return treeModel.parse({
            id: model.id,
            level: model.level,
            splitType: model.splitType,
            vizType: model.vizType,
            vizs: model.vizs,
            currentVizID: model.currentVizID,
            isValid: model.isValid,
            children: model.children
        });
    };

    var getViz = function(id) {
        var node = nodes.treeRoot.first(function(node1) {
            return node1.model.id === id;
        });
        var index = utils.arrayObjectIndexOf(node.vizs, id, "id");
        if (index === -1) {
            console.log("[WARN] @getVizByID: id not found.");
            return null;
        }
        return node.vizs[index].viz;
    };

    var removeViz = function(id) {
        var node = nodes.treeRoot.first(function(node1) {
            return node1.model.id === id;
        });
        var index = utils.arrayObjectIndexOf(node.vizs, id, "id");
        if (index > -1) {
            console.log("[INFO] @removeByID: removed " + id);
            array.splice(index, 1);
        }
    };

    var updateViz = function(id, viz) {
        var node = nodes.treeRoot.first(function(node1) {
            return node1.model.id === id;
        });
        var index = utils.arrayObjectIndexOf(node.vizs, id, "id");
        if (index > -1) {
            node.vizs[index].viz = viz;
        } else {
            node.vizs.push({
                id: id,
                viz: viz
            });
        }
    };

    return {
        currentNode: currentNode,
        treeRoot: treeRoot,
        makeNode: makeNode
    };
}]);

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

    // Populated by directive action-panel
    $scope.APIActionPanel = {};
}]);

moduleLayout.directive("directiveActionPanel",
        ['$compile', '$timeout', 'visualizations', 'utils', 'nodes',
        function($compile, $timeout, visualizations, utils, nodes) {
	return { 
        scope: true,
        link: function(scope, element, attrs) {
            var updateActionPanel = function(html) {
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
                updateActionPanel("<span>TODO</span>");
            };

            scope.cancelSplit = function() {
                scope.nodeToSplit = undefined;

                scope.makeDefaultActions();
            };

            scope.makeViewChooser = function() {
                var cancelButton = '';
                if (nodes.treeRoot !== undefined) {
                    cancelButton = utils.makeImgButton({
                        clazz:  "btn-secondary custom-btn-secondary",
                        placement: "left",
                        method: "cancelSplit()",
                        title:  "Cancelar",
                        img:    "images/controls/black/remove.svg"
                    }) +
                    '</button>';
                }
                var html = cancelButton +
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
                
                updateActionPanel(html);
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

                var node = nodes.currentNode;
                if (node.model.vizType ===
                        scope.vizType.HEAT_MAP) {
                    visualizations.updateHeatMap(node.model.id);
                } else if (node.model.vizType ===
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
                var html = "";
                var rootHasNoChildren = 
                    (nodes.treeRoot !== undefined) &&
                    (!nodes.treeRoot.hasChildren());
                var viewNotRoot =
                    nodes.currentNode.model.id !==
                    nodes.treeRoot.model.id;
                if (rootHasNoChildren || viewNotRoot) {
                    if (nodes.currentNode.model.vizType ===
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
                                            'ng-checked="isSelected(attribute)"> ' +
                                            '{{::attribute}}' +
                                    '</div>' +
                                '</div>' +
                            '</div>';
                    } else {
                        html = "<span>TODO</span>";
                    }
                // No specific options to be displayed;
                // describe possible actions
                } else {
                    html = '<span>Pode <b>Maximizar</b> ( <img src="images/controls/black/maximize.svg" class="custom-btn-svg"> ) uma vista para configurar os atributos visíveis.</span>';
                }
            
                updateActionPanel(html);
            };

            // Populate API
            scope.APIActionPanel.makeTODOActionPanel = scope.makeTODOActionPanel;
            scope.APIActionPanel.cancelSplit = scope.cancelSplit;
            scope.APIActionPanel.makeViewChooser = scope.makeViewChooser;
            scope.APIActionPanel.makeDefaultActions =
                scope.makeDefaultActions;
        } //link
    }; //return
}]);

moduleLayout.directive("directivePanes",
        ['$compile', '$timeout', 'utils', 'nodes', 'patientData', 'visualizations',
        function($compile, $timeout, utils, nodes, patientData, visualizations) {
	return { 
        scope: true,
        link: function(scope, element, attrs) {
            scope.splitType = Object.freeze({
                NONE: "none",
                VERTICAL: "vertical",
                HORIZONTAL: "horizontal"
            });

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
                var node = nodes.treeRoot.first(function(node1) {
                    return node1.model.id === id;
                });

                // Create initial elements for visualization
                var visualization = '';
                if (node.model.vizType !== scope.vizType.NONE) {
                    visualization = '<div id=' + id + '>';
                    var descriptionHTML = "";
                    if (node.model.vizType ===
                            scope.vizType.HEAT_MAP) {
                        descriptionHTML =
                            visualizations.makeDescriptionHeatMap(node.model.id);
                    } else if (node.model.vizType ===
                            scope.vizType.SPIRAL) {
                        descriptionHTML =
                            visualizations.makeDescriptionSpiral(node.model.id);
                    }
                    visualization += descriptionHTML; 
                    if (node.model.vizType === scope.vizType.SPIRAL) {
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
                    if (nodes.currentNode.model.id === id) {
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
                    // FIXME: remove
                    id + '</p>' +
                    '<div style="display: block">' + 
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
                    '</div>' +
                    '</div>';
            }

            function makeChildrenLayout(node) {
                if (node.hasChildren()) {
                    if (node.children.length < 2) {
                        console.log("[WARN] @makeChildrenLayout: less than 2 childs");
                    } else {
                        var orientation = 
                            (node.model.splitType === scope.splitType.VERTICAL) ?
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
                makeSpiral(id);
            };

            scope.removeSpiral = function(button) {
                var id = angular.element(button.target).data('id');
                var node = nodes.treeRoot.first(function (node1) {
                    return node1.model.id === id;
                });

                // FIXME: Untrack in visualizations
                angular.element('#' + id).remove();
            };

            scope.dragSpiral = function(button) {
                // FIXME
            };

            scope.togglePinned = function(button) {
                var target = angular.element(button.target);
                var isCheckable = target.data('checkable');
                if (isCheckable) {
                    var toggledCheck = !target.data('checked');
                    target.data('checked', toggledCheck);
                    target.attr('data-checked', toggledCheck);

                    var nodeID = target.data('node-id');
                    var spiralID = target.data('id');
                    var img = "";
                    var html = "";
                    if (toggledCheck) {
                        target.addClass('custom-btn-checked');
                        img = "images/controls/pin-checked.svg";
                        html = '<img src="' + img + '" ' +
                            'data-id="' + spiralID + '" ' +
                            'class="custom-btn-svg"> ';
                    } else {
                        target.removeClass('custom-btn-checked');
                        img = "images/controls/pin.svg";
                        html = '<img src="' + img + '" ' +
                            'data-id="' + spiralID + '" ' +
                            'class="custom-btn-svg"> ';
                    }

                    target.html($compile(
                        html
                    )(scope));

                    var node = nodes.treeRoot.first(function (node1) {
                        return node1.model.id === nodeID;
                    });
                    node.model.currentVizID = spiralID;
                }
            };

            scope.pinSpiral = function(button) {
                // FIXME
                scope.togglePinned(button);
            };

            // Two step creation: 
            // - first, angular elements we need to compile;
            // - then, d3 elements
            var makeSpiral = function(id) {
                var spiralID = visualizations.makeSpiralID();
                var html = '<div ' +
                    'id="' + spiralID + '" ' +
                    'data-node-id="' + id + '" ' +
                    'class="viz-spiral">' +
                    '<div style="display: block">' + 
                        utils.makeImgButton({
                            id:     spiralID,
                            nodeID: id,
                            method: "dragSpiral($event)",
                            title:  "Arrastar Espiral",
                            img:    "images/controls/drag.svg"
                        }) +
                        utils.makeImgButton({
                            id:        spiralID,
                            nodeID:    id,
                            checkable: true,
                            directive: "directive-button",
                            method:    "pinSpiral($event)",
                            title:     "Marcar Espiral como visualização principal",
                            img:       "images/controls/pin.svg"
                        }) +
                        utils.makeImgButton({
                            id:     spiralID,
                            nodeID: id,
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

            // Print node layout
            var treePrint = function() {
                var nodesToPrint = [];
                nodes.treeRoot.walk(function(node) {
                    var string = "- ";
                    for (var i = node.model.level; i > 0; i--)
                        string += "- ";
                    nodesToPrint.push(string + node.model.id +
                            " parent: " + 
                            (((node.parent !== undefined) && 
                              (node.parent.model !== undefined)) ?
                                node.parent.model.id :
                                "NONE"));
                });
                for (var i = 0; i < nodesToPrint.length; i++)
                    console.log(nodesToPrint[i]);
            };

            // Make html node layout
            scope.updateLayout = function() {
                // No nodes available: make first view functionality
                if (nodes.currentNode === undefined) {

                    // There may be a previous view: nuke the layout
                    element.html($compile('')(scope));

                    scope.APIActionPanel.makeViewChooser();

                } else {
                    element.html($compile(
                        makeChildrenLayout(nodes.currentNode)
                    )(scope));

                    nodes.treeRoot.walk(function(node) {
                        if (node.model.vizType ===
                                scope.vizType.HEAT_MAP) {
                            visualizations.makeHeatMap(node.model.id);
                        } else if (node.model.vizType ===
                                scope.vizType.SPIRAL) {
                            makeSpiral(node.model.id);
                        }
                    });

                    scope.APIActionPanel.makeDefaultActions();

                    //treePrint();
                }
            };

            scope.paneRemove = function(button) {
                var id = angular.element(button.target).data('id');
                var node = nodes.treeRoot.first(function (node1) {
                    return node1.model.id === id;
                });

                // Colapse the view if it is maximized
                if (nodes.currentNode.model.id === id) {
                    nodes.currentNode = nodes.treeRoot;
                }

                // Cancel any pending splits
                scope.APIActionPanel.cancelSplit();

                // Update parent
                var parentNode = node.parent;
                if (parentNode !== undefined) {
                    console.log("[INFO] Removing " + node.model.id);
                    var otherChildIndex =
                        (parentNode.children[0].model.id === id) ? 1 : 0;
                    var otherChildNode = parentNode.children[otherChildIndex];

                    // Update child properties
                    otherChildNode.walk(function(node) {
                        node.model.level -= 1;
                    });

                    // Copy relevant child properties
                    if (parentNode.isRoot()) {
                        nodes.treeRoot = nodes.makeNode(otherChildNode.model);

                        nodes.currentNode = nodes.treeRoot;
                    } else {
                        // Grandparent also needs updating
                        if (parentNode.parent !== undefined) {
                            var parentIndex = 
                                (parentNode.parent.children[0].model.id === 
                                 parentNode.model.id) ? 0 : 1;
                            parentNode.parent.children[parentIndex] = 
                                otherChildNode;
                            otherChildNode.parent = parentNode.parent;
                        } else {
                            node.parent = nodes.makeNode(otherChildNode.model);
                        }
                    }
                // Nuke our tracked nodes, since a
                // new layout will be created later
                } else {
                    nodes.treeRoot = undefined;
                    nodes.currentNode = undefined;
                }
                
                scope.updateLayout();
            };

            scope.paneMaximize = function(button) {
                var id = angular.element(button.target).data('id');
                var node = nodes.treeRoot.first(function (node1) {
                    return node1.model.id === id;
                });
                nodes.currentNode = node;

                scope.updateLayout();
            };

            scope.paneColapse = function() {
                nodes.currentNode = nodes.treeRoot;

                scope.updateLayout();
            };

            scope.paneSplitVertical = function(button) {
                var buttonID = angular.element(button.target).data('id');
                scope.nodeToSplit = {
                    id: buttonID,
                    split: scope.splitType.VERTICAL
                };

                if (nodes.currentNode.model.id !== nodes.treeRoot.model.id) {
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

                if (nodes.currentNode.model.id !== nodes.treeRoot.model.id) {
                    scope.paneColapse();
                }
                scope.APIActionPanel.makeViewChooser();
            };

            scope.makePaneSplit = function(vizType) {
                // First view of the layout
                if (nodes.treeRoot === undefined) {
                    nodes.treeRoot = nodes.makeNode({
                        id: "view-" + uuid.v1(),
                        level: 0,
                        splitType: scope.splitType.NONE,
                        vizType: vizType,
                        vizs: [],
                        currentVizID: undefined,
                        isValid: false,
                        children: []
                    });
                } else {
                    if (scope.nodeToSplit !== undefined) {
                        var node = nodes.treeRoot.first(function (node1) {
                            return node1.model.id === scope.nodeToSplit.id;
                        });

                        node.addChild(nodes.makeNode({
                                id: "view-" + uuid.v1(),
                                level: node.model.level + 1,
                                splitType: scope.splitType.NONE,
                                vizType: node.model.vizType,
                                vizs: [],
                                currentVizID: undefined,
                                isValid: false,
                                children: []
                        }));
                        node.addChild(nodes.makeNode({
                                id: "view-" + uuid.v1(),
                                level: node.model.level + 1,
                                splitType: scope.splitType.NONE,
                                vizType: vizType,
                                vizs: [],
                                currentVizID: undefined,
                                isValid: false,
                                children: []
                        }));

                        // Update parent properties
                        node.model.splitType = scope.nodeToSplit.split;
                        node.model.vizType = scope.vizType.NONE;
                    }
                }

                scope.paneColapse();
            };

            // Populate API
            scope.APIPanes.vizType = scope.vizType;
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
