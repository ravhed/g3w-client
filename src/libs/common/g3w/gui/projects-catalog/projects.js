var t = require('i18n/i18n.service').t;
var GUI = require('g3w/gui/gui');
var ProjectsRegistry = require('g3w/core/projectsregistry');

Vue.component('g3w-projects-catalog',{
    template: require('./projects.html'),
    data: function() {
      return {
        projects: ProjectsRegistry.state.projects
      }
    },
    methods: {
      'setProject': function(gid){
        ProjectsRegistry.setCurrentProject(gid);
      }
    }
});