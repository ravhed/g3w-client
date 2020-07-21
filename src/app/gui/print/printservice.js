const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const t = require('core/i18n/i18n.service').t;
const GUI = require('gui/gui');
const G3WObject = require('core/g3wobject');
const ProjectsRegistry = require('core/project/projectsregistry');
const PrintService = require('core/print/printservice');
const {getScaleFromResolution, getResolutionFromScale, getMetersFromDegrees} = require('g3w-ol/src/utils/utils');
const printConfig = require('./printconfig');
const PrintPage = require('./vue/printpage');
const scale = printConfig.scale;
const dpis = printConfig.dpis;
const formats = printConfig.formats;

function PrintComponentService() {
  base(this);
  this.printService = new PrintService();
  this._initialized = false;
  this.state = {
    loading: false
  };
  this._moveMapKeyEvent = null;
  // istanzio il componete page per la visualizzazione del pdf
  this._page = null;
  this._mapService = null;
  this._map = null;
  this._mapUnits;
  this._scalesResolutions = {};
  this.init = function () {
    this._project = ProjectsRegistry.getCurrentProject();
    this.state.print = this._project.state.print || [];
    this.state.visible = this.state.print.length > 0;
    this.state.isShow = false;
    this.state.url = null;
    this.state.output = {
      url: null,
      method: this._project.getOwsMethod(),
      layers: true,
      format: null,
      loading: false,
      type: null
    };
    this.state.printextent = {
      minx: [0, 0],
      miny: [0, 0],
      maxx: [0, 0],
      maxy: [0, 0]
    };
    if (this.state.visible) {
      this.state.template = this.state.print[0].name;
      this.state.rotation = 0;
      this.state.inner = [0, 0, 0, 0];
      this.state.center = null;
      this.state.size = null;
      this.state.scale = scale;
      this.state.scala = null;
      this.state.dpis = dpis;
      this.state.dpi = dpis[0];
      this.state.formats = formats;
      this.state.output.format = formats[0].value;
      this.state.maps = this.state.print[0].maps;
      this.state.width = this.state.print[0].maps[0].w;
      this.state.height = this.state.print[0].maps[0].h;
    }
  };
};

inherit(PrintComponentService, G3WObject);

const proto = PrintComponentService.prototype;

proto.changeTemplate = function() {
  if (!this.state.template) return;
  this.state.print.forEach(print => {
    if (print.name === this.state.template) {
      this.state.width = print.maps[0].w;
      this.state.height = print.maps[0].h;
      this.state.map = print.maps[0].name;
      this.state.maps = print.maps;
    }
  });
  this._setPrintArea();
};

proto.changeScale = function() {
  if (!this.state.scala) return;
  this._setPrintArea();
};

proto.changeRotation = function() {
  this._mapService.setInnerGreyCoverBBox({
    rotation: this.state.rotation
  });
};

proto._getPrintExtent = function() {
  const [minx, miny, maxx, maxy] = [... this.state.printextent.lowerleft, ...this.state.printextent.upperright];
  const extent = this._mapService.isAxisOrientationInverted() ? [miny, minx, maxy, maxx ] : [minx, miny, maxx, maxy];
  return extent.join()
};

proto._getOptionsPrint = function() {
  const maps = this.state.maps.map(map => ({
    name: map.name,
    scale: map.overview ? map.scale : this.state.scala
  }));
  const options = {
    extent: this._getPrintExtent(),
    rotation: this.state.rotation,
    dpi: this.state.dpi,
    template: this.state.template,
    maps,
    format: this.state.output.format
  };
  return options;
};

proto.setPrintAreaAfterCloseContent = function() {
  this._map.on('postrender', () => {
    this._setPrintArea()
  });
  this.stopLoading()
};

proto.print = function() {
  this.state.output.url = null;
  this.state.output.layers = true;
  this._page = new PrintPage({
    service: this
  });
  GUI.setContent({
    content: this._page,
    title: 'print',
    perc:100
  });
  const options = this._getOptionsPrint();
  this.printService.print(options, method=this.state.output.method).then((data) => {
    this.state.output.url = data.url;
    this.state.output.layers = data.layers;
    this.state.output.mime_type = data.mime_type;
  }).catch(()=> {
    this.showError();
  })
};

proto.startLoading = function() {
  this.state.output.loading = true;
};

proto.stopLoading = function() {
  this.state.output.loading = false;
};

proto.showError = function() {
  GUI.notify.error(t("info.server_error"));
  GUI.closeContent();
};

