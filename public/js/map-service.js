app.factory('mapFactory', function($log, mapUI) {
    var map;
    
    return { 
        createMap: createMap,
        setCenter: setCenter,
        getCenter: getCenter,
        setZoom: setZoom,
        getZoom: getZoom
    };

    function createMap(id) {
        map = new google.maps.Map($('#' + id)[0], {
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDefaultUI: true,
            rotateControl: false,
            overviewMapControl: true,
            zoomControl: false,
            mapTypeControl: true
        });

        //google.maps.event.addListenerOnce(map, 'projection_changed', function() {
        //    //$log.debug('projection:' + self.map.getProjection());
        //    self.snapToRoute.normalProj = self.map.getProjection();
        //});

        google.maps.event.addListener(map, 'click', function (e) {
            mapUI.setCurrentPoint(e);
        });

        google.maps.event.addListener(map, 'rightclick', function (e) {
            $log.debug('mapService rightclick:', e);
            mapUI.openMapMenu(e);
        });

        return map;
    }

    function setCenter(lat, lng) {
        map.setCenter(new google.maps.LatLng(lat, lng));
    }

    function getCenter() {
        var center = this.map.getCenter();
        return {lat: center.lat(), lng: center.lng()};
    }

    function setZoom(zoom) {
        map.setZoom(zoom);
    }

    function getZoom() {
        return map.getZoom();
    }

    function fitToBounds(markers, tracks) {
        $log.debug('fitToBounds');
        var bounds = new google.maps.LatLngBounds();
        if (markers) {
            $.each(markers, function(i, marker) {
                bounds.extend(marker.position);
            });
        }
        if (tracks) {
            $.each(tracks, function(i, track) {
                $.each(track.path, function(i, pt) {
                    bounds.extend(new google.maps.LatLng(pt.lat, pt.lng));
                });
            });
        }
        map.fitBounds(bounds);
    }


});
