angular.module('appRoutes', []).config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {

    $routeProvider

        .when('/', {
            templateUrl: 'map.html',
            controller: 'MapController'
        })

        .when('/events', {
            templateUrl: 'events.html',
            controller: 'EventController'
        })

        .when('/map', {
            templateUrl: 'views/map.html',
            controller: 'MapController'
        });

    $locationProvider.html5Mode(true);

}]);
