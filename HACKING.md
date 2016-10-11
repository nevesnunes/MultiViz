# Architecture

### Modules
See graph.

We create all needed elements with Angular. d3.js job's is just to fill it with visualization svgs and dynamic property values related to the specific visualization. This way, we define the DOM layout all at once in the same place.

### Layout
We use two controllers: One for the top main panel, another for layout directives. Children directives sometimes need to call each others functions. Since we can't rely on the parent-child hierarchy to call these functions, I created an object in the controller which holds all the functions of a given directive to be shared. These objects are prefixed with "API" and the name of the directive. This way, directive's scope doesn't creep to the controller except what we want to share.

### Visualizations
Holds common functionality used by each specific visualization.

Each visualization's public interface (used by layout directives) consists of the following methods:
- make()
- update()

# Documentation
Complex methods or objects are documented with JSDoc

# Notes
- ECMAScript version 6
- Angular 1
