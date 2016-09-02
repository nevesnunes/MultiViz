var moduleSplits = angular.module('moduleSplits',
        ['shagstrom.angular-split-pane']);
var moduleVisualizations = angular.module('moduleVisualizations');
var moduleLayout = angular.module('moduleLayout',
        ['moduleIndex', 'moduleVisualizations']);

moduleLayout.controller('controllerPanes',
        ['$scope', 'patientData',
        function($scope, patientData) {
    //
    // Node Tree
    //

    $scope.splitType = Object.freeze({
        NONE: "none",
        VERTICAL: "vertical",
        HORIZONTAL: "horizontal"
    });

    $scope.vizType = Object.freeze({
        NONE: "none",
        HEAT_MAP: "heat_map",
        CIRCULAR_TIME: "circular_time"
    });

    // Store our view layout in a tree
    $scope.treeModel = new TreeModel();

    //
    // Patient Data
    //

    $scope.patient = patientData.getData(patientData.KEY_PATIENT);
    $scope.patients = patientData.getData(patientData.KEY_PATIENTS);
    $scope.diseases = patientData.getAttributeList(
            $scope.patients, 'diseases');
    $scope.medications = patientData.getAttributeList(
            $scope.patients, 'medications');

    $scope.attributeType = Object.freeze({
        NONE: "none",
        DISEASES: "diseases",
        MEDICATIONS: "medications"
    });
    $scope.currentAttributeType = $scope.attributeType.DISEASES;
    $scope.setAttributeType = function(type) {
        $scope.currentAttributeType = type;
        $scope.makeDefaultActions();
    };
    $scope.isAttributeTypeActive = function(type) {
        return (type === $scope.currentAttributeType) ?
            "entrySelected" :
            "";
    };

    // Select a property from the view's active property list
    $scope.check = function(iso) {
        /*
        for (i = 0; i < $scope.countryList.length; i++) {
            if ($scope.countryList[i].iso2 == iso) {
                if ($scope.countryList[i].selected) {
                    $scope.countryList[i].selected = false;
                } else {
                    $scope.countryList[i].selected = true;
                }
            }
        }
        updateData($scope.data); */
    };

    //
    // Action Panel
    //

    $scope.cancelSplit = function() {
        $scope.nodeForViz = undefined;

        // FIXME: Remember previous html to restore
        $scope.makeTODOActionPanel();
    };

    $scope.chooseCircularTime = function() {
        $scope.makePaneSplit($scope.vizType.NONE);
    };

    $scope.chooseHeatmap = function() {
        $scope.makePaneSplit($scope.vizType.HEAT_MAP);
    };

    // FIXME: Just for testing
    $scope.chooseTODO = function() {
        $scope.makePaneSplit($scope.vizType.NONE);
    };
}]);

