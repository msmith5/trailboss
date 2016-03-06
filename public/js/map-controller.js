app.controller('MapController', function($scope, $log, $window, $timeout, markerService) {

    $log.debug('map-controller');

    $scope.map = new MapManager('mapCanvas', $scope).getMap();
    $scope.map.setZoom(14);
    $scope.map.setCenter(new google.maps.LatLng(43.264392, -70.799868));
    markerService.map = $scope.map;

    //if ('geolocation' in navigator) {
    //    navigator.geolocation.getCurrentPosition(function (position) {
    //        //$log.debug('position:', position);
    //        var lat = position.coords.latitude;
    //        var lng = position.coords.longitude;
    //        $log.debug('lat:', lat, 'lng:', lng);
    //        $scope.map.setCenter(new google.maps.LatLng(lat, lng));
    //    });
    //}

    $scope.$on('updateRoutesheet', updateRoutesheet);

    function updateRoutesheet() {
        $log('updateRoutesheet event');
    }




});
