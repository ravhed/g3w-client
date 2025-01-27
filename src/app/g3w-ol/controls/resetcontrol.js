const utils = require('core/utils/ol');
const InteractionControl = require('g3w-ol/controls/interactioncontrol');

const ResetControl = function(options){
  this._toggled = true;
  this._startCoordinate = null;
  const _options = {
      name: "reset",
      tipLabel: "Pan",
      label: "\ue901"
    };
  options = utils.merge(options,_options);
  InteractionControl.call(this,options);
};

ol.inherits(ResetControl, InteractionControl);

module.exports = ResetControl;

const proto = ResetControl.prototype;

proto._postRender = function(){
  this.toggle(true);
};