proto._calculateInternalPrintExtent = function() {
  const resolution = this._map.getView().getResolution();
  const scala = parseFloat(this.state.scala);
  const resolutionInMeters = this._mapService.getMapUnits() === 'm' ? resolution : getMetersFromDegrees(resolution);
  const w = (((this.state.width / 1000.0) * scala) / resolutionInMeters) * ol.has.DEVICE_PIXEL_RATIO;
  const h = (((this.state.height  / 1000.0) * scala) / resolutionInMeters) * ol.has.DEVICE_PIXEL_RATIO;
  // get current map center ( in pixel)
  const center = [
    (this.state.size[0] * ol.has.DEVICE_PIXEL_RATIO) / 2, // X
    (this.state.size[1] * ol.has.DEVICE_PIXEL_RATIO) / 2  // Y
  ];
  // Calculate the inner bbox in pixel
  const xmin = center[0] - (w / 2);
  const ymin = center[1] - (h / 2);
  const xmax = center[0] + (w / 2);
  const ymax = center[1] + (h / 2);
  this.state.printextent.lowerleft = this._map.getCoordinateFromPixel([xmin, ymax]) ? this._map.getCoordinateFromPixel([xmin, ymax]) : this.state.printextent.lowerleft;
  this.state.printextent.upperright = this._map.getCoordinateFromPixel([xmax, ymin]) ? this._map.getCoordinateFromPixel([xmax, ymin]) : this.state.printextent.upperright;
  this.state.inner =  [xmin, ymax, xmax, ymin];
};

proto._setPrintArea = function() {
  this.state.size = this._map.getSize();
  const resolution = this._map.getView().getResolution();
  this.state.currentScala = getScaleFromResolution(resolution, this._mapUnits);
  this.state.center = this._map.getView().getCenter();
  this._calculateInternalPrintExtent();
  this._mapService.setInnerGreyCoverBBox({
    type: 'pixel',
    inner: this.state.inner,
    rotation: this.state.rotation
  });
};

proto._clearPrint = function() {
  ol.Observable.unByKey(this._moveMapKeyEvent);
  this._moveMapKeyEvent = null;
  this._mapService.stopDrawGreyCover();
};

proto._setAllScalesBasedOnMaxResolution = function(maxResolution) {
  let resolution = maxResolution;
  const mapScala = getScaleFromResolution(resolution, this._mapUnits);
  const orderScales = _.orderBy(this.state.scale, ['value'], ['desc']);
  let scale = [];
  let addedFirstHighestScale = false;
  const handleScala = scala => {
    scale.push(scala);
    resolution = getResolutionFromScale(scala.value, this._mapUnits);
    this._scalesResolutions[scala.value] = resolution;
    resolution = resolution / 2;
  };
  orderScales.forEach((scala, index) => {
    if (mapScala > scala.value) {
      if (!addedFirstHighestScale) {
        const higherScale = orderScales[index-1];
        handleScala(higherScale);
        addedFirstHighestScale = true;
      }
      handleScala(scala);
    }
  });
  this.state.scale = _.orderBy(scale, ['value'], ['asc']);
};

proto._setInitialScalaSelect = function() {
  this.state.scala = this.state.scale[this.state.scale.length-1].value;
  $('#scala').val(this.state.scala);
};

proto._setCurrentScala = function(resolution) {
  Object.entries(this._scalesResolutions).forEach(([scala, res]) => {
    if (res === resolution) {
      this.state.scala = scala;
      return false
    }
  });
};

proto._setMoveendMapEvent = function() {
  this._moveMapKeyEvent = this._map.on('moveend', () => {
    this._setPrintArea();
  })
};

proto._showPrintArea = function() {
  this._setPrintArea();
  this._mapService.startDrawGreyCover();
};

proto._initPrintConfig = function() {
  let resolution;
  if (!this._initialized) {
    const maxResolution = this._map.getView().getMaxResolution();
    this._setAllScalesBasedOnMaxResolution(maxResolution);
    this._setInitialScalaSelect();
    this._initialized = true;
  } else {
    resolution = this._map.getView().getResolution();
    this._setCurrentScala(resolution);
  }
};

proto._setMapInfo = function() {
  this.state.print[0].maps.forEach((map) => {
    if (map.name === 'map0') {
      this.state.map = map.name;
      this.state.width = map.w;
      this.state.height = map.h;
      return false;
    }
  })
};

proto.showPrintArea = function(bool) {
  // close content if open
  GUI.closeContent()
    .then((mapComponent) => {
      requestAnimationFrame(() => {
        this._mapService = mapComponent.getService();
        this._mapUnits = this._mapService.getMapUnits();
        this._mapService.getMap().once('postrender', (evt) => {
          this._map = evt.map;
          if (bool) {
            this._setMapInfo();
            this._setMoveendMapEvent();
            this._initPrintConfig();
            this._showPrintArea();
          } else this._clearPrint();
        });
        this._mapService.getMap().renderSync();
      })
    })
};

proto.reload = function() {
  this._project = ProjectsRegistry.getCurrentProject();
  this._mapService = GUI.getComponent('map').getService();
  this._map = this._mapService.viewer.map;
  this.state.print = this._project.state.print || [];
  this.state.visible = this.state.print.length > 0;
  if (this.state.visible) {
    this.state.template = this.state.print[0].name;
    !this._initialized && this.init();
    this._initPrintConfig();
    this._mapService.on('changeviewaftercurrentproject', () => {
      const maxResolution = this._map.getView().getMaxResolution();
      this.state.scale = scale;
      this._setAllScalesBasedOnMaxResolution(maxResolution);
    });
  } else this._clearPrint();
};

module.exports = PrintComponentService;
