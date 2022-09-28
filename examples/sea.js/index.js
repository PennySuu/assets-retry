define(function(require) {
  const sum = require('http://10.219.9.6:5500/examples/sea.js/modules/sum.js')
  document.querySelector('#js_sum').textContent = sum(1, 1)
});