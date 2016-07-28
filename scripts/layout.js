var moduleIndex = angular.module('moduleIndex');
var moduleLayout = angular.module('moduleLayout',['moduleIndex']);

moduleLayout.controller('controllerPanes', ['$scope', function($scope){
    $scope.splitType = Object.freeze({
        NONE: "NONE",
        VERTICAL: "VERTICAL",
        HORIZONTAL: "HORIZONTAL"
    });

    // We will save our layout in a tree.
    // It is initialized with a single view.
    $scope.treeModel = new TreeModel();
    $scope.treeRoot = $scope.treeModel.parse({
        id: uuid.v1(),
        split: $scope.splitType.NONE,
        children: []
    });
    $scope.currentNode = $scope.treeRoot;
}]);

moduleLayout.directive("directivePanes", function($compile, $timeout){
	return { 
        scope: true,
        link: function(scope, element, attrs) {
            function makeSplitPane(orientation, node1, node2) {
                return '<div data-split-pane>' +
                    makeSplitComponent(orientation, node1) +
                    makeSplitDivider(orientation) +
                    makeSplitComponent(orientation, node2) +
                    '</div>';
            }

            function makeSplitComponent(orientation, node) {
                return '<div data-split-pane-component data-' + orientation + '="50%">' +
                makeChildrenLayout(node) +
                '</div>';
            }

            function makeSplitDivider(orientation) {
				return '<div data-split-pane-divider data-' + orientation + '="5px"></div>';
            }

            function makeSplitInner(id) {
                var node = scope.treeRoot.first(function (node1) {
                    return node1.model.id === id;
                });
                var viewportButton = '';
                if (!node.isRoot()) {
                    if (scope.currentNode.model.id === id) {
                        viewportButton = '<button class="btn btn-primary" data-id=' + id + ' ng-click="paneColapse($event)">Colapsar Vista</button>';
                    } else {
                        viewportButton = '<button class="btn btn-primary" data-id=' + id + ' ng-click="paneMaximize($event)">Maximizar Vista</button>';
                    }
                }

                return '<div class="pretty-split-pane-component-inner"><p>' + id + '</p>' +
                    '<button class="btn btn-primary" data-id=' + id + ' ng-click="paneRemove($event)">Remover Vista</button>' +
                    viewportButton +
                    '<button class="btn btn-primary" data-id=' + id + ' ng-click="paneSplitVertical($event)">Separar na Vertical</button>' +
                    '<button class="btn btn-primary" data-id=' + id + ' ng-click="paneSplitHorizontal($event)">Separar na Horizontal</button>' +
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

            scope.updateLayout = function() {
                element.html($compile(
                    makeChildrenLayout(scope.currentNode)
                )(scope));
            };

            scope.paneRemove = function(button) {
                var id = angular.element(button.target).data('id');
                var node = scope.treeRoot.first(function (node1) {
                    return node1.model.id === id;
                });

                var parentNode = node.parent;
                if (parentNode !== undefined) {
                    console.log("[INFO] Removing " + node.model.id);
                    var otherChildNode = (parentNode.children[0].model.id === id) ? parentNode.children[1] : parentNode.children[0];

                    // Copy relevant child properties
                    if (parentNode.isRoot()) {
                        scope.treeRoot = scope.treeModel.parse({
                            id: otherChildNode.model.id,
                            split: otherChildNode.model.split,
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

                    scope.updateLayout();
                }
            };

            scope.paneMaximize = function(button) {
                var id = angular.element(button.target).data('id');
                var node = scope.treeRoot.first(function (node1) {
                    return node1.model.id === id;
                });
                scope.currentNode = node;

                scope.updateLayout();
            };

            scope.paneColapse = function(button) {
                scope.currentNode = scope.treeRoot;

                scope.updateLayout();
            };

            scope.paneSplitVertical = function(button) {
                var id = angular.element(button.target).data('id');
                var node = scope.treeRoot.first(function (node1) {
                    return node1.model.id === id;
                });

                console.log("[INFO] Splitting in Vertical " + node.model.id);
                node.model.split = scope.splitType.VERTICAL;
                node.addChild(
                    scope.treeModel.parse({
                        id: uuid.v1(),
                        split: scope.splitType.NONE,
                        children: []
                    }));
                node.addChild(
                    scope.treeModel.parse({
                        id: uuid.v1(),
                        split: scope.splitType.NONE,
                        children: []
                    }));

                scope.updateLayout();
            };

            scope.paneSplitHorizontal = function(button) {
                var id = angular.element(button.target).data('id');
                var node = scope.treeRoot.first(function (node1) {
                    return node1.model.id === id;
                });

                console.log("[INFO] Splitting in Horizontal " + node.model.id);
                node.model.split = scope.splitType.HORIZONTAL;
                node.addChild(
                    scope.treeModel.parse({
                        id: uuid.v1(),
                        split: scope.splitType.NONE,
                        children: []
                    }));
                node.addChild(
                    scope.treeModel.parse({
                        id: uuid.v1(),
                        split: scope.splitType.NONE,
                        children: []
                    }));

                scope.updateLayout();
            };

            // Make initial layout
            scope.updateLayout();
        } //link
    }; //return
});

var moduleSplits = angular.module('moduleSplits', ['shagstrom.angular-split-pane']);

angular.module("moduleCombined", ["moduleIndex", "moduleLayout", "moduleSplits"]);
