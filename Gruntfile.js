module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
	angular_architecture_graph: {
		diagram: {
			files: {
				"architecture": [
					"scripts/*.js"
				]
			}
		}
	},
  });

  grunt.loadNpmTasks('grunt-angular-architecture-graph');
  grunt.registerTask('default', ['angular_architecture_graph']);
};
