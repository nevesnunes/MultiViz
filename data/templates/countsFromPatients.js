var _node_fs = require('fs');

var generator = (function() {
    var patients =
        JSON.parse(_node_fs.readFileSync(
            __dirname + "/../patients.json", "utf8"));
	var iterations;

	var attributeElements = (function() {
		var elementIndexOf = function(elements, element, property) {
			for (var i = 0, len = elements.length; i < len; i++) {
				if (elements[i][property] === element)
					return i;
			}
			return -1;
		};

        var processArray = function(arrayObject) {
            var array = arrayObject.array;
            for (i = 0; i < array.length; i++) {
                elementIndex = elementIndexOf(
                        elements,
                        array[i].name,
                        "name");
                if (elementIndex === -1) {
                    elements.push({
                        type: arrayObject.id,
                        name: array[i].name,
                        incidences: 1,
                        patientIDs: [patients[patientsIndex].id]
                    });
                } else {
                    if (elements[elementIndex].patientIDs.indexOf(
                            patients[patientsIndex].id) === -1) {
                        elements[elementIndex].incidences += 1;
                        elements[elementIndex].patientIDs.push(
                            patients[patientsIndex].id);
                    }
                }
            }
        };
		var elements = [];
        var i, patientsIndex, elementIndex;
		for (patientsIndex = 0;
                patientsIndex < patients.length;
                patientsIndex++) {
            var arraysToIterate = [
                { array: patients[patientsIndex].diseases, id: 'disease' },
                { array: patients[patientsIndex].medications, id: 'medication' }
            ];

            arraysToIterate.forEach(processArray);
        }

        iterations = elements.length;

		return elements;
	})();

	var canMakeInstance = function() {
		return attributeElements.length > 0;
	};

	var makeInstance = function() {
		return attributeElements.pop();
	};

	return {
		canMakeInstance: canMakeInstance,
		makeInstance: makeInstance,
		iterations: iterations
	};
})();

// Generate data
var data = [];
while (generator.canMakeInstance()) {
    data.push(generator.makeInstance());
}

// Output data
var jsonData = JSON.stringify(data, null, 4);
var filename = __dirname + "/../counts.json";
_node_fs.writeFile(filename, jsonData, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("Saved " + filename);
}); 
