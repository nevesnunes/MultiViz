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
    $scope.treeRoot = (new TreeModel()).parse({
        id: uuid.v1(),
        split: $scope.splitType.NONE,
        children: []
    });
}]);

moduleLayout.directive("directivePanes", function($compile, $timeout){
	return { 
        scope: true,
        link: function(scope, element, attrs){
            function makeSplitInner(id) {
                return '<div class="pretty-split-pane-component-inner"><p>' + id + '</p>' +
                    '<button class="btn btn-primary" ng-click="paneMaximize()">Maximizar Vista</button>' +
                    '<button class="btn btn-primary" ng-click="paneSplitVertical()">Separar na Vertical</button>' +
                    '<button class="btn btn-primary" ng-click="paneSplitHorizontal()">Separar na Horizontal</button>' +
                    '</div>';
            }

            var layout = "";
            var treeRootNode = scope.treeRoot.first(function(node) {
                return node.isRoot();
            });

            if (treeRootNode.hasChildren()) {
                // walk
            } else {
                layout += makeSplitInner(treeRootNode.model.id);
            }

            element.append($compile(
                layout
            )(scope));
        } //link
    }; //return
});

var moduleSplits = angular.module('module-splits', ['shagstrom.angular-split-pane']);

angular.module("moduleCombined", ["module-layout", "module-splits"]);
