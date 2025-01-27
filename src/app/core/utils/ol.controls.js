/**
 * @TODO check if we can safely delete this file, all these functions look somewhat unused
 * 
 * @file utility functions historically related to "g3w-ol/controls"
 * @since v3.8
 */

import GUI from 'services/gui';

const TOPOFFSET = 35;

export default {

  /**
   * @FIXME add description
   */
  layout({map, position, element}) {},

  /**
   * @param {{map: ol.Map, position: ('top'|'right'), element: JQuery, isMobile?: boolean }}
   */
  changeLayoutBottomControl({map, position, element, isMobile=false}) {
    const viewPort = map.getViewport();
    const positionCode = (position['top'] ? 't' : 'b') + (position['left'] ? 'l' : 'r');
    const previusControls = $(viewPort).find('.ol-control-' + positionCode + ':visible');
    if (previusControls.length) {
      let previusControl;
      previusControls.each((index, elem) => {
        if(elem != element[0]) previusControl = $(elem);
        else return false
      });
      if (previusControl && positionCode==='br') {
        if (!isMobile) {
          const previousTopPosition = previusControl.position().top;
          const elementTopPosition = element.position().top;
          if ((previousTopPosition - elementTopPosition) != TOPOFFSET ) {
            const hOffset = previousTopPosition - TOPOFFSET;
            element.css('top', hOffset + 'px');
          }
        } else {
          const previusControlWidth = previusControl.width();
          const previousLeftPosition =  previusControlWidth < 10 ? 130 : previusControlWidth + 20;
          element.css('right', previousLeftPosition + 'px');
          element.css('bottom', '15px');
        }
      }
    }
  },

  /**
   * Create user message tool from map control
   */
  createControlUserMessageTool(tool={
    hooks: {
      body: {
        template:`<div>
                <div >
                  <input type="radio" name="radio" id="g3w-map_theme-0" class="magic-radio" value="view1">
                  <label  for="g3w-map_theme-0" style="display: flex; justify-content: space-between;">
                    <span>Intersect</span>
                  </label>
                </div>
                <div>
                  <input  type="radio" name="radio" id="_cotains" class="magic-radio" value="view2">
                  <label  for="g3w-map_theme-1" style="display: flex; justify-content: space-between;">
                    <span>view2</span>
                  </label>
                </div>
              </div>`
      }
    },
    title: 'Scelgli il tipo di operazione'
  }){
    GUI.showUserMessage({
      type: 'tool',
      message: tool.message,
      size: tool.size || 'small', // small, medium
      title: tool.title || '',
      hooks: tool.hooks
    })
  },

};
