'use strict';

angular.module('photoSearchApp.main', ['ngRoute','wu.masonry','color.picker'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/main', {
    templateUrl: 'main/main.html',
    controller: 'MainCtrl'
  });
}]).
controller('MainCtrl', ['photoService', '$scope', '$location',function(photos,$scope, $location) {
 // Provide some nice initial choices

  // Initialize the scope defaults.
  $scope.photos = [];        // An array of photo results to display
  $scope.page = 0;            // A counter to keep track of our current page
  $scope.allResultsShown = true;  // Whether or not all results have been found.
  $scope.color =[];
  $scope.searchTerm = $location.search().q ;
  $scope.resultsLength = 0;


  /**
   * A fresh search. Reset the scope variables to their defaults, set
   * the q query parameter, and load more results.
   */
  $scope.search = function() {
    $scope.page = 0;
    $scope.photos = [];
    $scope.allResultsShown = false;
    $scope.loadMore();
  };

  $scope.onColorChange = function(){
    var color = []
    color=$scope.color.replace('hsv(','').replace(')','').split(',');
    $scope.searchTerm = {h: parseInt(color[0]), s: parseInt(color[1]), v:parseInt(color[2])};

    $scope.search();
  }

  /**
   * Load the next page of results, incrementing the page counter.
   * When query is finished, push results onto $scope.photos and decide
   * whether all results have been returned (i.e. were 10 results returned?)
   */
  $scope.loadMore = function() {
    photos.search($scope.searchTerm, $scope.page++).then(function(results) {

      if (results.length !==10) {
        $scope.allResultsShown = true;
      }

      var in_photo_index = 0;

      for (; in_photo_index < results.length; in_photo_index++) {
        $scope.photos.push(results[in_photo_index]);
      }
    });
  };
  
  console.log($scope.allResultsShown);
  // Load results on first run
  $scope.loadMore();

}]);
