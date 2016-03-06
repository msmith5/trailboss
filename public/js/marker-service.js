app.factory('markerService', function($log) {

    var map;
    var markerIndex = -1;
    var markers = [];
    var markerMap = {};
    var showMarkers = true;
    
    return {
        createMarker: createMarker,
        deleteMarker: deleteMarker,
        toggleMarkers: toggleMarkers
    };

    /*
     * waypoint:
     *   id
     *   position
     *   instructions
     *   increment
     *   prevPointId, nextPointId
     */

    function createMarker(waypoint) {
        markerIndex++;
        if (!waypoint.name) {
            waypoint.name = 'M' + markerIndex;
        }

        var marker = createStyledMarker({
            map: map,
            position: new google.maps.LatLng(waypoint.position.lat, waypoint.position.lng),
            draggable: true,
            text: '' + markerIndex
            //icon: pinIcon
            //title: waypoint.increment
        });

        // Add waypoint props to marker
        delete waypoint.position; // avoid collison with marker property
        $.extend(marker, waypoint);

        marker.index = markerIndex;
//        marker.setTitle(this.getMarkerTitle(marker));
        markers.push(marker);
        markerMap[marker.id] = marker;
        addTooltip(marker);

        var self = this;
        google.maps.event.addListener(marker, 'dragstart', function (e) {
            $log.debug('dragstart:', marker.trackId);
            if (marker.trackId) {
                self.moveOnTrack(marker);
                self.ibLabel.open(this.map, marker);
                e.stop();
            } else {
                //must have been deleted
                delete marker.trackId;
                delete marker.trackDistance;
            }
        });
        
        google.maps.event.addListener(marker, 'dragend', function (e) {
            //$log.debug('dragend:', e);
            markerMoved(marker)
        });
        
        google.maps.event.addListener(marker, 'click', function (e) {
            //$log.debug('click:', e);
            self.addSelection(marker);
        });
        google.maps.event.addListener(marker, 'rightclick', function (e) {
            $log.debug('marker rightclick:', e);
            self.currentMarker = marker;
            $('#markerMenu').position({
                my: 'left top',
                at: 'left+{} top+{}'.format(e.pixel.x + 65, e.pixel.y - 40),
                of: '#mapCanvas'
            });
            $('#markerMenu').contextMenu();
        });
        google.maps.event.addListener(marker, 'dblclick', function (e) {
            //$log.debug('dblclick:', e);
            ctrl.editCheck(marker);
        });
    };

    function deleteMarker(marker) {
        //$log.debug('deleteLeg:', leg);
        if (!marker) {return;}

        // Remove associated tracks
        var tracks = this.getMarkerTracks(marker);
        var self = this;
        $.each(tracks, function(i, track) {
            self.deleteTrack(track);
        });

        // Remove references to this marker
        var siblings = this.getMarkerSiblings(marker);
        $.each(siblings, function(i, sibling) {
            $log.debug('sibling:', sibling);
            if (marker.id == sibling.prevPointId) {
                delete sibling.prevPointId;
            }
            if (marker.id == sibling.nextPointId) {
                delete sibling.nextPointId;
            }
        });

        // Remove the marker
        marker.setMap(null);
        markers.remove(marker);
        delete markerMap[marker.id];
        delete marker;
    };


    function markerMoved(marker) {
        var self = this;

        var tracks = this.getMarkerTracks(marker);

        // Delete associated road sections
        $.each(tracks, function(i, track) {
            if (self.isRoad(track)) {
                self.deleteTrack(track);
            }
        });

        // Pull the tracks again, as the above loop doesn't
        // remove the road sections from the array --
        // it just sets them to null.
        tracks = this.getMarkerTracks(marker);

        // Reroute the road sections
        var siblings = self.getMarkerSiblings(marker);
        $log.debug('siblings:', siblings);
        if (siblings.length > 1) {
            self.routeRoadSection(siblings, function() {
                $.each(tracks, function(i, track) {
                    if (self.isTrack(track) === true) {
                        //$log.debug('pos2:', marker.position);
                        self.adjustTrackEndpoints(marker, tracks);
                    }
                });
            });
        } else {
            this.updateRoutesheet();
        }
    };

    function getMarkerTracks(marker) {
        var tracks = [];
        $.each(this.tracks, function (i, track) {
            if (marker.id == track.startPointId || marker.id == track.endPointId) {
                tracks.push(track);
            }
        });
        return tracks;
    }

    function getTrackMarkers(track) {
        var markers = [];
        $.each(this.markers, function (i, marker) {
            if (track.id == marker.trackId) {
                markers.push(marker);
            }
        });
        return markers;
    }

    function getMarkerSiblings(marker) {
        var siblings = [];
        if (marker.prevPointId && this.markerMap[marker.prevPointId]) {
            siblings.push(this.markerMap[marker.prevPointId]);
        }
        siblings.push(marker);
        if (marker.nextPointId && this.markerMap[marker.nextPointId]) {
            siblings.push(this.markerMap[marker.nextPointId]);
        }
        //$log.debug('siblings:', siblings);
        return siblings;
    }

    function toggleMarkers() {
        showMarkers = !showMarkers;
        //$log.debug('toggleMarkers:', visible);
        $.each(this.markers, function(i, marker) {
            marker.setVisible(showMarkers);
        });
    }

    function createStyledMarker(opts) {
        $.extend(opts, {
            styleIcon: new StyledIcon(StyledIconTypes.MARKER, {
                color: '#FFFF00',
                text: opts.text
            })
        });
        delete opts.text;
        return new StyledMarker(opts);
    }
    
});
