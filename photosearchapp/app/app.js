'use strict';

// Declare app level module which depends on views, and components
angular.module('photoSearchApp', [
  'ngRoute',
  'photoSearchApp.main',
  'ngResource',
  'elasticsearch',
  'wu.masonry',
  'color.picker'
  ]).
config(['$routeProvider', function($routeProvider) {
$routeProvider.otherwise({redirectTo: '/main'});
}]).
config(['$locationProvider', function($locationProvider) {
  $locationProvider.html5Mode(true);
}])
.factory('photoService', ['$q', 'esFactory', '$location', function($q, elasticsearch, $location) {
  var client = elasticsearch({
    host: '192.168.99.102:9200'
  });

  /**
   * Given a term and an offset, load another round of 10 photos.
   *
   * Returns a promise.
   */
   var search = function(term, offset) {
    term = term || []
    /* TODO: This should accomodate a term and a the current color search in the future */
    var deferred = $q.defer();
    var query = {
      "filtered":{
        "filter":{
          "and" :
          [ {
            "range" : {
              "colors.h" : {
                "gte": term.h - term.h*.1,
                "lte": term.h + term.h*.1
              }
            }},
            {"range" : {
              "colors.s" :  {
                "gte" :term.s - term.s*.1,
                "lte" :term.s + term.s*.1
              }
            }},
            {"range" : {
              "colors.v" :  {
                "gte" :term.v - term.v*.1,
                "lte" :term.v + term.v*.1
              }
            }}

            ]
          },
          "query": {
            "function_score": {
              "score_mode": "multiply",
              "functions": [
              {
                "exp": {
                  "colors.h": {
                    /* This should be input */
                    "origin": term.h,
                    "offset": 1,
                    "scale": 2
                  }
                }
              },
              {   
                "exp": {
                  "colors.s": {
                    "origin": term.s,
                    "offset": 2,
                    "scale": 4 
                  } 
                } 
              },
              {   
                "exp": {
                  "colors.v": {
                    "origin": term.v,
                    "offset": 2,
                    "scale": 4 
                  } 
                } 
              }
              ]
            }
          }
        }
      };

      client.search({
        index: 'photos',
        type: 'photo',
        body: {
          size: 10,
          from: (offset || 0) * 10,
          query: query
        }
      }).then(function(result) {
        var ii = 0, hits_in, hits_out = [];

        hits_in = (result.hits || {}).hits || [];

        for(; ii < hits_in.length; ii++) {
          hits_out.push(hits_in[ii]._source);
        }
        deferred.resolve(hits_out);
      }, deferred.reject);

      return deferred.promise;
    };

  // Since this is a factory method, we return an object representing the actual service.
  return {
    search: search
  };

}]);
