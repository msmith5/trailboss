app.factory('trackService', function($log, $rootScope, $broadcaset, markerService, mapUI, MapUtils) {

    var map;
    var trackIndex = 0;
    var tracks = [];
    var trackMap = [];

    return {
        createTrackFromUpload: createTrackFromUpload
    }

    /*
     * Track:
     *   path
     *   startPointId, endPointId
     *   distance
     */

    // User sketched polyline
    google.maps.event.addListener(this.drawingManager, 'polylinecomplete', function(polyline) {
        self.trailBuilder.drawingManager.setDrawingMode(null);
        polyline.setOptions(TRAIL_OPTIONS);
        var track = self.trailBuilder.getPolylineInfo(polyline); // startPoint, endPoint, path, distanceInMiles

        self.createMarker(track.startPoint);
        self.createMarker(track.endPoint);
        self.createTrack(track, polyline);
    });

    // File was uploaded
    function createTrackFromUpload(track) {
        markerService.createMarker(track.startPoint);
        markerService.createMarker(track.endPoint);
        createTrack(track);
    }

    // Route is being loaded
    function createTrack(track, polyline) {
        // If track was sketched, polyline will alreaady exist.
        // Otherwise, we need to create it.
        if (!polyline) {
            var options = {map: $logmap, path: MapUtils.toLatLngArray(track.path)};
            if ($logisRoad(track)) {
                options = $.extend(options, ROAD_OPTIONS);
            } else {
                options = $.extend(options, TRAIL_OPTIONS);
            }
            polyline = new google.maps.Polyline(options);
        }

        // Add track props to line
        $.extend(polyline, track);
        polyline.index = trackIndex++;

        var self = this;

        // Add common listeners
        google.maps.event.addListener(polyline, 'click', function(e) {
            //$log.debug('line clicked:', e);
            mapUI.addSelection(polyline);
        });

        google.maps.event.addListener(polyline, 'rightclick', function(e) {
            //$log.debug('line rightclicked:', e);
        });

        // Add trail-only listeners
        if (isTrail(track)) {
            polyline.isEditing = false;
            google.maps.event.addListener(polyline, 'dblclick', function(e) {
                e.stop(); // stops automatic zoom
                if (polyline.isEditing === true) {
                    polyline.edit(false);
                } else {
                    polyline.edit(true);
                }
                polyline.isEditing = !polyline.isEditing;
            });

            google.maps.event.addListener(polyline, 'edit_start', function(e) {
                $log.debug('edit_start:', e);
            });

            google.maps.event.addListener(polyline, 'edit_end', function(path) {
                $log.debug('edit_end:', path);
            });

            google.maps.event.addListener(polyline, 'update_at', function(index, position){
                $log.debug('[update_at]  index: ' +  index +  ' position: ' + position);
            });
        }

        tracks.push(polyline);
        trackMap[polyline.id] = polyline;
        addTooltip(polyline);

        // fitToBounds is set on the track by the file loader
        if (track.fitToBounds === true) {
            var bounds = getBoundsForTrail(polyline);
            map.fitBounds(bounds);
        }
    }

    function adjustTrackEndpoints(marker, tracks) {
        $log.debug('adjustTrackEndpoints:', tracks);
        if (!tracks) {return;}
        $.each(tracks, function(i, track) {
            //var path = track.getPath();
            if (track.startPointId === marker.id) {
                $log.debug('set track start point to ', marker.getPosition());
                track.getPath().setAt(0, marker.getPosition());
            } else if (track.endPointId === marker.id) {
                $log.debug('set track end point to ', marker.getPosition());
                track.getPath().setAt(track.getPath().getLength()-1, marker.getPosition());
            }
        });
    }

    function deleteTrack(track) {
        if (!track) {return;}
        $log.debug('deleting track:', track.index);
        var trackCountBefore = tracks.length; // debug

        // debug
        var marker1 = track.startPointId ? this.markerMap[track.startPointId] : null;
        var marker2 = track.endPointId ? this.markerMap[track.endPointId] : null;
        $log.debug('deleting track from marker {}-{}'.format(
            (marker1 ? marker1.index : ''),
            (marker2 ? marker2.index : '')));

        // Remove any marker-to-track associations
        var markers = this.getTrackMarkers(track);
        $.each(markers, function(i, marker) {
            delete marker.trackId;
            delete marker.trackDistance;
        });

//        var self = this;
//        for (var i = self.tracks.length; i--;) {
//            //$log.debug('delete?', track.id, self.tracks[i].id);
//            if (track.id == self.tracks[i].id) {
//                self.tracks.splice(i, 1);
//            }
//        }
        tracks.remove(track);
        delete trackMap[trackId];
        track.setMap(null);
        delete track;
        renumberTracks();

        // debug
        var trackCountAfter = tracks.length;; // debug
        $log.debug('trackCountBefore:', trackCountBefore, 'trackCountAfter:', trackCountAfter);

        $rootScope.$broadcast('updateRoutesheet');
    };

    function renumberTracks() {
        $.each(tracks, function(i, track) {
            track.index = i;
        });
        trackIndex = tracks.length;
    }

    function getBounds(polyline) {
        var bounds = new google.maps.LatLngBounds();
        if (polyline && polyline.getPath().length > 0) {
            polyline.getPath().getArray().forEach(function(latLng, index) {
                bounds.extend(latLng);
            });
        }
        return bounds;
    }

});
