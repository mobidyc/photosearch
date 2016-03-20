'use strict';

describe('myApp.main module', function() {

  beforeEach(module('myApp.main'));

  describe('main controller', function(){

    it('should ....', inject(function($controller) {
      //spec body
      var mainCtrl = $controller('View1Ctrl');
      expect(mainCtrl).toBeDefined();
    }));

  });
});