moduleLayout.directive("directiveActionPanel",
        ['$compile', '$timeout', 
        function($compile, $timeout) {
	return { 
        scope: false, // Allow communication between panes and action panel
        link: function(scope, element, attrs) {
            var html = "";

            var updateActionPanel = function() {
                element.html($compile(
                    html
                )(scope));
            };

            // FIXME: Just for testing
            scope.makeTODOActionPanel = function() {
                html = "<span>TODO</span>";

                updateActionPanel();
            };

            scope.makeViewChooser = function() {
                var cancelButton = '';
                if (scope.treeRoot !== undefined) {
                    cancelButton = '<button class="tooltip-wrapper btn btn-secondary btn-custom-secondary" title="Cancelar" directive-static-tooltip custom-placement="left" ng-click="cancelSplit()">' +
                    '<img src="images/controls/black/remove.svg" class="btn-custom-svg">' +
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

            scope.makeDefaultActions = function() {
                html = "";
                if ((scope.currentNode === undefined) ||
                        (scope.treeRoot !== undefined && (!scope.treeRoot.hasChildren())) ||
                        (scope.currentNode.model.id !== scope.treeRoot.model.id)) {
                    var list = scope.currentAttributeType;
                    html = '<div class="btn-group" role="group" aria-label="...">' +
                        '    <button type="button" id="btnDiseases" class="btn btn-default" ng-class="isAttributeTypeActive(\'' + scope.attributeType.DISEASES + '\')" ng-click="setAttributeType(\'' + scope.attributeType.DISEASES + '\')">Doenças</button>' +
                        '    <button type="button" id="btnMedications" class="btn btn-default" ng-class="isAttributeTypeActive(\'' + scope.attributeType.MEDICATIONS + '\')" ng-click="setAttributeType(\'' + scope.attributeType.MEDICATIONS + '\')">Medicações</button>' +
                        '</div>' +
                        '<p></p>' +
                        '<div class="right-inner-addon" style="margin-bottom:10px;">' +
                        '    <i class="glyphicon glyphicon-search"></i>' +
                        '    <input type="text" id="input-diseases" class="form-control" placeholder="Procurar..." ng-model="name" ng-key-select autofocus tabindex=1>' +
                        '</div>' +
                        '<p></p>' +
                        '<div id="patient-table" class="table table-condensed table-bordered">' +
                        '    <div class="checkbox checkboxInTable patient-table-entry" ng-repeat="disease in filteredDiseases = (' + list + ' | filter:name)" ng-click="">' +
                        '        <div style="display: inline-block" ng-class="isEntrySelected($index)">' +
                        '           <input class="checkbox-custom" type="checkbox" ng-checked="" ng-click="">' +
                        '           {{::disease}}' +
                        '        </div>' +
                        '    </div>' +
                        '</div>'
                        ;
                } else {
                    html = '<span>Pode <b>Maximizar</b> ( <img src="images/controls/black/maximize.svg" class="btn-custom-svg"> ) uma vista para configurar os atributos visíveis.</span>';
                }
            
                updateActionPanel();
            };

            updateActionPanel();
        } //link
    }; //return
}]);

moduleLayout.directive("directivePanes",
        ['$compile', '$timeout', 'patientData', 'makeVisualization',
        function($compile, $timeout, patientData, makeVisualization) {
	return { 
        scope: false, // Allow communication between panes and action panel
        link: function(scope, element, attrs) {
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
                        'class="btn-custom-svg">' +
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
                        var orientation = (node.model.split === scope.splitType.VERTICAL) ? "height" : "width";

                        return makeSplitPane(orientation, node.children[0], node.children[1]);
                    }
                } else {
                    return makeSplitInner(node.model.id);
                }

                return "";
            }

            function updateLayout() {
                // No nodes available: make first view functionality
                if (scope.currentNode === undefined) {

                    // There may be a previous view: nuke the layout
                    element.html($compile('')(scope));

                    scope.makeViewChooser();

                // Make html node layout
                } else {
                    element.html($compile(
                        makeChildrenLayout(scope.currentNode)
                    )(scope));

                    // FIXME: Only making heatmaps
                    scope.treeRoot.walk(function(node) {
                        if (node.model.viz !== scope.vizType.NONE) {
                            makeVisualization.makeHeatMap(node.model.id);
                        }
                    });

                    scope.makeDefaultActions();
                }
            }

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
                scope.cancelSplit();

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
                
                updateLayout();
            };

            scope.paneMaximize = function(button) {
                var id = angular.element(button.target).data('id');
                var node = scope.treeRoot.first(function (node1) {
                    return node1.model.id === id;
                });
                scope.currentNode = node;

                updateLayout();
            };

            scope.paneColapse = function() {
                scope.currentNode = scope.treeRoot;

                updateLayout();
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
                    if (scope.nodeForViz !== undefined) {
                        var node = scope.treeRoot.first(function (node1) {
                            return node1.model.id === scope.nodeForViz.id;
                        });

                        console.log("[INFO] Splitting in " +
                            scope.nodeForViz.split +
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
                        node.model.split = scope.nodeForViz.split;
                        node.model.viz = scope.vizType.NONE;
                    }
                }

                scope.paneColapse();
            };

            scope.paneSplitVertical = function(button) {
                var buttonID = angular.element(button.target).data('id');
                scope.nodeForViz = {
                    id: buttonID,
                    split: scope.splitType.VERTICAL
                };

                if (scope.currentNode.model.id !== scope.treeRoot.model.id) {
                    scope.paneColapse();
                }
                scope.makeViewChooser();
            };

            scope.paneSplitHorizontal = function(button) {
                var buttonID = angular.element(button.target).data('id');
                scope.nodeForViz = {
                    id: buttonID,
                    split: scope.splitType.HORIZONTAL
                };

                if (scope.currentNode.model.id !== scope.treeRoot.model.id) {
                    scope.paneColapse();
                }
                scope.makeViewChooser();
            };

            // Make initial layout
            makeVisualization.setData(
                scope.diseases,
                scope.medications
            );
            updateLayout();
        } //link
    }; //return
}]);

angular.module("moduleCombined", ["moduleIndex", "moduleLayout", "moduleSplits"]);
