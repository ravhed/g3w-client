import { SPATIALMETHODS } from 'g3w-ol/constants';
import GUI from 'services/gui';
import DataRouterService from 'services/data';
import ProjectsRegistry from 'store/projects';

const { throttle }       = require('core/utils/utils');
const InteractionControl = require('g3w-ol/controls/interactioncontrol');

/**
 * Catalog layers (TOC) properties that need to be satisfied
 */
const layersFilterObject = {
  SELECTED_OR_ALL: true, // selected or all
  FILTERABLE: true,      // see: src/app/core/layers/layer.js#L925
  VISIBLE: true          // need to be visible
};

const condition = {
  filtrable: {
    ows: 'WFS'
  }
};

const QueryBBoxControl = function(options = {}) {

  const {
    spatialMethod = SPATIALMETHODS[0]
  } = options;

  /**
   * @FIXME add description
   */
  this._startCoordinate = null;

  /**
   * @FIXME add description
   */
  this.unwatches        = [];

  /**
   * @FIXME add description
   */
  const layers = GUI.getService('map').filterableLayersAvailable(condition) || [];
  layers.forEach(layer => layer.setTocHighlightable(true));

  const _options = {
    ...options,
    layers,
    offline: false,
    name: "querybbox",
    tipLabel: "sdk.mapcontrols.querybybbox.tooltip",
    label: options.label || "\ue902",
    clickmap: true, // set ClickMap
    interactionClass: ol.interaction.DragBox,
    onhover: true,
    toggledTool:{
      type: 'spatialMethod',
      how: 'toggled' // or hover
    },
    spatialMethod,
    help: {
      title:"sdk.mapcontrols.querybybbox.help.title",
      message:"sdk.mapcontrols.querybybbox.help.message",
    }
  };

  InteractionControl.call(this, _options);


  this.setEnable(this.hasVisibleLayers());

  /**
   * Store bbox coordinates
   * 
   * @type {ol.coordinate}
   */
  this.bbox = null;

  /**
   * Set `layer.tochighlightable` to external layer to show highlight class
   * 
   * @since 3.8.0
   */
  this.on('toggled', ({toggled}) => {
    this.getExternalLayers().forEach(layer => layer.tochighlightable = toggled);
  })

};

ol.inherits(QueryBBoxControl, InteractionControl);

const proto = QueryBBoxControl.prototype;

/**
 * @deprecated since 3.7
 * 
 * @param layers
 */
proto.change = function(layers=[]) {
  this.layers = layers;
  this.setEnable(this.hasVisibleLayers());
  this.listenLayersVisibilityChange();
};

proto.checkVisible = function() {
  return this.layers.length > 0 || this.getExternalLayers().length > 0;
};

/**
 * @param {ol.Map} map
 * 
 * @listens ol.interaction.DragBox~boxstart
 * @listens ol.interaction.DragBox~boxend
 */
proto.setMap = function(map) {

  InteractionControl.prototype.setMap.call(this, map);

  this._interaction
    .on('boxstart', evt => this._startCoordinate = evt.coordinate);

  this._interaction
    .on('boxend', throttle(evt => {

      this.bbox = ol.extent.boundingExtent([this._startCoordinate, evt.coordinate]);

      this.dispatchEvent({ type: 'bboxend', extent: this.bbox });

      this._startCoordinate = null;

      if (this._autountoggle) {
        this.toggle();
      }

    }));

    this.setEventKey({
      eventType: 'bboxend',
      eventKey: this.on('bboxend', this.runSpatialQuery)
    });

};

/**
 * @since 3.8.0
 */
proto.onSelectLayer = function(layer) {
  if (layer) {
    const findLayer = this.layers.find(_layer => _layer === layer);
    this.setEnable(!!findLayer && findLayer.isVisible());
  } else {
    this.setEnable(this.hasVisibleLayers());
  }
  this.toggle(this.isToggled() && this.getEnable());
};

/**
 * @since 3.8.0
 */
proto.listenLayersVisibilityChange = function() {
  this.unwatches.forEach(unwatch => unwatch());
  this.unwatches.splice(0);
  this.layers.forEach(layer => {
    this.unwatches
      .push(
        this.watchLayer(
          () => layer.state.visible,
          visible => {
            if (true === layer.state.selected) {
              this.setEnable(visible);
            } else {
              this.setEnable(this.hasVisibleLayers())
            }
            this.toggle(this.isToggled() && this.getEnable());
          }
        )
      )
    }
  );
};

/**
 * @returns {Promise<void>}
 * 
 * @since 3.8.0
 */
proto.runSpatialQuery = async function(){
  // skip if bbox is not set
  if (null === this.bbox) {
    return;
  }
  GUI.closeOpenSideBarComponent();
  try {
    await DataRouterService.getData('query:bbox', {
      inputs: {
        bbox: this.bbox,
        feature_count: ProjectsRegistry.getCurrentProject().getQueryFeatureCount(),
        addExternal: this.addExternalLayerToResult(),
        layersFilterObject,
        filterConfig: {
          spatialMethod: this.getSpatialMethod(), // added spatial method to polygon filter
        },
        condition,
        multilayers: ProjectsRegistry.getCurrentProject().isQueryMultiLayers(this.name)
      }
    });
  } catch(err){
    console.warn('Error running spatial query: ', err);
  }
};

/**
 * @param {{ layer, unWatches }}
 * 
 * @since 3.8.0
 */
proto.onAddExternalLayer = function({layer, unWatches}) {
  //set layer property
  layer.tochighlightable = this.isToggled() && this.getEnable();

  unWatches.push(
    this.watchLayer(
      () => layer.selected,                    // watch `layer.selected` property
      selected => {
        this.setEnable(true === selected ? layer.visible : this.hasVisibleLayers());
        this.toggle(this.isToggled() && this.getEnable());
      })
  );

  unWatches.push(
    this.watchLayer(
      () => layer.visible,                       // watch `layer.visible` property
      () => {
        this.setEnable(this.hasVisibleLayers());
        this.toggle(this.isToggled() && this.getEnable());
      })
  );

  this.setEnable(this.hasVisibleLayers());
};

/**
 * @since 3.8.0
 */
proto.onRemoveExternalLayer = function() {
  this.setEnable(this.isThereVisibleLayerNotSelected());
};


/**
 * @since 3.8.0
 */
proto.clear = function(){
  this.bbox = null;
};


module.exports = QueryBBoxControl;
