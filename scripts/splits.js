var moduleLayout = angular.module('module-layout',[]);

moduleLayout.controller('controllerPanes', ['$scope', function($scope){
    // Split type is encoded in an enum
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
}]);

moduleLayout.directive("directivePanes", function($compile, $timeout){
	return { 
        scope: true,
        link: function(scope, element, attrs) {
            function makeSplitPane(orientation, node1, node2) {
                return '<div class="pretty-split-pane-frame">' +
			        '<div data-split-pane>' +
                    makeSplitComponent(orientation, node1) +
                    makeSplitDivider(orientation) +
                    makeSplitComponent(orientation, node2) +
                    '</div>' +
                    '</div>';
            }

            function makeSplitComponent(orientation, node) {
                var html = '<div data-split-pane-component data-' + orientation + '="50%">';
                if (node.hasChildren()) {
                    // walk
                    console.log("child hasChildren");
                    var orientation = (node.model.split === scope.splitType.VERTICAL) ? "height" : "width";

                    // FIXME: Hardcoded to 2 childs
                    html += makeSplitPane(orientation, node.children[0], node.children[1]);
                } else {
                    html += makeSplitInner(node.model.id);
                }
                html += '</div>';

                return html;
            }

            function makeSplitDivider(orientation) {
				return '<div data-split-pane-divider data-' + orientation + '="5px"></div>';
            }

            function makeSplitInner(id) {
                return '<div class="pretty-split-pane-component-inner"><p>' + id + '</p>' +
                    '<button class="btn btn-primary" data-id=' + id + ' ng-click="paneRemove($event)">Remover Vista</button>' +
                    '<button class="btn btn-primary" data-id=' + id + ' ng-click="paneMaximize($event)">Maximizar Vista</button>' +
                    '<button class="btn btn-primary" data-id=' + id + ' ng-click="paneSplitVertical($event)">Separar na Vertical</button>' +
                    '<button class="btn btn-primary" data-id=' + id + ' ng-click="paneSplitHorizontal($event)">Separar na Horizontal</button>' +
                    '</div>';
            }

            scope.updateLayout = function() {
                var layout = "";
                var treeRootNode = scope.treeRoot.first(function(node) {
                    return node.isRoot();
                });

                if (treeRootNode.hasChildren()) {
                    // walk
                    console.log("root hasChildren");
                    var orientation = (treeRootNode.model.split === scope.splitType.VERTICAL) ? "height" : "width";

                    // FIXME: Hardcoded to 2 childs
                    layout += makeSplitPane(orientation, treeRootNode.children[0], treeRootNode.children[1]);
                } else {
                    layout += makeSplitInner(treeRootNode.model.id);
                }

                element.html(
                    $compile(layout)(scope));
            };

            scope.paneRemove = function(button) {
                console.log("Removing " + treeRootNode.model.id);
            };

            scope.paneMaximize = function(button) {
                console.log("Maximizing " + treeRootNode.model.id);
            };

            scope.paneSplitVertical = function(button) {
                var id = angular.element(button.target).data('id');
                var node = scope.treeRoot.first(function (node1) {
                    return node1.model.id === id;
                });

                console.log("Splitting in Vertical " + node.model.id);
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

                console.log("Splitting in Horizontal " + node.model.id);
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

            scope.updateLayout();

            /*
            scope.$watch(attrs.directivePanes, function(value) {
                    alert("something happened");
                element.html(
                    $compile(layout)(scope));
            });
            */
        } //link
    }; //return
});

var moduleSplits = angular.module('module-splits', ['shagstrom.angular-split-pane']);

angular.module("moduleCombined", ["module-layout", "module-splits"]);
