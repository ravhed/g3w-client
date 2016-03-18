var t = require('i18n.service');
var layout = require('layout/layout');

Vue.component('app',{
    template: require('./app.html'),
    props: ['iface'],
    ready: function(){
      layout.setup();
    }
});
