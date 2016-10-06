# Architecture

### Modules
See graph.

### Visualizations
Holds common functionality used by each specific visualization.

### Layout
We use two controllers: One for the top main panel, another for layout directives. Children directives sometimes need to call each others functions. Since we can't rely on the parent-child hierarchy to call these functions, I created an object in the controller which holds all the functions of a given directive to be shared. These objects are prefixed with "API" and the name of the directive. This way, directive's scope doesn't creep to the controller except what we want to share.

# Documentation
Complex methods or objects are documented with JSDoc

# Notes
Follows ECMAScript version 6
