import MapControlZoomHistory from "components/MapControlZoomHistory.vue";

const Control = require('g3w-ol/controls/control');

function ZoomHistoryControl() {
  const vueElement = Vue.extend(MapControlZoomHistory);
  Control.call(this, {
    name: "zoomhistory",
    tipLabel: "sdk.mapcontrols.addlayer.tooltip",
    element: (new vueElement()).$mount().$el
  });
}

ol.inherits(ZoomHistoryControl, Control);

const proto = ZoomHistoryControl.prototype;

proto.setMap = function(map) {
  Control.prototype.setMap.call(this,map);
};

proto.layout = function(map) {
  Control.prototype.layout.call(this, map);
};

module.exports = ZoomHistoryControl;
