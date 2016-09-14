# Architecture
Our layout is composed by a controller with children directives that need to call each others functions. Since we can't rely on the parent-child hierarchy to call these functions, I created an object in the controller which holds all the functions of a given directive to be shared. These objects are prefixed with "API" and the name of the directive. This way, directive's scope doesn't creep to the controller except what we want to share.

# Notes
Follows ECMAScript version 6
Complex objects are documented with JSDoc
