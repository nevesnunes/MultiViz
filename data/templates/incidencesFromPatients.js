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
		var pairs = [];
        var i, j, patientsIndex, pairIndex;
		for (patientsIndex = 0;
                patientsIndex < patients.length;
                patientsIndex++) {
            var diseases = patients[patientsIndex].diseases;
            var medications = patients[patientsIndex].medications;
            for (i = 0; i < diseases.length; i++) {
                for (j = 0; j < medications.length; j++) {
                    // Also check if complementary pair exists
                    // before pushing a new pair
                    pairIndex = pairIndexOf(
                            pairs,
                            [medications[j].name, diseases[i].name],
                            "id");
                    if (pairIndex === -1) {
                        pairIndex = pairIndexOf(
                                pairs,
                                [diseases[i].name, medications[j].name],
                                "id");
                    }
                    if (pairIndex === -1) {
                        pairs.push({
                            id: [diseases[i].name, medications[j].name],
                            incidences: 1,
                            patientIDs: [patients[patientsIndex].id],
                            patientNames: [patients[patientsIndex].name],
                            first: { type: 'disease', name: diseases[i].name },
                            second: { type: 'medication', name: medications[j].name }
                        });
                    } else {
                        pairs[pairIndex].incidences += 1;
                        pairs[pairIndex].patientIDs.push(
                            patients[patientsIndex].id);
                        pairs[pairIndex].patientNames.push(
                            patients[patientsIndex].name);
                    }
                }
            }

            // Create pairs with all combinations of diseases
            for (i = 0; i < diseases.length; i++) {
                for (j = 0; j < diseases.length; j++) {
                    if (i === j)
                        continue;

                    pairIndex = pairIndexOf(
                            pairs,
                            [diseases[i].name, diseases[j].name],
                            "id");
                    if (pairIndex === -1) {
                        pairs.push({
                            id: [diseases[i].name, diseases[j].name],
                            incidences: 1,
                            patientIDs: [patients[patientsIndex].id],
                            patientNames: [patients[patientsIndex].name],
                            first: { type: 'disease', name: diseases[i].name },
                            second: { type: 'disease', name: diseases[j].name }
                        });
                    } else {
                        pairs[pairIndex].incidences += 1;
                        pairs[pairIndex].patientIDs.push(
                            patients[patientsIndex].id);
                        pairs[pairIndex].patientNames.push(
                            patients[patientsIndex].name);
                    }
                }
            }

            // Create pairs with all combinations of diseases
            for (i = 0; i < medications.length; i++) {
                for (j = 0; j < medications.length; j++) {
                    if (i === j)
                        continue;

                    pairIndex = pairIndexOf(
                            pairs,
                            [medications[i].name, medications[j].name],
                            "id");
                    if (pairIndex === -1) {
                        pairs.push({
                            id: [medications[i].name, medications[j].name],
                            incidences: 1,
                            patientIDs: [patients[patientsIndex].id],
                            patientNames: [patients[patientsIndex].name],
                            first: { type: 'medication', name: medications[i].name },
                            second: { type: 'medication', name: medications[j].name }
                        });
                    } else {
                        pairs[pairIndex].incidences += 1;
                        pairs[pairIndex].patientIDs.push(
                            patients[patientsIndex].id);
                        pairs[pairIndex].patientNames.push(
                            patients[patientsIndex].name);
                    }
                }
            }
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
            patientNames: pair.patientNames,
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
