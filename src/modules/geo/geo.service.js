var inherit = require('core/utils').inherit;
var LayersStore = require('./layers.store');

// Public interface
function service(){
  var self = this;
  this.setup = function(config){
    _service.setup(config)
    .then(function(){
      self.emit("loaded");
    });
  };
  this.getLayersStore = function(){
    return _service.layersStore;
  };
  this.getLayersTree = function(){
    var layersTree = _service.layersStore.getLayersTree();
    if (_.isNull(layersTree)){
      layersTree = [];
    }
    return layersTree;
  };
}

// Make the public service en Event Emitter
inherit(service,EventEmitter);

// Private
var _service = {
  initialized: false,
  groupConfig: null,
  currentProject: null,
  layersStore: null,
  
  setup: function(groupConfig){
    if (!this.initialized){
      this.groupConfig = groupConfig;
      return this.loadProject(groupConfig.initproject);
    }
  },
  
  loadProject: function(id){
    if (this.projectAvailable(id)) {
      var self = this;
      return this.getProjectConfig(id)
      .then(function(projectConfig){
        self.currentProject = projectConfig;
        self.layersStore = new LayersStore({
          layers: projectConfig.layers,
          layersTree: projectConfig.layerstree
        });
        self.initialized = true;
      });
    }
  },
  
  projectAvailable: function(id){
    var exists = false;
    _.forEach(this.groupConfig.projects,function(project){
      if (project.id == id){
        exists = true;
      }
    });
    return exists;
  },
  
  getProjectConfig: function(id){
    var self = this;
    var deferred = Q.defer();
    setTimeout(function(){
        var projectConfig = require('./test.project_config');
        deferred.resolve(projectConfig);
    },100);
    return deferred.promise;
  }
};

module.exports = new service();
