/* globals PointerEventsPolyfill */

var moduleSplits = angular.module('moduleSplits',
        ['shagstrom.angular-split-pane']);

var moduleProviders = angular.module('moduleProviders');
var moduleUtils = angular.module('moduleUtils');
var moduleVisualizations = angular.module('moduleVisualizations');
var moduleWidgetBuilder = angular.module('moduleWidgetBuilder');
var moduleLayout = angular.module('moduleLayout',
        ['moduleProviders', 'moduleUtils', 'moduleVisualizations', 'moduleWidgetBuilder']);

moduleLayout.factory("nodes",
        ['utils', function(utils, visualizations) {
    // Store our view layout in a tree.
    var treeModel = new TreeModel();
    var rootNode;
    
    // Points to the node from which view layout is generated:
    // In an overview, it is the root node; 
    // In a maximized view, it is the maximized node.
    var currentNode;

    /**
     * @property {string} id - unique node id
     *
     * @property {number} level - node depth in tree
     *
     * @property {string} splitType - type of split
     *
     * @property {string} vizType - type of visualization stored in node
     *
     * @property {{id:string, isValid:bool, isChecked:bool, html:string}[]} vizs -
     * one or more visualizations, identified by a unique id
     * in the context of the node; a visualization's html will be reused in
     * layout updates when isValid is true
     *
     * @property {string} currentVizID - id of visualization to be displayed 
     * on single/maximized view
     *
     * @property {bool} skipCreation - checked in layout update in order to
     * create a visualization only in an empty view
     *
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
            skipCreation: model.skipCreation,
            children: model.children
        });
    };

    var getVizs = function(nodeID) {
        var node = rootNode.first(function(node1) {
            return node1.model.id === nodeID;
        });

        return node.model.vizs;
    };

    var getVizByIDs = function(nodeID, vizID) {
        var node = rootNode.first(function(node1) {
            return node1.model.id === nodeID;
        });
        var index = utils.arrayObjectIndexOf(node.model.vizs, vizID, "id");
        if (index === -1) {
            console.log("[WARN] @getViz: id not found.");
            return null;
        }
        return node.model.vizs[index];
    };

    var getVizByID = function(vizID) {
        var viz = null;
        rootNode.walk(function(node) {
            var index = utils.arrayObjectIndexOf(
                node.model.vizs, vizID, "id");
            if ((index !== -1) && (viz === null)) {
                viz = node.model.vizs[index];
            }
        });
        return viz;
    };

    /**
     * @param {nodeID:string, vizID:string} data - contains the
     * node id and visualization id that identify a certain visualization
     */
    var removeViz = function(data) {
        var node = rootNode.first(function(node1) {
            return node1.model.id === data.nodeID;
        });
        node.model.skipCreation = data.skipCreation || node.model.skipCreation;

        var index = utils.arrayObjectIndexOf(node.model.vizs, data.vizID, "id");
        if (index > -1) {
            console.log("[INFO] @removeViz: removed " + data.vizID);
            node.model.vizs.splice(index, 1);
        }
    };

    /**
     * @param {
     *   nodeID:string,
     *   vizID:string,
     *   currentVizID:string,
     *   isChecked:bool,
     *   vizObject:object
     * } data - contains the updated html of a visualization identified by 
     * node id and visualization id; 
     * currentVizID stores the id of the visualization that will be 
     * manipulated by user actions;
     * isChecked states if the visualization is displayed in the overview;
     * vizObject is an instance of a visualization factory
     */
    var updateViz = function(data) {
        var node = rootNode.first(function(node1) {
            return node1.model.id === data.nodeID;
        });
        node.model.currentVizID = data.currentVizID || node.model.currentVizID;
        node.model.skipCreation = data.skipCreation || node.model.skipCreation;

        if (data.nodeScope && data.nodeHTML) {
            detachNode(node);
            node.model.nodeScope = data.nodeScope;
            node.model.nodeHTML = data.nodeHTML;
        }

        var newViz = {
            id: data.vizID,
            isChecked: data.isChecked || false,
            isValid: data.isValid || true,
            vizObject: data.vizObject ||
                node.model.vizObject,
            currentMedication: data.currentMedication ||
                node.model.currentMedication
        };

        var index = utils.arrayObjectIndexOf(node.model.vizs, data.vizID, "id");
        if (index > -1) {
            node.model.vizs[index] = newViz;
        } else {
            node.model.vizs.push(newViz);
        }
    };

    // Check if the view is maximized. This is used to avoid unnecessary
    // calls to updateLayout()
    var isMaximized = function(id) {
        return currentNode.model.id === id;
    };

    // Print node tree layout to console
    var treePrint = function() {
        var nodesToPrint = [];
        getRootNode().walk(function(node) {
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

    // Remove uneeded scope and DOM elements
    var detachNode = function(node) {
        if (node.model.nodeScope)
            node.model.nodeScope.$destroy();
        if (node.model.nodeHTML)
            node.model.nodeHTML.remove();
    };

    // Create a scope from the current one with extra handlers
    var scopeCloneWithHandlers = function(sourceScope, targetScope, handlers) {
        targetScope = sourceScope.$new();
        targetScope.$on('$destroy', function() {
            scopeDestroyHandlers(targetScope);
        });
        scopeAddHandlers(targetScope, handlers);

        return targetScope;
    };

    // Keep track of handlers assigned to compiled DOM elements
    var scopeAddHandlers = function(scopeObject, handlers) {
        scopeObject.handlers = [];
        handlers.forEach(function(handlerObject) {
            if (scopeObject[handlerObject.name])
                console.log(
                    "[WARN] @scopeAddHandlers: property already exists!");
            scopeObject[handlerObject.name] = handlerObject.handler;
            scopeObject.handlers.push(handlerObject.name);
        });
    };

    // Remove invalid handlers that are still callable.
    // Note that $destroy only prevents angular handlers from being called,
    // not the ones we added manually, therefore we need to clean them.
    var scopeDestroyHandlers = function(scopeObject) {
        if (scopeObject.handlers.length === 0)
            console.log(
                "[INFO] @scopeDestroyHandlers: No handlers found.");
        scopeObject.handlers.forEach(function(name) {
            scopeObject[name] = null;
        });
        scopeObject.handlers = null;
    };

    // This is not some Java quirk. We do need these methods
    // in order for changes in factory properties be reflected in
    // other modules. Directly accessing these properties might not work.
    var getCurrentNode = function() { return currentNode; };
    var setCurrentNode = function(node) { currentNode = node; };
    var getRootNode = function() { return rootNode; };
    var setRootNode = function(node) { rootNode = node; };

    return {
        treePrint: treePrint,
        getCurrentNode: getCurrentNode,
        setCurrentNode: setCurrentNode,
        getRootNode: getRootNode,
        setRootNode: setRootNode,
        makeNode: makeNode,
        getVizs: getVizs,
        getVizByID: getVizByID,
        getVizByIDs: getVizByIDs,
        isMaximized: isMaximized,
        removeViz: removeViz,
        updateViz: updateViz,
        detachNode: detachNode,
        scopeCloneWithHandlers: scopeCloneWithHandlers
    };
}]);

moduleLayout.controller('controllerMainPanel',
        ['$document', '$scope', 'patientData',
        function($document, $scope, patientData) {
    $document.ready(function(){
        // Load polyfills
        PointerEventsPolyfill.initialize({});

        // Set global library options
        moment.locale('pt');
    });

    $scope.patient = patientData.getAttribute(patientData.KEY_PATIENT);
    
    var retrievedLastVisit = new Date($scope.patient.lastVisit);
    $scope.dateLastVisit = moment(retrievedLastVisit).format('YYYY/MM/DD') +
        " (" + $scope.patient.lastVisitPeriod + ")";
}]);

moduleLayout.directive("directiveMainPanel",
        ['$compile', 'nodes', 'widgets',
        function($compile, nodes, widgets) {
	return { 
        scope: true,
        link: function(scope, element, attrs) {
            scope.gotoIndex = function(button) {
                window.location.href = "index.html";
            };
            scope.newLayout = function(button) {
                scope.APIPanes.newLayout();
            };
            scope.showViews = function() {
                scope.views = [];
                var rootNode = nodes.getRootNode();
                if (rootNode) {
                    nodes.getRootNode().walk(function(node) {
                        if(!node.hasChildren())
                            scope.views.push(node);
                    });
                }

                var html = '<li>';
                html += (scope.views.length === 0) ?
                    '<a><span class="glyphicon glyphicon-alert" aria-hidden="true"></span> Nenhuma vista disponível.</a>' :
                    '<a href="#" id="show-views-{{::view.model.id}}" ng-repeat="view in views" ng-click="paneMaximizeFromID(view.model.id)">' +
                        '{{::view.model.vizType}}' +
                    '</a>';
                html += '</li>';
                var showViewsTarget = angular.element(
                    '#showViewsMenu');
                showViewsTarget.html(
                    $compile(html)(scope));
            };

            scope.paneMaximizeFromID = function(id) {
                var node = nodes.getRootNode().first(function (node1) {
                    return node1.model.id === id;
                });

                nodes.setCurrentNode(node);

                scope.APIPanes.updateLayout();
            };
        }
    };
}]);

moduleLayout.directive('directivePatientTooltip', function() {
    return {
        link: function (scope, element, attrs) {
            scope.setTooltipText = function(button) {
                scope.tooltipText = 
                    "<div style=\"text-align: left\" class=\"p\">" +
                        "Os <b>atributos presentes</b><br/>" +
                        "<b>no paciente actual</b><br/>" +
                        "são assinalados (" +
                        "<div style=\"display: inline-block\" class=\"" +
                            "markPatientAttribute markPresent markSquare\" />" +
                        ")." +
                    "</div>";
            };
        }
    };
});

moduleLayout.controller('controllerLayout',
        ['$scope', 'patientData',
        function($scope, patientData) {
    $scope.vizType = Object.freeze({
        NONE: "NONE",
        HEATMAP: "Relação entre atributos (Matrix)",
        SPIRAL: "Análise Temporal (Espirais)",
        TIMELINE: "Interacções Temporais (Linhas + Grafo)"
    });

    // Attribute lists shared among multiple patients
    $scope.diseases = patientData.getAttributeList(
        patientData.KEY_PATIENTS, 'diseases');
    $scope.medications = patientData.getAttributeList(
        patientData.KEY_PATIENTS, 'medications');
    $scope.diseasesNames = patientData.getAttributeListByProperty(
        patientData.KEY_PATIENTS, 'diseases', 'name');
    $scope.medicationsNames = patientData.getAttributeListByProperty(
        patientData.KEY_PATIENTS, 'medications', 'name');

    // Custom attribute lists to be used in
    // compiled list widgets (e.g. makeListWithEntryBars)
    /*
    $scope.customNames = {};
    $scope.setListInCustomNames = function(list) {
        utils.extend(list, $scope.customNames[name]);
    }
    */

    // Shared state among multiple directives;
    // Note that directives have scope set to `true`, so these properties have
    // to be objects in order to be modifiable by the directives
    $scope.selectedDiseases = $scope.diseasesNames
        .map(function(attribute) {
            return {
                name: attribute,
                selected: true
            };
        });
    $scope.selectedMedications = $scope.medicationsNames
        .map(function(attribute) {
            return {
                name: attribute,
                selected: true
            };
        });
    $scope.currentMedication = {
        name: null
    };

    // Shared methods from directive panes
    $scope.APIPanes = {};

    // Shared methods from directive action-panel
    $scope.APIActionPanel = {};
}]);

moduleLayout.controller("controllerEntryBarFill", 
        ['$scope', 'utils', 'retrieveCountsData',
        function($scope, utils, retrieveCountsData) {
    // Populated in directive
    $scope.proportionObjects = [];

    $scope.proportionPromise = retrieveCountsData.retrieveIncidences;
    $scope.orderByProportion = function(name) {
        // Use negative values to reverse order
        var index = utils.arrayObjectIndexOf(
            $scope.proportionObjects, name, "name");
        return (index !== -1) ?
            -($scope.proportionObjects[index].proportion) :
            -1;
    };
}]);
moduleLayout.controller("controllerListEntryBarFill", 
        ['$scope', 'utils', 'retrieveCountsData',
        function($scope, utils, retrieveCountsData) {
    // Populated in directive
    $scope.proportionObjects = [];

    // Set by widget building function
    // $scope.proportionPromise;

    // Overrides unused model
    $scope.optionListModel = "";

    $scope.orderByProportion = function(entryName) {
        // Use negative values to reverse order
        var listName = $scope.listName;
        var listIndex = utils.arrayObjectIndexOf(
            $scope.proportionObjects, listName, "name");
        if (listIndex === -1)
            return -1;

        var entryIndex = utils.arrayObjectIndexOf(
            $scope.proportionObjects[listIndex].list, entryName, "name");
        return (entryIndex !== -1) ?
            -($scope.proportionObjects[listIndex].list[entryIndex].proportion) :
            -1;
    };
}]);
moduleLayout.directive("directiveEntryBarFill", 
        ['utils',
        function(utils) {
    return {
        scope: true,
        link: function(scope, element, attrs) {
            scope.proportionPromise.then(function(result) {
                // HACK: scope.attribute set when filtering attribute list
                // with ng-repeat
                var index = utils.arrayObjectIndexOf(
                    result.data, scope.attribute, "name");
                if (index !== -1) {
                    scope.proportion = result.data[index].incidences /
                        result.countPatients * 100;
                }
                scope.proportionObjects.push({
                    name: scope.attribute,
                    proportion: scope.proportion
                });
            });
        } //link
    }; //return
}]);
moduleLayout.directive("directiveListEntryBarFill", 
        ['utils',
        function(utils) {
    return {
        scope: true,
        link: function(scope, element, attrs) {
            scope.proportionPromise.then(function(result) {
                var listIndex = utils.arrayObjectIndexOf(
                    scope.proportionObjects, result.listName, "name");
                if (listIndex === -1)
                    scope.proportionObjects.push({
                        name: result.listName,
                        list: []
                    });
                listIndex = utils.arrayObjectIndexOf(
                    scope.proportionObjects, result.listName, "name");

                // HACK: scope.attribute set when filtering attribute list
                // with ng-repeat
                var entryIndex = utils.arrayObjectIndexOf(
                    result.data,
                    scope.attribute,
                    "name");
                if (entryIndex !== -1) {
                    scope.proportion = result.data[entryIndex].incidences /
                        result.countPatients * 100;
                }
                scope.proportionObjects[listIndex].list.push({
                    name: scope.attribute,
                    proportion: scope.proportion
                });
            });
        } //link
    }; //return
}]);

moduleLayout.directive('directiveMenuTooltip', function() {
    return {
        link: function (scope, element, attrs) {
            scope.setTooltipText = function(button) {
                scope.tooltipText = 
                    "<div style=\"text-align: left\" class=\"p\">" +
                        "Cada barra " +
                        "( " +
                        "<div style=\"display: inline-block\" class=\"" +
                                "patient-table-entry-bar\" > " +
                            '<div class="patient-table-entry-bar-fill" style="width:35%"> ' +
                            '</div>' +
                        '</div>' +
                        " )<br/>" +
                        "representa a <b>proporção de pacientes</b><br/>" +
                        "com o atributo correspondente." +
                    "</div>" +
                    "<div style=\"text-align: left\" class=\"p\">" +
                    "</div>";
            };
        }
    };
});

moduleLayout.directive("directiveActionPanel",
        ['$compile', '$filter', 'visualizations', 'SpiralVisualization', 'filters', 'patientData', 'utils', 'widgets', 'nodes', 'timeWeaver', 'retrieveCountsData',
        function($compile, $filter, visualizations, SpiralVisualization, filters, patientData, utils, widgets, nodes, timeWeaver, retrieveCountsData) {
	return { 
        scope: true,
        link: function(scope, element, attrs) {
            var currentScope;

            var currentHTML;
            var updateActionPanel = function(html) {
                // Remove previous scope and DOM elements
                if (currentScope)
                    currentScope.$destroy();
                if (currentHTML)
                    currentHTML.remove();
                filters.removeFilters();

                currentScope = nodes.scopeCloneWithHandlers(
                    scope,
                    currentScope,
                    [ { 
                        name: "isAttributeTypeActive",
                        handler: isAttributeTypeActive
                    }, { 
                        name: "setAttributeType",
                        handler: setAttributeType
                    }, { 
                        name: "isModificationTypeActive",
                        handler: isModificationTypeActive
                    }, { 
                        name: "setModificationType",
                        handler: setModificationType
                    }
                ]);

                currentHTML = $compile(html)(currentScope);
                element.html(currentHTML);

                // Force autofocus, since compilation doesn't trigger it
                var input = angular.element('#input-option-list');
                if (input)
                    input.focus();

                // Filters
                // TODO: Support multiple views layout
                var node = nodes.getCurrentNode();
                if (node) {
                    var viz = nodes.getVizByIDs(
                            node.model.id,
                            node.model.currentVizID);
                    if (!viz)
                        return;

                    var vizObject = viz.vizObject;
                    var modificationTypes = vizObject
                        .getModificationTypes();
                    if (isModificationTypeActive(modificationTypes.FILTERS)) {
                        scope.updateFilterListeners(node);

                        // Make filters, compiling when needed
                        scope.filterLists = [];
                        filters.filters.forEach(function(filter, i) {
                            if (filter.handlers.length) {
                                var widgetRequestPromise = filter.make(
                                    filter.handlers[0]
                                );
                                widgetRequestPromise.then(
                                        function(widgetRequest) {
                                    if (widgetRequest.needsCompiling) {
                                        for (i in widgetRequest
                                                .elementsToProcess) {
                                            var element = widgetRequest
                                                .elementsToProcess[i];
                                            // FIXME: Need to keep track
                                            // of new scopes so we can
                                            // destroy them later
                                            var targetScope = scope.$new();
                                            targetScope[element.attributeName] =
                                                element.attributeElement;
                                            targetScope[element.listName] =
                                                element.list.data;
                                            targetScope.listName =
                                                element.listName;
                                            var elementTarget = angular.element(
                                                '#' + element.targetName);
                                            elementTarget.append(
                                                $compile(element.html)
                                                (targetScope));
                                        }
                                    }
                                });
                            }
                        });
                    }
                }
            };

            scope.updateFilterListeners = function(node) {
                var viz = nodes.getVizByIDs(
                    node.model.id, node.model.currentVizID);
                var vizObject = viz.vizObject;
                vizObject.update(
                    node.model.id,
                    node.model.currentVizID,
                    {
                        useFilters: true
                    }
                );
            };

            scope.chooseSpiral = function() {
                scope.APIPanes.makePaneSplit(
                    scope.APIPanes.vizType.SPIRAL);
            };

            scope.chooseHeatmap = function() {
                scope.APIPanes.makePaneSplit(scope.APIPanes.vizType.HEATMAP);
            };

            scope.chooseTimeline = function() {
                scope.APIPanes.makePaneSplit(scope.APIPanes.vizType.TIMELINE);
            };

            // Just for testing
            scope.chooseTODO = function() {
                scope.APIPanes.makePaneSplit(scope.APIPanes.vizType.NONE);
            };

            // Just for testing
            scope.makeTODOActionPanel = function() {
                updateActionPanel("<span>TODO</span>");
            };

            // Cancels user action, with an optional callback
            // containing cleanup routines
            scope.cancelAction = function(callback) {
                if (callback) {
                    if(scope.hasOwnProperty(callback)) {
                        scope[callback]();
                    } else {
                        console.log("[WARN] @cancelAction: " +
                            "Attempt to call undefined callback: " +
                            callback);
                    }
                }

                scope.makeDefaultActions();
            };

            scope.cancelSplit = function() {
                scope.nodeToSplit = undefined;

                scope.cancelAction();
            };

            scope.makeViewChooser = function() {
                var cancelButton = '';
                if (nodes.getRootNode() !== undefined) {
                    cancelButton = widgets.makeImgButton({
                        clazz:  "btn-secondary custom-btn-secondary custom-right",
                        placement: "left",
                        method: "cancelSplit()",
                        title:  "Cancelar",
                        img:    "images/controls/black/remove.svg"
                    });
                }
                var html = cancelButton +
                    '<h4>Escolha uma visualização:</h4>' +
                    '<div class="view-choice" ng-click="chooseHeatmap()">' +
                    '<img src="images/views/heatmap.svg" ' +
                        'class="view-choice-svg">' +
                        '<a class="discrete-link" href="#">' +
                            'Relações entre atributos' +
                        '</a>' +
                    '</img>' +
                    '</div>' +
                    '<div class="view-choice" ng-click="chooseSpiralAttribute(\'chooseSpiral\')">' +
                    '<img src="images/views/circulartime.svg" ' +
                        'class="view-choice-svg">' +
                        '<a class="discrete-link" href="#">' +
                            'Análise temporal de medicações' +
                        '</a>' +
                    '</div>' +
                    '<div class="view-choice" ng-click="chooseTimeline()">' +
                    '<img src="images/views/timeline.svg" ' +
                        'class="view-choice-svg">' +
                        '<a class="discrete-link" href="#">' +
                            'Interacção temporal entre doenças e medicações' +
                        '</a>' +
                    '</img>' +
                    '</div>';
                
                updateActionPanel(html);
            };

            var setAttributeType = function(type) {
                var node = nodes.getCurrentNode();
                var viz = nodes.getVizByIDs(
                    node.model.id, node.model.currentVizID);
                viz.vizObject.setCurrentAttributeType(type);

                scope.makeDefaultActions();
            };

            var isAttributeTypeActive = function(type) {
                var node = nodes.getCurrentNode();
                var viz = nodes.getVizByIDs(
                    node.model.id, node.model.currentVizID);
                return (viz && (viz.vizObject.isAttributeTypeActive(type))) ?
                    "button-selected" :
                    "";
            };

            var setModificationType = function(type) {
                var node = nodes.getCurrentNode();
                var viz = nodes.getVizByIDs(
                    node.model.id, node.model.currentVizID);
                viz.vizObject.setCurrentModificationType(type);

                scope.makeDefaultActions();
            };

            var isModificationTypeActive = function(type) {
                var node = nodes.getCurrentNode();
                var viz = nodes.getVizByIDs(
                    node.model.id, node.model.currentVizID);
                return (viz && (viz.vizObject.isModificationTypeActive(type))) ?
                    "active" :
                    "";
            };

            // Redraw visualizations
            var updateFromSelections = function(state) {
                scope.APIPanes.updateFromSelections(state);
            };

            // Select a property from the view's active property list
            scope.check = function(name) {
                // FIXME: Hardcoded
                var vizObject = nodes.getVizs(
                    nodes.getCurrentNode().model.id)[0].vizObject;
                var currentAttributeType = vizObject.currentAttributeType;
                var attributeTypes = vizObject
                    .getAttributeTypes();

                var array;
                if (currentAttributeType ===
                        attributeTypes.DISEASES) {
                    array = vizObject.patientLists.diseases;
                } else if (currentAttributeType ===
                        attributeTypes.MEDICATIONS) {
                    array = vizObject.patientLists.medications;
                }

                var index = utils.arrayObjectIndexOf(array, name, "name");
                if (index === -1)
                    return;

                array[index] = {
                    name: array[index].name,
                    selected: !(array[index].selected)
                };

                // Set the visualization's stored patient lists
                scope.selectedDiseases =
                    vizObject.patientLists.diseases;
                scope.selectedMedications =
                    vizObject.patientLists.medications;

                // Remove any remaining highlights of the previous state
                // HACK: Unused object
                if (vizObject.rendererRemoveStyle)
                    vizObject.rendererRemoveStyle({});

                updateFromSelections({
                    diseases: scope.selectedDiseases,
                    medications: scope.selectedMedications
                });
            };

            // Select a property from the corresponding filter list
            scope.checkFilter = function(
                    entryName, listName, filterName) {
                // FIXME: Hardcoded
                var vizObject = nodes.getVizs(
                    nodes.getCurrentNode().model.id)[0].vizObject;

                // Set current filter as active
                var observer = filters.getFilterByName(filterName);
                var filterIndex = utils.arrayObjectIndexOf(
                    observer.renderer.lists,
                    listName,
                    'habitName'
                );
                var displayName =
                    observer.renderer.lists[filterIndex].displayName;
                observer.renderer.lists[filterIndex]
                    .state.displayName = displayName;
                observer.renderer.lists[filterIndex]
                    .state.frequencyName = entryName; 
                observer.renderer.lists[filterIndex]
                    .state.habitName = listName; 

                var checkedActivatedFilters =
                    filters.getActivatedFilters();
                var i = utils.arrayObjectIndexOf(
                    checkedActivatedFilters,
                    listName,
                    'listName'
                );
                if (i === -1) {
                    checkedActivatedFilters.push({
                        displayName: displayName,
                        entryName: entryName,
                        listName: listName,
                        filterName: filterName
                    });
                } else {
                    checkedActivatedFilters[i].entryName = entryName;
                }
                filters.setActivatedFilters(checkedActivatedFilters);

                // Show `reset` button if changes were made;
                // Update activation order
                var entryIndex = utils.arrayObjectIndexOf(
                    observer.renderer.lists,
                    listName,
                    'habitName');
                var elementListName = filterName + '-' + listName;
                if (observer.renderer.lists[entryIndex].isActive(
                            observer.renderer.lists[entryIndex])) {
                    d3.select('#filters-svg-' + elementListName + '-reset')
                        .style('display', 'block');
                } else {
                    d3.select('#filters-svg-' + elementListName + '-reset')
                        .style('display', 'none');
                }
                filters.filterObserver.dispatch(observer);
            };


            // Select a single property from the view's active property list
            // Used for transient lists (one-shot selection)
            scope.checkSingle = function() {
                updateFromSelections({
                    medications: scope.selectedMedications,
                    currentMedication: scope.currentMedication.name
                });

                scope.APIPanes.updateBinningElements();

                scope.APIActionPanel.makeDefaultActions();
            };

            // Select all properties from the view's active property list
            scope.checkAll = function() {
                var vizObject = nodes.getVizs(
                    nodes.getCurrentNode().model.id)[0].vizObject;
                var currentAttributeType = vizObject.currentAttributeType;
                var attributeTypes = vizObject
                    .getAttributeTypes();

                var makeCheckedObject = function(obj) {
                    return {
                        name: obj.name,
                        selected: true
                    };
                };
                if (currentAttributeType ===
                        attributeTypes.DISEASES) {
                    vizObject.patientLists.diseases =
                        vizObject.patientLists.diseases
                        .map(makeCheckedObject);
                } else if (currentAttributeType ===
                        attributeTypes.MEDICATIONS) {
                    vizObject.patientLists.medications =
                        vizObject.patientLists.medications
                        .map(makeCheckedObject);
                }

                // Set the visualization's stored patient lists
                scope.selectedDiseases =
                    vizObject.patientLists.diseases;
                scope.selectedMedications =
                    vizObject.patientLists.medications;

                updateFromSelections({
                    diseases: scope.selectedDiseases,
                    medications: scope.selectedMedications
                });
            };

            // Select no properties from the view's active property list
            scope.checkNone = function() {
                var vizObject = nodes.getVizs(
                    nodes.getCurrentNode().model.id)[0].vizObject;
                var currentAttributeType = vizObject.currentAttributeType;
                var attributeTypes = vizObject
                    .getAttributeTypes();

                var makeCheckedObject = function(obj) {
                    return {
                        name: obj.name,
                        selected: false
                    };
                };
                if (currentAttributeType ===
                        attributeTypes.DISEASES) {
                    vizObject.patientLists.diseases =
                        vizObject.patientLists.diseases
                        .map(makeCheckedObject);
                } else if (currentAttributeType ===
                        attributeTypes.MEDICATIONS) {
                    vizObject.patientLists.medications =
                        vizObject.patientLists.medications
                        .map(makeCheckedObject);
                }

                // Set the visualization's stored patient lists
                scope.selectedDiseases =
                    vizObject.patientLists.diseases;
                scope.selectedMedications =
                    vizObject.patientLists.medications;

                updateFromSelections({
                    diseases: scope.selectedDiseases,
                    medications: scope.selectedMedications
                });
            };

            scope.isListInputSelected = function(
                    entryName, listName, filterName) {
                var i = utils.arrayObjectIndexOf(
                    filters.getActivatedFilters(),
                    listName,
                    "listName");
                return (i !== -1) && (filters.getActivatedFilters()[i]
                    .entryName === entryName);
            };

            scope.isSelected = function(name) {
                var vizObject = nodes.getVizs(
                    nodes.getCurrentNode().model.id)[0].vizObject;
                var currentAttributeType = vizObject.currentAttributeType;
                var attributeTypes = vizObject
                    .getAttributeTypes();
                var array = [];
                if (currentAttributeType ===
                        attributeTypes.DISEASES) {
                    array = vizObject.patientLists.diseases;
                } else if (currentAttributeType ===
                        attributeTypes.MEDICATIONS) {
                    array = vizObject.patientLists.medications;
                }

                var index = utils.arrayObjectIndexOf(array, name, "name");
                if (index === -1)
                    return false;

                return array[index].selected;
            };
            
            scope.isEntryCurrentPatientAttribute = function(name) {
                // FIXME: These checks are due to spirals not being created
                // immediately like heatmaps, we can probably avoid them...
                var currentNode = nodes.getCurrentNode();
                if (currentNode) {
                    var vizID = currentNode.model.currentVizID;
                    var viz = nodes.getVizByIDs(
                        currentNode.model.id, currentNode.model.currentVizID);
                    if (viz) {
                        var vizObject = viz.vizObject;
                        var currentAttributeType = vizObject.currentAttributeType;
                        var attributeTypes = vizObject
                            .getAttributeTypes();
                        var array = [];
                        var patient = patientData.getAttribute(
                            patientData.KEY_PATIENT);
                        if (currentAttributeType ===
                                attributeTypes.DISEASES) {
                            array = patient.diseases.map(function(obj) {
                                return obj.name;
                            });
                        } else if (currentAttributeType ===
                                attributeTypes.MEDICATIONS) {
                            array = patient.medications.map(function(obj) {
                                return obj.name;
                            });
                        }

                        var index = array.indexOf(name);
                        return (index === -1) ?
                            "markPatientAttribute" :
                            "markPatientAttribute markPresent";
                    }
                }

                return "markPatientAttribute";
            };

            // Set shared state and invoke a callback that uses it; We need to
            // share state since we don't know which directive has the callback
            scope.callWithSavedAttribute = function(
                    callbackName, callBackArguments, name) {
                scope.currentMedication.name = name;
                scope[callbackName](callBackArguments);
            };

            // Retrieve a user selected attribute to be used in a 
            // spiral visualization; Since this functionality is shared by 
            // both visualization creation and modification, each of these cases 
            // will pass their specific behaviour as a callback
            scope.chooseSpiralAttribute = function(
                    callbackName,
                    callBackArguments) {
                scope.patient = 
                    patientData.getAttribute(patientData.KEY_PATIENT);
                scope.defaultActionsList = 
                    scope.patient.medications.map(function(obj) {
                        return obj.name;
                    });
                scope.callBackArguments = callBackArguments;

                //
                // directive-option-list API
                //
                scope.optionListCondition = function(button) {
                    // Option selection is always valid
                    return true;
                };
                scope.optionListAction = function(button, model) {
                    scope.callWithSavedAttribute(
                        callbackName,
                        scope.callBackArguments,
                        model);
                };

                var cancelButton = '';
                if (nodes.getRootNode() !== undefined) {
                    cancelButton = widgets.makeImgButton({
                        clazz:  "btn-secondary custom-btn-secondary custom-right",
                        placement: "left",
                        method: "cancelSplit()",
                        title:  "Cancelar",
                        img:    "images/controls/black/remove.svg"
                    });
                }
                var html = cancelButton +
                    '<div>' +
                        // Attribute lists
                        '<h4>Escolha um atributo:</h4>' +
                        '<div class="dropdown">' +
                            '<button type="button" href="#" class="btn btn-default dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Medicações <span class="caret custom-caret-margin"></span></button>' +
                            '<ul class="dropdown-menu">' +
                                '<li><a href="#">Medicações</a></li>' +
                            '</ul>' +
                        '</div>' +
                        '<p/>' +
                        '<div ng-controller="controllerOptionList">' +
                            // Search
                            '<div class="right-inner-addon">' +
                                '<i class="glyphicon glyphicon-search"></i>' +
                                '<input type="text" ' +
                                    'id="input-option-list" ' +
                                    'class="form-control" ' +
                                    'placeholder="Procurar..." ' +
                                    'ng-model="optionListModel" ' +
                                    'data-directive-option-list ' +
                                    'autofocus tabindex=1>' +
                            '</div>' +
                            '<p/>' +
                            // List
                            '<div class="table table-condensed table-bordered patient-table">' +
                                '<div class="checkboxInTable patient-table-entry" ' +
                                    'ng-repeat="attribute in filteredAttributes = (defaultActionsList | filter:optionListModel)"' +
                                    'ng-click="callWithSavedAttribute(\'' + callbackName + '\', callBackArguments, attribute)" ' +
                                    'ng-class="isEntrySelected($index)">' +
                                    '<div class="patient-table-entry-text">' +
                                        '<div style="display: inline-block" ' +
                                            'ng-class="isEntryCurrentPatientAttribute(attribute)">' +
                                        '</div>' +
                                        '{{::attribute}}' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
    
                updateActionPanel(html);
            };

            scope.chooseSpiralToJoin = function() {
                var cancelButton = widgets.makeImgButton({
                    clazz:  "btn-secondary custom-btn-secondary custom-right",
                    placement: "left",
                    method: "cancelAction(\'cleanOverlays\')",
                    title:  "Cancelar",
                    img:    "images/controls/black/remove.svg"
                });
                var html = cancelButton +
                    '<div>' +
                        '<h4>Seleccione a espiral de destino</h4>' +
                    '</div>';
    
                updateActionPanel(html);

                var currentNode = nodes.getCurrentNode();
                var sourceID = currentNode.model.currentVizID;
                var vizs = currentNode.model.vizs;
                for (var i = 0; i < vizs.length; i++) {
                    var vizID = vizs[i].id;

                    var vizHeight = angular.element('#' + vizID)[0]
                        .offsetHeight;
                    // Set fallback value close to drawn SVG elements
                    if (!vizHeight)
                        vizHeight = 350;

                    var overlayClass = (vizID === sourceID) ?
                        'viz-overlay-source' :
                        'viz-overlay-target';
                    var overlayHTML =
                        '<div class="viz-overlay ' + overlayClass + '" ' +
                            'style="height: ' + vizHeight + 'px" ' +
                            'id="overlay-' + vizID + '" ' +
                            'ng-click="makeJoinSpiral(\'' + vizID + '\')">';
                    overlayHTML += (vizID === sourceID) ?
                        '<div class="viz-overlay-target-text">' +
                            '<span>Juntar ' + 
                                vizs[i].vizObject.currentMedication + 
                                ' com...</span>' +
                        '</div>' :
                        '';
                    overlayHTML += '</div>';
                    var targetHTML = $compile(overlayHTML)(scope);
                    var target = angular.element('#' + vizID + "-contents");
                    target.append(targetHTML);
                }
            };

            scope.cleanOverlays = function() {
                var currentNode = nodes.getCurrentNode();
                var vizs = currentNode.model.vizs;
                for (var i = 0; i < vizs.length; i++) {
                    angular.element('#overlay-' + vizs[i].id).remove();
                }
            };

            scope.makeJoinSpiral = function(vizID) {
                var currentNode = nodes.getCurrentNode();
                var previousVizID = currentNode.model.currentVizID;
                if (previousVizID !== vizID) {
                    var sourceViz = nodes.getVizByIDs(
                            currentNode.model.id,
                            currentNode.model.currentVizID)
                        .vizObject;
                    var targetViz = nodes.getVizByIDs(
                            currentNode.model.id,
                            vizID)
                        .vizObject;

                    // Compute common expected frequency
                    var diffIntervals = visualizations.diffInterval(
                        visualizations.translateFrequency(
                            sourceViz.expectedFrequency),
                        visualizations.translateFrequency(
                            targetViz.expectedFrequency));
                    var newFrequency = (diffIntervals > 0) ?
                        sourceViz.expectedFrequency :
                        targetViz.expectedFrequency;

                    var newStartDate = timeWeaver.computeJoinMoment(
                        sourceViz
                            .visualizationRenderer.option.recordedStartDate,
                        targetViz
                            .visualizationRenderer.option.recordedStartDate,
                        function(a, b) { return a > b; }
                    ).toISOString();
                    var newEndDate = timeWeaver.computeJoinMoment(
                        sourceViz
                            .visualizationRenderer.option.recordedEndDate,
                        targetViz
                            .visualizationRenderer.option.recordedEndDate,
                        function(a, b) { return a < b; }
                    ).toISOString();

                    var resultJoinProperties = timeWeaver
                        .computeJoinProperties(sourceViz, targetViz);

                    // target was selected
                    scope.cleanOverlays();

                    // update source spiral
                    var attributeData = {
                        dosage: resultJoinProperties.newDosage,
                        startDate: newStartDate,
                        endDate: newEndDate,
                        expectedFrequency: newFrequency,
                        recordedFrequency: 
                            resultJoinProperties.newRecordedFrequency
                    };
                    updateFromSelections({
                        currentMedication: targetViz.currentMedication,
                        joinData: {
                            attributeData: attributeData,
                            targetRenderer: targetViz.visualizationRenderer
                        }
                    });

                    // remove target spiral
                    scope.removeSpiralRoutine({
                        nodeID: currentNode.model.id,
                        vizID: vizID
                    });

                    // spiral state was changed: update our reference
                    targetViz = nodes.getVizByIDs(
                            currentNode.model.id,
                            currentNode.model.currentVizID)
                        .vizObject;

                    // spiral state was changed: update it's options
                    scope.APIPanes.updateBinningOptions(
                        currentNode.model.id,
                        currentNode.model.currentVizID,
                        targetViz);

                    // reset action panel
                    scope.makeDefaultActions();
                } else {
                    // NOTHING: The user must cancel or choose
                    // another spiral
                }
            };

            scope.vizStyleFromMouseEnter = function(attribute) {
                var node = nodes.getCurrentNode();
                var viz = nodes.getVizByIDs(
                    node.model.id, node.model.currentVizID);
                var vizObject = viz.vizObject;
                var attributeTypes = vizObject.getAttributeTypes();
                var currentAttributeType = vizObject.currentAttributeType;
                var dataObject = null;
                if (currentAttributeType ===
                        attributeTypes.DISEASES) {
                    dataObject = {
                        disease: attribute,
                        first: { name: attribute },
                        second: { name: attribute }
                    };
                } else if (currentAttributeType ===
                        attributeTypes.MEDICATIONS) {
                    dataObject = {
                        medication: attribute,
                        first: { name: attribute },
                        second: { name: attribute }
                    };
                }

                if (vizObject.rendererAddStyle)
                    vizObject.rendererAddStyle(dataObject);
            };

            scope.vizStyleFromMouseLeave = function(attribute) {
                var node = nodes.getCurrentNode();
                var viz = nodes.getVizByIDs(
                    node.model.id, node.model.currentVizID);
                var vizObject = viz.vizObject;

                // HACK: Unused object
                if (vizObject.rendererRemoveStyle)
                    vizObject.rendererRemoveStyle({});
            };

            scope.makeDefaultActions = function() {
                var currentNode = nodes.getCurrentNode();
                var vizObject; 
                var currentAttributeType; 
                var attributeTypes; 
                var currentModificationType; 
                var modificationTypes; 
                var list;

                var html = "";
                var rootHasNoChildren = (nodes.getRootNode()) &&
                    (!nodes.getRootNode().hasChildren());
                var viewNotRoot = (nodes.getRootNode()) &&
                    (!nodes.isMaximized(nodes.getRootNode().model.id));
                if (rootHasNoChildren || viewNotRoot) {
                    if (currentNode.model.vizType ===
                            scope.vizType.HEATMAP) {
                        vizObject = nodes.getVizByIDs(
                                currentNode.model.id,
                                currentNode.model.currentVizID)
                            .vizObject;

                        // Set the visualization's stored patient lists
                        scope.selectedDiseases =
                            vizObject.patientLists.diseases;
                        scope.selectedMedications =
                            vizObject.patientLists.medications;

                        // Also filter names by
                        // attributes present in the patient
                        scope.diseasesNames = 
                            scope.selectedDiseases.map(function(obj) {
                                return obj.name;
                            });
                        scope.medicationsNames = 
                            scope.selectedMedications.map(function(obj) {
                                return obj.name;
                            });

                        // Populate widgets with common lists ("...Names")
                        html = '<div>';
                        html += widgets.makeAttributePills({
                            currentModificationType: vizObject
                                .currentModificationType,
                            modificationTypes: vizObject
                                .getModificationTypes()
                        });
                        html += widgets.makeAttributePillsContents({
                            list: vizObject
                                .currentAttributeType + "Names",
                            currentNode: currentNode,
                            currentAttributeType: vizObject
                                .currentAttributeType,
                            attributeTypes: vizObject
                                .getAttributeTypes(),
                            currentModificationType: vizObject
                                .currentModificationType,
                            modificationTypes: vizObject
                                .getModificationTypes()
                        });
                        html += '</div>';
                    } else if (currentNode.model.vizType ===
                            scope.vizType.SPIRAL) {
                        // HACK: If no spiral exists, skip checks
                        var spiralViz = nodes.getVizByIDs(
                            currentNode.model.id,
                            currentNode.model.currentVizID);
                        if (spiralViz) {
                            vizObject = spiralViz.vizObject;
                            currentModificationType = vizObject
                                .currentModificationType;
                            modificationTypes = vizObject
                                .getModificationTypes();
                        } else {
                            currentModificationType = SpiralVisualization
                                .prototype.getModificationTypes().DATA;
                            modificationTypes = SpiralVisualization
                                .prototype.getModificationTypes();
                        }

                        scope.patient = 
                                patientData.getAttribute(patientData.KEY_PATIENT);
                        scope.defaultActionsList = 
                                scope.patient.medications.map(function(obj) {
                                    return obj.name;
                                });

                        var spiralActions = widgets.makeImgButton({
                            clazz:  "btn-secondary custom-btn-secondary custom-container-width",
                            id:     currentNode.model.id,
                            method: "chooseAddSpiral($event)",
                            text:   "Adicionar espiral",
                            img:    "images/controls/black/add.svg"
                        });
                        html = '<div>';
                        html += widgets.makeAttributePillsOnlyData({
                            currentModificationType: currentModificationType,
                            modificationTypes: modificationTypes 
                        });
                        html += (currentModificationType === modificationTypes.DATA) ?
                            '<div>' +
                                spiralActions +
                            '</div>' :
                            '<div id="filters-' + currentNode.model.id + '">' +
                            '</div>';
                        html += '</div>';
                    } else if (currentNode.model.vizType ===
                            scope.vizType.TIMELINE) {
                        vizObject = nodes.getVizByIDs(
                                currentNode.model.id,
                                currentNode.model.currentVizID)
                            .vizObject;

                        // Set the visualization's stored patient lists
                        scope.selectedDiseases =
                            vizObject.patientLists.diseases;
                        scope.selectedMedications =
                            vizObject.patientLists.medications;

                        // Also filter names by
                        // attributes present in the patient
                        scope.diseasesNames = 
                            scope.selectedDiseases.map(function(obj) {
                                return obj.name;
                            });
                        scope.medicationsNames = 
                            scope.selectedMedications.map(function(obj) {
                                return obj.name;
                            });

                        // Populate widgets with common lists ("...Names")
                        html = '<div>';
                        html += widgets.makeAttributePillsOnlyData({
                            currentModificationType: vizObject
                                .currentModificationType,
                            modificationTypes: vizObject
                                .getModificationTypes()
                        });
                        html += widgets.makeAttributePillsContents({
                            list: vizObject
                                .currentAttributeType + "Names",
                            currentNode: currentNode,
                            currentAttributeType: vizObject
                                .currentAttributeType,
                            attributeTypes: vizObject
                                .getAttributeTypes(),
                            currentModificationType: vizObject
                                .currentModificationType,
                            modificationTypes: vizObject
                                .getModificationTypes()
                        });
                        html += '</div>';
                    } else {
                        html = "<span></span>";
                    }
                // No specific options to be displayed;
                // Describe possible actions
                } else {
                    html = '<span>Pode <b>Maximizar</b> ( <img src="images/controls/black/maximize.svg" class="custom-btn-svg"> ) uma vista para configurar os atributos visíveis.</span>';
                }
            
                updateActionPanel(html);
            };

            scope.chooseAddSpiral = function(button) {
                scope.chooseSpiralAttribute('addSpiral', button);
            };

            scope.addSpiral = function(button) {
                scope.APIPanes.addSpiral(button);
            };

            scope.addSpiralRoutine = function(button) {
                scope.APIPanes.addSpiralRoutine(button);
            };

            scope.removeSpiralRoutine = function(button) {
                scope.APIPanes.removeSpiralRoutine(button);
            };

            // Populate API
            scope.APIActionPanel.makeTODOActionPanel = scope.makeTODOActionPanel;
            scope.APIActionPanel.cancelSplit = scope.cancelSplit;
            scope.APIActionPanel.makeViewChooser = scope.makeViewChooser;
            scope.APIActionPanel.chooseSpiralAttribute =
                scope.chooseSpiralAttribute;
            scope.APIActionPanel.makeDefaultActions =
                scope.makeDefaultActions;
            scope.APIActionPanel.chooseSpiralToJoin =
                scope.chooseSpiralToJoin;
        } //link
    }; //return
}]);

moduleLayout.directive("directivePanes",
        ['$compile', 'widgets', 'nodes', 'patientData', 'visualizations',
        'HeatMapVisualization', 'SpiralVisualization', 'TimelineVisualization',
        function($compile, widgets, nodes, patientData, visualizations,
            HeatMapVisualization, SpiralVisualization, TimelineVisualization) {
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
                        orientation + '="5px">' +
                    '</div>';
            }

            function makeSplitPane(orientation, node1, node2) {
                return '<div data-split-pane>' +
                        makeSplitComponent(orientation, node1) +
                        makeSplitDivider(orientation) +
                        makeSplitComponent(orientation, node2) +
                    '</div>';
            }

            function makeSplitInner(id) {
                var node = nodes.getRootNode().first(function(node1) {
                    return node1.model.id === id;
                });

                // Create initial elements for visualization
                var visualization = '';
                if (node.model.vizType !== scope.vizType.NONE) {
                    visualization = '<div id=' + id + '>';
                    var descriptionHTML = "";
                    if (node.model.vizType === scope.vizType.HEATMAP) {
                        descriptionHTML = HeatMapVisualization.prototype
                            .makeDescription(node.model.id);
                    } else if (node.model.vizType === scope.vizType.SPIRAL) {
                        descriptionHTML = SpiralVisualization.prototype
                            .makeDescription(node.model.id);
                    } else if (node.model.vizType === scope.vizType.TIMELINE) {
                        descriptionHTML = TimelineVisualization.prototype
                            .makeDescription(node.model.id);
                    }
                    visualization += descriptionHTML; 
                    visualization += '</div>'; 
                }

                var viewportButton = '';
                if (!node.isRoot()) {
                    if (nodes.getCurrentNode().model.id === id) {
                        viewportButton = widgets.makeImgButton({
                            id:     id,
                            method: "paneColapse()",
                            title:  "Colapsar Vista",
                            img:    "images/controls/black/colapse.svg"
                        });
                    } else {
                        viewportButton = widgets.makeImgButton({
                            id:     id,
                            method: "paneMaximize($event)",
                            title:  "Maximizar Vista",
                            img:    "images/controls/black/maximize.svg"
                        });
                    }
                }

                return '<div class="pretty-split-pane-component-inner">' +
                    '<div style="display: block">' + 
                    viewportButton +
                    widgets.makeImgButton({
                        id:     id,
                        method: "paneSplitVertical($event)",
                        title:  "Separar na Vertical",
                        img:    "images/controls/black/split-vertical.svg"
                    }) +
                    widgets.makeImgButton({
                        id:     id,
                        method: "paneSplitHorizontal($event)",
                        title:  "Separar na Horizontal",
                        img:    "images/controls/black/split-horizontal.svg"
                    }) +
                    widgets.makeImgButton({
                        id:     id,
                        method: "paneRemove($event)",
                        title:  "Remover Vista",
                        img:    "images/controls/black/remove.svg"
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

            function extractPropertiesFromElement(element) {
                // Make sure we are targeting the element, not 
                // one of it's children
                var target = angular.element(element.target);
                var nodeID = target.data('node-id');
                if (nodeID === undefined) {
                    target = target.parent();
                    nodeID = target.data('node-id');
                }

                return {
                    target: target,
                    nodeID: nodeID,
                    vizID: target.data('id'),
                    isCheckable: target.data('checkable')
                };
            }

            // Redraw visualizations
            scope.updateFromSelections = function(state) {
                var node = nodes.getCurrentNode();
                var viz = nodes.getVizByIDs(
                    node.model.id, node.model.currentVizID);
                var vizObject = viz.vizObject;

                vizObject.update(node.model.id, node.model.currentVizID, state);

                // Compile tooltips
                // NOTE: We don't need to inherit scope
                if (node.model.vizType === scope.vizType.TIMELINE) {
                    var target = angular.element('#graph-title-tooltip');
                    $compile(target)(scope.$new(true));
                }
            };

            // Select the bin size for a visualization's dataset
            scope.setBinning = function(button, binning) {
                var elementProperties = extractPropertiesFromElement(button);

                // Update node properties
                var node = nodes.getRootNode().first(function (node1) {
                    return node1.model.id === elementProperties.nodeID;
                });
                node.model.currentVizID = elementProperties.vizID;

                scope.updateFromSelections({
                    binning: binning
                });
            };

            scope.joinSpiral = function(button) {
                var elementProperties = extractPropertiesFromElement(button);

                // Update node properties
                var node = nodes.getRootNode().first(function (node1) {
                    return node1.model.id === elementProperties.nodeID;
                });
                node.model.currentVizID = elementProperties.vizID;

                scope.APIActionPanel.chooseSpiralToJoin();
            };

            scope.chooseAddSpiral = function(button) {
                scope.APIActionPanel.chooseSpiralAttribute('addSpiral', button);
            };

            scope.addSpiralRoutine = function(id) {
                nodes.updateViz({
                    nodeID: id,
                    vizID: SpiralVisualization.prototype.makeID(),
                    currentMedication: scope.currentMedication.name,
                    skipCreation: false
                });
            };

            scope.addSpiral = function(button) {
                var id = angular.element(button.target).data('id');
                scope.addSpiralRoutine(id);

                // Maximize view in order for added visualizations to be seen
                scope.paneMaximize(button);
            };

            scope.removeSpiralRoutine = function(elementProperties) {
                // Remove d3 nodes/handlers
                var viz = nodes.getVizByIDs(
                    elementProperties.nodeID,
                    elementProperties.vizID
                );
                var vizObject = viz.vizObject;
                vizObject.remove(
                    elementProperties.nodeID,
                    elementProperties.vizID
                );

                // Remove DOM
                angular.element('#' + elementProperties.vizID).remove();

                // Untrack in node visualizations
                nodes.removeViz({
                    nodeID: elementProperties.nodeID,
                    vizID: elementProperties.vizID,
                    skipCreation: true
                });

                scope.APIActionPanel.makeDefaultActions();
            };

            scope.removeSpiral = function(button) {
                var elementProperties = extractPropertiesFromElement(button);
                scope.removeSpiralRoutine(elementProperties);
            };

            scope.togglePinned = function(button) {
                var elementProperties = extractPropertiesFromElement(button);

                // We have the right element, now we test it
                if (elementProperties.isCheckable) {
                    var nodeID = elementProperties.nodeID;
                    var vizID = elementProperties.vizID;

                    // Update node properties
                    var node = nodes.getRootNode().first(function (node1) {
                        return node1.model.id === nodeID;
                    });
                    node.model.currentVizID = vizID;

                    // Update visualization properties
                    var viz = nodes.getVizByIDs(nodeID, vizID);
                    viz.isChecked = !viz.isChecked;

                    // Update DOM
                    var img = "";
                    var imgChecked = "";
                    var html = "";
                    var target = elementProperties.target;
                    if (viz.isChecked) {
                        target.addClass('custom-btn-checked');
                        img = "images/controls/pin.svg";
                        imgChecked = "images/controls/checked.svg";
                        html = '<img src="' + img + '" ' +
                                'data-id="' + vizID + '" ' +
                                'class="custom-btn-svg"> ' +
                            '<img src="' + imgChecked + '" ' +
                                'data-id="' + vizID + '" ' +
                                'class="custom-btn-svg custom-btn-svg-checked"> ';
                    } else {
                        target.removeClass('custom-btn-checked');
                        img = "images/controls/black/pin.svg";
                        html = '<img src="' + img + '" ' +
                                'data-id="' + vizID + '" ' +
                                'class="custom-btn-svg"> ';
                    }

                    target.html($compile(html)(scope));
                }
            };

            scope.togglePinnedSpiral = function(button) {
                // FIXME
                scope.togglePinned(button);
            };

            var makeSpirals = function(node) {
                var id = node.model.id;
                var spirals = node.model.vizs;
                if ((!node.model.skipCreation) && (spirals.length === 0)) {
                    var vizID = SpiralVisualization.prototype.makeID();
                    nodes.updateViz({
                        nodeID: id,
                        vizID: vizID,
                        currentMedication: scope.currentMedication.name
                    });
                    makeSpiral(id, vizID);
                } else {
                    var isAnyVizChecked = false;
                    for (var i = 0; i < spirals.length; i++) {
                        // Draw all spirals
                        if ((nodes.getCurrentNode().model.id === id) ||
                                // Draw checked spirals
                                (spirals[i].isChecked)) {
                            isAnyVizChecked = true;
                            makeSpiral(id, spirals[i].id);
                        }
                    }

                    if (spirals.length === 0)
                        return;

                    // If no checked visualizations where found, automatically
                    // check the first one
                    if (!isAnyVizChecked) {
                       spirals[0].isChecked = true;
                        makeSpiral(id, spirals[0].id);
                    }
                }
            };

            scope.updateFromSpiralAttribute = function(button) {
                var elementProperties = extractPropertiesFromElement(button);

                // Update node properties
                var node = nodes.getRootNode().first(function (node1) {
                    return node1.model.id === elementProperties.nodeID;
                });
                node.model.currentVizID = elementProperties.vizID;

                scope.APIActionPanel.chooseSpiralAttribute('checkSingle');
            };

            var makeCurrentBinningHTML = function(vizID) {
                return '<div ' +
                        'id="' + vizID + '-current-binning">' +
                    '<span>Agrupamento:</span>' +
                    '<div class="dropdown">' +
                        '<button type="button" href="#" class="btn btn-default dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">' +
                            '<span id="' + vizID+ '-binning"></span>' +
                            '<span class="caret custom-caret-margin"></span>' +
                        '</button>' +
                        '<ul class="dropdown-menu" ' +
                            'id="' + vizID + '-binning-options" ' +
                            'directive-spiral-binning>' +
                        '</ul>' +
                    '</div>' +
                '</div>';
            };

            scope.updateBinningOptions = function(id, vizID, spiralObject) {
                var availableBinnings = spiralObject.extractAvailableBinnings();
                if (availableBinnings.length > 0) {
                    // Label for current binning
                    angular.element('#' + vizID + "-binning")
                        .html(visualizations.translateInterval(
                            spiralObject.binning));

                    // Binning options
                    var binningOptionsHTML = "";
                    for (var i = 0; i < availableBinnings.length; i++) {
                        binningOptionsHTML += '<li>' +
                            '<a href="#" ' +
                                'data-id="' + vizID + '" ' +
                                'data-node-id="' + id + '" ' +
                                'ng-click="setBinning($event, \'' +
                                    availableBinnings[i].bin + '\')">' +
                                availableBinnings[i].label +
                            '</a>' +
                        '</li>';
                    }
                    var binningOptionsTarget = angular.element(
                        '#' + vizID + '-binning-options');
                    binningOptionsTarget.html(
                        $compile(binningOptionsHTML)(scope));
                } else {
                    angular.element('#' + vizID + '-current-binning')
                        .html('');
                }
            };

            scope.updateBinningElements = function() {
                // FIXME: Are selections changed in multi-view layout?
                var node = nodes.getCurrentNode();
                var id = node.model.id;
                var vizID = node.model.currentVizID;
                var viz = nodes.getVizByIDs(id, vizID);
                var spiralObject = viz.vizObject;

                // Binning container
                var currentBinningElement = 
                    angular.element('#' + vizID + '-current-binning');
                currentBinningElement
                    .html(makeCurrentBinningHTML(vizID));

                // Add binning options to target defined previously
                scope.updateBinningOptions(
                    id,
                    vizID,
                    spiralObject);
            };

            // Three step creation: 
            // - first, angular elements we need for d3 to use;
            // - second, d3 elements;
            // - finally, angular elements which use computed data.
            var makeSpiral = function(id, vizID) {
                // If it's the only visualization in the view,
                // consider it checked
                var isChecked = (nodes.getVizs(id).length < 2);

                // Reuse visualization object if it exists
                var viz = nodes.getVizByIDs(id, vizID);
                var spiralObject;
                var isNotCreated = !(viz.vizObject);
                if (isNotCreated) {
                    spiralObject = new SpiralVisualization({
                        medications: scope.selectedMedications,
                        currentMedication: viz.currentMedication
                    });
                } else {
                    isChecked = isChecked || viz.isChecked;
                    spiralObject = viz.vizObject;
                }
                
                var isMaximized = nodes.isMaximized(id);

                // HACK: Due to the maximized view check, we assume all
                // defined handlers for each button will only work for
                // the current view's node
                var buttonsHTML = "";
                if (isMaximized) {
                    buttonsHTML += widgets.makeImgButton({
                        id:     vizID,
                        nodeID: id,
                        method: "updateFromSpiralAttribute($event)",
                        title:  "Substituir atributo",
                        img:    "images/controls/black/config.svg"
                    }) +
                    widgets.makeImgButton({
                        id:     vizID,
                        nodeID: id,
                        method: "joinSpiral($event)",
                        title:  "Juntar Espirais",
                        img:    "images/controls/black/join.svg"
                    }) +
                    widgets.makeImgButton({
                        id:           vizID,
                        nodeID:       id,
                        checkable:    true,
                        method:       "togglePinnedSpiral($event)",
                        title:        "Marcar espiral como visualização principal",
                        img:          (isChecked) ?
                                        "images/controls/pin.svg" :
                                        "images/controls/black/pin.svg",
                        isChecked:    isChecked,
                        clazzChecked: "custom-btn-checked",
                        titleChecked: "Desmarcar espiral como visualização principal",
                        imgChecked:   "images/controls/checked.svg"
                    }) +
                    widgets.makeImgButton({
                        id:     vizID,
                        nodeID: id,
                        method: "removeSpiral($event)",
                        title:  "Remover Espiral",
                        img:    "images/controls/black/remove.svg"
                    });
                }

                var html = '<div ' +
                    'id="' + vizID + '" ' +
                    'data-node-id="' + id + '" ' +
                    'class="viz-spiral">' +
                    '<div class="viz-contents" id="' + vizID + '-contents">' +
                        '<div style="display: block">' + 
                            buttonsHTML +
                        '</div>' +
                        '<div id="' + vizID + '-details">' +
                            '<div id="' + vizID + '-attribute-text" />' +
                            makeCurrentBinningHTML(vizID) +
                            '<div id="' + vizID + '-svg-line-text" />' +
                            '<div id="' + vizID + '-svg-line" />' +
                        '</div>' +
                        '<div class="viz-main" id="' + vizID + '-main">' +
                            '<div id="' + vizID + '-title" />' +
                            '<div id="' + vizID + '-svg-spiral" />' +
                        '</div>' +
                    '</div>' +
                '</div>';

                // TODO: getViz failing to find some id, investigate if
                // we need to clone scope for each spiral
                var targetHTML = $compile(html)(scope);
                var target = angular.element('#' + id);
                target.append(targetHTML);

                // Add d3 elements
                if (isNotCreated) {
                    spiralObject.make(id, vizID);
                } else {
                    spiralObject.remake(id, vizID);
                }

                // Add binning options to target defined previously
                scope.updateBinningOptions(
                    id,
                    vizID,
                    spiralObject);

                // All elements created, now set their visibility
                spiralObject.modifyDetailsVisibility(isMaximized);

                // Save visualization for d3 updates
                nodes.updateViz({
                    nodeID: id,
                    vizID: vizID,
                    currentVizID: vizID,
                    isChecked: isChecked,
                    vizObject: spiralObject
                });
            };

            scope.setSort = function(button, sorting) {
                var elementProperties = extractPropertiesFromElement(button);

                // Update node properties
                var node = nodes.getRootNode().first(function (node1) {
                    return node1.model.id === elementProperties.nodeID;
                });
                node.model.currentVizID = elementProperties.vizID;

                scope.updateFromSelections({
                    sorting: sorting
                });
            };

            var setMatrixType = function(nodeID, vizID, type) {
                var node = nodes.getRootNode().first(function (node1) {
                    return node1.model.id === nodeID;
                });
                var viz = nodes.getVizByIDs(nodeID, node.model.currentVizID);
                viz.vizObject.switchRenderer(nodeID, vizID, type);
            };

            var isMatrixTypeActive = function(nodeID, vizID, type) {
                if (nodes.isMaximized(nodeID)) {
                    var node = nodes.getRootNode().first(function (node1) {
                        return node1.model.id === nodeID;
                    });
                    var viz = nodes.getVizByIDs(nodeID, node.model.currentVizID);
                    return (viz.vizObject.isRendererActive(type)) ?
                        "button-selected" :
                        "";
                } else {
                    return "";
                }
            };

            // Two step creation: 
            // - first, angular elements we need for d3 to use;
            // - then, d3 elements
            var makeHeatMap = function(node) {
                var id = node.model.id;
                // We assume a node will only have one heatmap
                var heatMap = node.model.vizs[0];
                var vizID;
                var vizObject;
                var isNotCreated = !(heatMap);
                if (isNotCreated) {
                    vizID = HeatMapVisualization.prototype.makeID();
                    vizObject = new HeatMapVisualization({
                        diseases: scope.selectedDiseases,
                        medications: scope.selectedMedications
                    });
                } else {
                    vizID = heatMap.id;
                    vizObject = heatMap.vizObject;
                }

                // Switch between pair-wise or many-to-many
                // attribute comparisons
                var matrixSwitcherHTML = '<div>' +
                        '<div style="display: block">' + 
                            '<span>Combinação de atributos:</span>' +
                        '</div>' +
                        '<div class="btn-group" ' +
                                'role="group" aria-label="...">' +
                            '<button type="button" ' +
                                'id="' + vizID + '-type-pairs" ' +
                                'class="btn btn-default" ' +
                                'ng-class="isMatrixTypeActive(\'' + 
                                    id + '\', \'' +
                                    vizID + '\', \'' +
                                    'DIM' + '\')" ' +
                                'ng-click="setMatrixType(\'' + 
                                    id + '\', \'' +
                                    vizID + '\', \'' +
                                    'DIM' + '\')" ' +
                                '>' +
                                'Pares distintos</button>' +
                            '<button type="button" ' +
                                'id="' + vizID + '-type-all" ' +
                                'class="btn btn-default" ' +
                                'ng-class="isMatrixTypeActive(\'' + 
                                    id + '\', \'' +
                                    vizID + '\', \'' +
                                    'SIM' + '\')" ' +
                                'ng-click="setMatrixType(\'' + 
                                    id + '\', \'' +
                                    vizID + '\', \'' +
                                    'SIM' + '\')" ' +
                                '>' +
                                'Todos os pares</button>' +
                        '</div>' +
                    '</div>';

                var sortOptionsHTML = '';
                for (var i = 0; i < vizObject.availableSortings.length; i++) {
                    sortOptionsHTML += '<li>' +
                        '<a href="#" ' +
                            'data-id="' + vizID + '" ' +
                            'data-node-id="' + id + '" ' +
                            'ng-click="setSort($event, \'' +
                                vizObject.availableSortings[i].key + '\')">' +
                            vizObject.availableSortings[i].label +
                        '</a>' +
                    '</li>';
                }
                
                var sortHTML = '<div ' +
                        'id="' + vizID + '-current-sort" ' +
                        'style="margin-left: 2em">' +
                    '<span>Ordenação:</span>' +
                    '<div class="dropdown">' +
                        '<button type="button" href="#" class="btn btn-default dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">' +
                            '<span id="' + vizID+ '-sort"></span>' +
                            '<span class="caret custom-caret-margin"></span>' +
                        '</button>' +
                        '<ul class="dropdown-menu" ' +
                            'id="' + vizID + '-sort-options">' +
                            sortOptionsHTML +
                        '</ul>' +
                    '</div>' +
                '</div>';

                var html = '<div ' +
                        'id="' + vizID + '" ' +
                        'data-node-id="' + id + '">' +
                        '<div style="display: block">' + 
                        '</div>' +
                        '<div id="' + vizID + '-contents">' +
                            '<div style="display: block">' + 
                                '<div id="' + vizID + '-switcher">' +
                                    matrixSwitcherHTML +
                                '</div>' +
                                '<div id="' + vizID + '-sorting">' +
                                    sortHTML +
                                '</div>' +
                            '</div>' +
                            '<div class="viz-main" id="' + vizID + '-main">' +
                                // If more than one matrix is used, it will
                                // be defined here
                                '<div id="' + vizID + '-main-1">' +
                                '</div>' +
                            '</div>' +
                            '<div id="' + vizID + '-details">' +
                            '</div>' +
                        '</div>' +
                    '</div>';

                var targetScope = nodes.scopeCloneWithHandlers(
                    scope,
                    targetScope,
                    [ {
                        name: "isMatrixTypeActive",
                        handler: isMatrixTypeActive
                    }, {
                        name: "setMatrixType",
                        handler: setMatrixType
                    }
                ]);

                var targetHTML = $compile(html)(targetScope);
                var target = angular.element('#' + id);
                target.append(targetHTML);

                // Add d3 elements
                if (isNotCreated) {
                    vizObject.make(id, vizID);
                } else {
                    vizObject.remake(id, vizID);
                }

                // All elements created, now set their visibility
                var isMaximized = nodes.isMaximized(id);
                vizObject.modifyDetailsVisibility(isMaximized);

                // Save visualization for d3 updates
                nodes.updateViz({
                    nodeID: id,
                    vizID: vizID,
                    currentVizID: vizID,
                    vizObject: vizObject,
                    nodeHTML: targetHTML,
                    nodeScope: targetScope
                });
            };

            var setOccurenceType = function(nodeID, vizID, type) {
                var node = nodes.getRootNode().first(function (node1) {
                    return node1.model.id === nodeID;
                });
                var viz = nodes.getVizByIDs(nodeID, node.model.currentVizID);
                viz.vizObject.switchOccurenceType(type);
            };

            var isOccurenceTypeActive = function(nodeID, vizID, type) {
                if (nodes.isMaximized(nodeID)) {
                    var node = nodes.getRootNode().first(function (node1) {
                        return node1.model.id === nodeID;
                    });
                    var viz = nodes.getVizByIDs(nodeID, node.model.currentVizID);
                    return (viz.vizObject.isOccurenceTypeActive(type)) ?
                        "button-selected" :
                        "";
                } else {
                    return "";
                }
            };

            // Two step creation: 
            // - first, angular elements we need for d3 to use;
            // - then, d3 elements
            var makeTimeline = function(node) {
                var id = node.model.id;
                // We assume a node will only have one heatmap
                var timeline = node.model.vizs[0];
                var vizID;
                var vizObject;
                var isNotCreated = !(timeline);
                if (isNotCreated) {
                    vizID = TimelineVisualization.prototype.makeID();
                    vizObject = new TimelineVisualization({
                        diseases: scope.selectedDiseases,
                        medications: scope.selectedMedications
                    });
                } else {
                    vizID = timeline.id;
                    vizObject = timeline.vizObject;
                }

                // Switch between histogram and timelines for
                // occurence comparisons
                var switcherHTML = '<div>' +
                        '<div class="btn-group" ' +
                                'role="group" aria-label="...">' +
                            '<button type="button" ' +
                                'id="' + vizID + '-type-pairs" ' +
                                'class="btn btn-default" ' +
                                'ng-class="isOccurenceTypeActive(\'' + 
                                    id + '\', \'' +
                                    vizID + '\', \'' +
                                    'HISTOGRAM' + '\')" ' +
                                'ng-click="setOccurenceType(\'' + 
                                    id + '\', \'' +
                                    vizID + '\', \'' +
                                    'HISTOGRAM' + '\')" ' +
                                '>' +
                                'Contagem de ocorrências</button>' +
                            '<button type="button" ' +
                                'id="' + vizID + '-type-all" ' +
                                'class="btn btn-default" ' +
                                'ng-class="isOccurenceTypeActive(\'' + 
                                    id + '\', \'' +
                                    vizID + '\', \'' +
                                    'TIMELINE' + '\')" ' +
                                'ng-click="setOccurenceType(\'' + 
                                    id + '\', \'' +
                                    vizID + '\', \'' +
                                    'TIMELINE' + '\')" ' +
                                '>' +
                                'Evolução temporal</button>' +
                        '</div>' +
                    '</div>';

                var html = '<div ' +
                        'id="' + vizID + '" ' +
                        'data-node-id="' + id + '">' +
                        '<div style="display: block">' + 
                        '</div>' +
                        '<div id="' + vizID + '-switcher">' +
                            switcherHTML +
                        '</div>' +
                        '<div id="' + vizID + '-contents">' +
                            // Frequency histogram
                            '<div id="' + vizID + '-details">' +
                            '</div>' +
                            // Small multiple matrix;
                            // Each bin will be appended to this element
                            '<div id="' + vizID + '-contents-vizs">' +
                                '<div class="viz-main viz-inline" id="' + vizID + '-main">' +
                                '</div>' +
                                '<div class="viz-graph viz-inline-top" id="' + vizID + '-graph">' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';

                var targetScope = nodes.scopeCloneWithHandlers(
                    scope,
                    targetScope,
                    [ {
                        name: "isOccurenceTypeActive",
                        handler: isOccurenceTypeActive
                    }, {
                        name: "setOccurenceType",
                        handler: setOccurenceType
                    }
                ]);

                var targetHTML = $compile(html)(targetScope);
                var target = angular.element('#' + id);
                target.append(targetHTML);

                // Add d3 elements
                if (isNotCreated) {
                    vizObject.make(id, vizID);
                } else {
                    vizObject.remake(id, vizID);
                }

                // Compile tooltips
                // NOTE: We don't need to inherit scope
                target = angular.element('#graph-title-tooltip');
                $compile(target)(scope.$new(true));

                // All elements created, now set their visibility
                var isMaximized = nodes.isMaximized(id);
                vizObject.modifyDetailsVisibility(isMaximized);

                // Save visualization for d3 updates
                nodes.updateViz({
                    nodeID: id,
                    vizID: vizID,
                    currentVizID: vizID,
                    vizObject: vizObject,
                    nodeHTML: targetHTML,
                    nodeScope: targetScope
                });
            };

            // Make html node layout
            var currentScope;
            var currentHTML;
            scope.updateLayout = function() {
                // Remove previous scope and DOM elements
                if (currentScope)
                    currentScope.$destroy();
                if (currentHTML)
                    currentHTML.remove();

                // No nodes available: make first view functionality
                if (nodes.getCurrentNode() === undefined) {
                    // There may be a previous view: make empty layout
                    currentScope = scope.$new();
                    currentHTML = $compile('')(currentScope);
                    element.html(currentHTML);

                    scope.APIActionPanel.makeViewChooser();
                } else {
                    // Make views
                    currentScope = scope.$new();
                    currentHTML = $compile(
                        makeChildrenLayout(nodes.getCurrentNode())
                    )(currentScope);
                    element.html(currentHTML);

                    // Insert visualizations into generated views
                    nodes.getCurrentNode().walk(function(node) {
                        if (node.model.vizType ===
                                scope.vizType.HEATMAP) {
                            makeHeatMap(node);
                        } else if (node.model.vizType ===
                                scope.vizType.SPIRAL) {
                            makeSpirals(node);
                        } else if (node.model.vizType ===
                                scope.vizType.TIMELINE) {
                            makeTimeline(node);
                        }
                    });

                    scope.APIActionPanel.makeDefaultActions();

                    //nodes.treePrint();
                }
            };

            scope.newLayout = function() {
                // Clean all nodes
                nodes.getRootNode().walk(function(node) {
                    nodes.detachNode(node);
                });

                // Nuke our tracked nodes, since a
                // new layout will be created in the next update
                nodes.setRootNode(undefined);
                nodes.setCurrentNode(undefined);
                
                scope.updateLayout();
            };

            scope.paneRemove = function(button) {
                var id = angular.element(button.target).data('id');
                var node = nodes.getRootNode().first(function (node1) {
                    return node1.model.id === id;
                });

                // Colapse the view if it is maximized
                if (nodes.isMaximized(id)) {
                    nodes.setCurrentNode(nodes.getRootNode());
                }

                // Cancel any pending splits
                scope.APIActionPanel.cancelSplit();

                nodes.detachNode(node);

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
                        nodes.setRootNode(nodes.makeNode(otherChildNode.model));
                        nodes.setCurrentNode(nodes.getRootNode());
                    } else {
                        // Grandparent also needs to update it's child references
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

                    nodes.detachNode(otherChildNode);

                    scope.updateLayout();
                } else {
                    // TODO: Call each visualization's remove()
                    scope.newLayout();
                }
            };

            // Generate a single view layout from the current node
            scope.paneMaximize = function(button) {
                var id = angular.element(button.target).data('id');
                var node = nodes.getRootNode().first(function (node1) {
                    return node1.model.id === id;
                });

                nodes.setCurrentNode(node);

                scope.updateLayout();
            };

            // Generate a multiple view layout from the root node
            scope.paneColapse = function() {
                nodes.setCurrentNode(nodes.getRootNode());

                scope.updateLayout();
            };

            scope.paneSplitVertical = function(button) {
                var buttonID = angular.element(button.target).data('id');
                scope.nodeToSplit = {
                    id: buttonID,
                    split: scope.splitType.VERTICAL
                };

                if (nodes.getCurrentNode().model.id !==
                        nodes.getRootNode().model.id) {
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

                if (nodes.getCurrentNode().model.id !==
                        nodes.getRootNode().model.id) {
                    scope.paneColapse();
                }
                scope.APIActionPanel.makeViewChooser();
            };

            scope.makePaneSplit = function(vizType) {
                // First view of the layout
                if (nodes.getRootNode() === undefined) {
                    nodes.setRootNode(nodes.makeNode({
                        id: "view-" + uuid.v1(),
                        level: 0,
                        splitType: scope.splitType.NONE,
                        vizType: vizType,
                        vizs: [],
                        currentVizID: undefined,
                        skipCreation: false,
                        children: []
                    }));
                } else {
                    if (scope.nodeToSplit !== undefined) {
                        var node = nodes.getRootNode().first(function (node1) {
                            return node1.model.id === scope.nodeToSplit.id;
                        });

                        node.addChild(nodes.makeNode({
                            id: "view-" + uuid.v1(),
                            level: node.model.level + 1,
                            splitType: scope.splitType.NONE,
                            vizType: node.model.vizType,
                            vizs: node.model.vizs,
                            currentVizID: node.model.currentVizID,
                            skipCreation: true,
                            children: []
                        }));
                        node.addChild(nodes.makeNode({
                            id: "view-" + uuid.v1(),
                            level: node.model.level + 1,
                            splitType: scope.splitType.NONE,
                            vizType: vizType,
                            vizs: [],
                            currentVizID: undefined,
                            skipCreation: false,
                            children: []
                        }));

                        nodes.detachNode(node);

                        // Update child properties
                        // TODO: vizs need to update nodeID

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
            scope.APIPanes.newLayout = scope.newLayout;
            scope.APIPanes.updateFromSelections = scope.updateFromSelections;
            scope.APIPanes.updateBinningElements = scope.updateBinningElements;
            scope.APIPanes.updateBinningOptions = scope.updateBinningOptions;
            scope.APIPanes.addSpiral = scope.addSpiral;
            scope.APIPanes.addSpiralRoutine = scope.addSpiralRoutine;
            scope.APIPanes.removeSpiralRoutine = scope.removeSpiralRoutine;

            // Initialize
            scope.updateLayout();
        } //link
    }; //return
}]);

angular.module("moduleCombined", ["moduleProviders", "moduleLayout", "moduleSplits"]);

// Tests to automate some user behaviour.
//
// TODO: These should be made properly with the following tools:
// - Independent browser launches (e.g. Karma)
// - Unit tests (e.g. Mocha)
//
// FIXME: Wait for elements instead of using delays:
// angular.element(document).ready(function() {
//     ...
// });
//
// Compiling scope before invoking element handlers:
// https://docs.angularjs.org/api/ng/function/angular.injector
//
// $compile($document)($rootScope);
// $rootScope.$digest();
// element.triggerHandler('click');
//
// Running a test with template separate from this module:
// http://stackoverflow.com/questions/28854303/using-compile-on-external-template-templateurl-in-angular-directive
var testSpirals = function() {
    var injector = angular.injector(['ng', 'moduleCombined']);
    injector.invoke(function($rootScope, $compile, $timeout, utils) {
        var delay = 200;
        utils.resolveEvents([ 
            function() {
                return $timeout(function() {
                    var target = angular.element('#action-panel');
                    var child = target.children()[2];
                    var elChild = angular.element(child);
                    var scope = elChild.scope();
                    scope.chooseSpiralAttribute('chooseSpiral');
                });
            },
            function() {
                return $timeout(function() {
                    var target = angular.element('.patient-table');
                    var child = target.children()[0];
                    var elChild = angular.element(child);
                    var scope = elChild.scope();
                    scope.callWithSavedAttribute(
                        'chooseSpiral',
                        scope.callBackArguments,
                        scope.attribute
                    );
                }, delay);
            },
            function() {
                return $timeout(function() {
                    var target = angular.element('#action-panel').find('button');
                    var scope = target.scope();
                    // HACK: Workaround Angular's check:
                    // "Referencing DOM nodes 
                    // in Angular expressions is disallowed!"
                    scope.chooseAddSpiral({target: target});
                }, delay);
            },
            function() {
                return $timeout(function() {
                    var target = angular.element('.patient-table');
                    var child = target.children()[1];
                    var elChild = angular.element(child);
                    var scope = elChild.scope();
                    scope.callWithSavedAttribute(
                        'addSpiral',
                        scope.callBackArguments,
                        scope.attribute
                    );
                }, delay);
            }
        ]);
    });
};
var testHeatmap = function() {
    var injector = angular.injector(['ng', 'moduleCombined']);
    injector.invoke(function($rootScope, $compile, $timeout, utils) {
        var delay = 200;
        utils.resolveEvents([ 
            function() {
                return $timeout(function() {
                    var target = angular.element('#action-panel');
                    var child = target.children()[1];
                    var elChild = angular.element(child);
                    var scope = elChild.scope();
                    scope.chooseHeatmap();
                });
            },
            function() {
                return $timeout(function() {
                    angular.element('#heatmap-1-type-pairs')
                        .triggerHandler('click');
                }, delay);
            },
            function() {
                return $timeout(function() {
                    angular.element('#btnDisplayFilters')
                        .triggerHandler('click');
                }, delay);
            }
        ]);
    });
};
var testTimeline = function() {
    var injector = angular.injector(['ng', 'moduleCombined']);
    injector.invoke(function($rootScope, $compile, $timeout, utils) {
        var delay = 200;
        utils.resolveEvents([ 
            function() {
                return $timeout(function() {
                    var target = angular.element('#action-panel');
                    var child = target.children()[3];
                    var elChild = angular.element(child);
                    var scope = elChild.scope();
                    scope.chooseTimeline();
                });
            }
        ]);
    });
};
//testSpirals();
//testHeatmap();
//testTimeline();
