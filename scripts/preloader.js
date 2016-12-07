// Preload images
//
// FIXME: This is too ad-hoc and detached from actual image use, a more
// integrated approach should be studied:
//
// https://github.com/RevillWeb/angular-preload-image/blob/master/angular-preload-image.js
//
// FIXME: At least get all files programatically...
(function() {
    var images = [
        "images/controls/add.svg",
        "images/controls/black/add.svg",
        "images/controls/black/colapse.svg",
        "images/controls/black/maximize.svg",
        "images/controls/black/remove.svg",
        "images/controls/black/split-horizontal.svg",
        "images/controls/black/split-vertical.svg",
        "images/controls/colapse.svg",
        "images/controls/drag.svg",
        "images/controls/join.svg",
        "images/controls/info.svg",
        "images/controls/maximize.svg",
        "images/controls/pin-checked.svg",
        "images/controls/pin.svg",
        "images/controls/remove.svg",
        "images/controls/split-horizontal.svg",
        "images/controls/split-vertical.svg",
        "images/views/circular.svg",
        "images/views/circulartime.svg",
        "images/views/heatmap.svg"
    ];
    for (i = 0; i < images.length; i++) {
        (new Image()).src = images[i];
    }
})();
