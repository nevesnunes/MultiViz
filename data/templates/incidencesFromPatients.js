/* jshint node: true */

var _node_fs = require('fs');

var generator = (function() {
    var patients =
        JSON.parse(_node_fs.readFileSync(
            __dirname + "/../patients.json", "utf8"));
	var iterations;

	var attributePairs = (function() {
		var pairIndexOf = function(pairs, pair, property) {
			for (var i = 0, len = pairs.length; i < len; i++) {
				if ((pairs[i][property][0] === pair[0]) &&
						(pairs[i][property][1] === pair[1]))
					return i;
			}
			return -1;
		};

		// Create pairs with all combinations of different attributes
        var processPairOfArrays = function(pairOfArrays) {
            var array1 = pairOfArrays[0].array;
            var array1ID = pairOfArrays[0].id;
            var array2 = pairOfArrays[1].array;
            var array2ID = pairOfArrays[1].id;
            for (i = 0; i < array1.length; i++) {
                for (j = 0; j < array2.length; j++) {
                    if (array1[i].name === array2[j].name)
                        continue;

                    // Also check if complementary pair exists
                    // before pushing a new pair
                    pairIndex = pairIndexOf(
                            pairs,
                            [array2[j].name, array1[i].name],
                            "id");
                    if (pairIndex === -1) {
                        pairIndex = pairIndexOf(
                                pairs,
                                [array1[i].name, array2[j].name],
                                "id");
                    }
                    if (pairIndex === -1) {
                        pairs.push({
                            id: [array1[i].name, array2[j].name],
                            incidences: 1,
                            patientIDs: [patients[patientsIndex].id],
                            first: { type: array1ID, name: array1[i].name },
                            second: { type: array2ID, name: array2[j].name }
                        });
                    } else {
                        if (pairs[pairIndex].patientIDs.indexOf(
                                patients[patientsIndex].id) === -1) {
                            pairs[pairIndex].incidences += 1;
                            pairs[pairIndex].patientIDs.push(
                                patients[patientsIndex].id);
                        }
                    }
                }
            }
        };
		var pairs = [];
        var i, j, patientsIndex, pairIndex;
		for (patientsIndex = 0;
                patientsIndex < patients.length;
                patientsIndex++) {
            var diseases = patients[patientsIndex].diseases;
            var medications = patients[patientsIndex].medications;
            var arraysToIterate = [
                [
                    { array: diseases, id: 'disease' },
                    { array: diseases, id: 'disease' }
                ],
                [
                    { array: medications, id: 'medication' },
                    { array: medications, id: 'medication' }
                ],
                [
                    { array: diseases, id: 'disease' },
                    { array: medications, id: 'medication' }
                ],
            ];

            arraysToIterate.forEach(processPairOfArrays);
        }

        iterations = pairs.length;

		return pairs;
	})();

	var canMakeInstance = function() {
		return attributePairs.length > 0;
	};

	var makeInstance = function() {
		var pair = attributePairs.pop();

		return {
			incidences: pair.patientIDs.length,
            patientIDs: pair.patientIDs,
			first: pair.first,
			second: pair.second
		};
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
var filename = __dirname + "/../incidences.json";
_node_fs.writeFile(filename, jsonData, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("Saved " + filename);
}); 
