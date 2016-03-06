function MapManager(id, ctrl) {
    this.ctrl = ctrl;
    this.currentPoint = undefined;
    this.markers = [];
    this.markerMap = [];
    this.tracks = [];
    this.trackMap = [];
    this.selectionQueue = [];
    this.totalDistance = 0;
    this.routeHistory = [];
    this.markerIndex = 0;
    this.trackIndex = 0;
    this.routesheetService = undefined;
    var self = this;
    

    this.routeFinder = new RouteFinder(this.map);
    this.trailBuilder = new TrailBuilder(this.map);
    this.drawingManager = this.trailBuilder.drawingManager;
    this.snapToRoute = new SnapToRoute(this.map);
    
    google.maps.event.addListenerOnce(this.map, 'projection_changed', function() {
        //console.debug('projection:' + self.map.getProjection());
        self.snapToRoute.normalProj = self.map.getProjection();
      });
    


//    this.infoBox = new InfoBox({
//        isHidden: true,
//        zIndex: 10000
//    });
//    this.infoBox.open(this.map);
    
   this.ibLabel = new InfoBox({
       content: 'My info'
       ,boxStyle: {
          border: '1px solid black'
         ,textAlign: 'center'
         ,fontSize: '8pt'
         ,width: '50px'
        }
       ,disableAutoPan: true
       ,pixelOffset: new google.maps.Size(-25, 0)
       ,position: this.map.getCenter()
       ,closeBoxURL: ''
       ,isHidden: false
       ,pane: 'mapPane'
       ,enableEventPropagation: true
   });
//   this.ibLabel.open(this.map);
//   this.ibLabel.open(this.map, new google.maps.Marker({
//       map: this.map,
//       draggable: true,
//       position: this.map.getCenter(),
//       visible: true
//      }));


    
    //*****************************************************************//
    // CHECKS & ACTIONS
    //*****************************************************************//
    this.addCheck = function(checkType) {
        console.debug('addCheck:', checkType);
        var checkTypeObj = CheckTypes[checkType];
        console.debug('checkTypeObj:', checkTypeObj);
        console.debug('currentPoint:', this.currentPoint);
        var waypoint = {
            id: Utils.uuid(),
            stepId: null,
            position: {lat: this.currentPoint.latLng.lat(), lng: this.currentPoint.latLng.lng()},
            info: checkTypeObj.displayName,
            title: checkTypeObj.displayName,
            distance: null,
            action: 'CHECK',
            checkType: checkType
        };
        this.createMarker(waypoint);
    };
    
    this.addInstruction = function(action) {
        //console.debug('addInstruction:', action);
        var waypoint = {
            id: Utils.uuid(),
            position: {lat: this.currentPoint.latLng.lat(), lng: this.currentPoint.latLng.lng()},
            title: DIRECTION_TEXT[action],
            action: action
        };
        this.createMarker(waypoint);
    };
    
    //*****************************************************************//
    // ROUTE
    //*****************************************************************//
    this.routeRoadSection = function(markers, callback) {
        markers = markers || this.selectionQueue;
        if (markers.length < 2) {alert('Please select at least two points.'); return;}
        var self = this;
        
        // The callback is for adjusting track endpoints after a marker is dragged
        this.routeFinder.findRoute(markers, function(route) { 
            self.clearSelections();
            self.renderRoute(route);
            self.renumberTracks();
            if (callback) {
                callback();
            }
        });
    };
    
    /*
     * Called from:
     *   initial load
     *   generating a road section
     *   undo
     * route:
     *   waypoints
     *   tracks
     */
    this.renderRoute = function(route) {
        console.debug('renderRoute:', route);
        var self = this;
        angular.forEach(route.waypoints, function(waypoint) {
            self.createMarker(waypoint);
        });
        angular.forEach(route.tracks, function(track) {
            self.createTrack(track);
        });
        self.updateRoutesheet();
    };
    
    //*****************************************************************//
    // MARKERS
    //*****************************************************************//
    //*****************************************************************//
    // SNAPPING
    //*****************************************************************//
    // For context menu
    this.isSelectionSnappable = function() {
        //console.debug(this.selectionQueue.length);
        return this.selectionQueue.length == 1 && this.tracks.length > 0;
    };
    
    /* Snaps a marker to a track
     *   marker: if not provided, the first currently selected item will be used
     *   track:  if not provided, the closest track to the marker will be used
     */
    
    this.snapToTrack = function(marker, track) {
        if (!marker) {
            marker = this.currentMarker;
        }
        if (!marker) {
            marker = this.selectionQueue.shift();
        }
        if (!marker || this.getItemType(marker) !== 'marker') {return;}
        if (!track) {
            track = MapUtils.getClosestTrack(marker.position, this.tracks);
        }
        if (!track) {
            console.debug('unable to find a track close to the selected marker');
            return;
        }
        
//        this.highlightItem(track);
//        var marker = this.markerMap[track.startPointId];
//        var trackDistance;
//        var self = this;
        //pin to track
        marker.trackId = track.id;
//        marker.setDraggable(false);
        
        this.snapToRoute.updateTargets(marker, track);
        this.snapToRoute.updateMarkerLocation(marker.position);
        this.snapToRoute.clear();
    };
    
    this.moveOnTrack = function(marker) {
        console.debug('moveOnTrack, marker:', marker);
        var track = this.trackMap[marker.trackId];
        console.debug('moveOnTrack, track:', track);
        var trackDistance = marker.distance || 0;
        this.snapToRoute.updateTargets(marker, track, function(distance) {
            console.debug('snapToRoute callback:', distance, marker.distance);
//            trackDistance = distance;
//            $('#markerDistance').val((marker1.distance + metersToMiles(trackDistance)).toFixed(2));
            marker.trackDistance = (trackDistance + MapUtils.metersToMiles(distance)).toFixed(2);
            self.ibLabel.setContent(marker.trackDistance);
            marker.distance = trackDistance;
        }); 
    };
    
    // Breaks track at a marker.
    this.breakTrack = function(track, marker) {
        if (this.isRoad(track)) {
            var marker1 = this.markerMap[track.startPointId];
            var marker2 = this.markerMap[track.endPointId];
            var markers = [marker1, marker, marker2];
            this.deleteTrack(track);
            this.routeRoadSection(markers);
        } else {
            // TODO: break trail
        }
    }
        
    //*********************************************************************//
    // TRACK
    //*********************************************************************//
    //************************************************************************//
    // UTILS
    //************************************************************************//
    this.getBoundsForTrail = function(polyline) {
        var bounds = new google.maps.LatLngBounds();
        if (polyline && polyline.getPath().length > 0) {
            polyline.getPath().getArray().forEach(function(latLng, index) {
                bounds.extend(latLng);
            });
        }
        return bounds;
    };
    
    this.fitToBounds = function() {
        console.debug('fitToBounds');
        var bounds = new google.maps.LatLngBounds();
        $.each(this.markers, function(i, marker) {
            bounds.extend(marker.position);
        });
        $.each(this.tracks, function(i, track) {
            console.debug('track:', track);
            $.each(track.path, function(i, pt) {
                bounds.extend(new google.maps.LatLng(pt.lat, pt.lng));
            });
            
        });
        this.map.fitBounds(bounds);
    };
    
    this.isRoad = function(track) {
        return this.getTrackType(track) == 'road';
    };
    
    this.isTrail = function(track) {
        return this.getTrackType(track) == 'trail';
    };
    
    this.getTrackType = function(track) {
        if (!track) {
            return '';
        } else if (track.source == 'DIR') {
            return 'road';
        } else {
            return 'trail';
        }
    }

    //************************************************************************//
    // SELECTION
    //************************************************************************//
     this.getItemType = function(item) {
        console.debug('getItemType:', item);
        if (!item) {
            return '';
        } else if (item.getDraggable && item.getDraggable() === true) {
            return 'marker';
        } else if (item.strokeColor) {
            return 'track';
        }
        console.error('unsupported item:', item);
    };
    
    this.addSelection = function(item) {
        //console.debug('addSelection:', item);
        if (!item) {return;}
        if (item.selected !== true) {
            this.selectionQueue.push(item);
            this.highlightItem(item);
            item.selected = true;
        } else {
            for (var i = this.selectionQueue.length; i--;) {
                if (this.selectionQueue[i].id === item.id) {
                    this.selectionQueue.splice(i, 1);
                    break;
                }
            }            
            this.unhighlightItem(item);
            item.selected = false;
        }
        console.debug('addSelection, selectionQueue:', this.selectionQueue);
    };
    
    this.highlightItem = function(item) {
        switch (this.getItemType(item)) {
            case 'marker': MapUtils.highlightMarker(item); break;
//            case 'marker': item.setAnimation(google.maps.Animation.BOUNCE); break;
            case 'track':  item.setOptions(HIGHLIGHT_OPTIONS); break;
        }
    };
    
    this.unhighlightItem = function(item) {
        switch (this.getItemType(item)) {
            case 'marker': MapUtils.unhighlightMarker(item); break;
//            case 'marker': item.setAnimation(null); break;
            case 'track':  item.setOptions(ROAD_OPTIONS); break;
        }
    };
    
    this.clearSelections = function() {
        $.each(this.selectionQueue, function(i, item) {
            self.unhighlightItem(item);
        });
        this.selectionQueue = [];        
    }

    this.escapeClicked = function() {
        console.debug('esc clicked');
        this.clearSelections();
        this.snapToRoute.clear();
    };
    
    $('body').keyup(function(e) {
        //console.debug(event);
        switch(e.which) {
            case 27: self.escapeClicked(); break;
            case 46: self.deleteSelections(); break;
        }
    });
    

    this.deleteSelections = function() {
        if (confirm('Delete the selected items?')) {
            $.each(this.selectionQueue, function(i, item) {
                switch (self.getItemType(item)) {
                    case 'marker': self.deleteMarker(item); break;
                    case 'track':  self.deleteTrack(item); break;
                }
            });
        }
        this.clearSelections();
    };
    
    //************************************************************************//
    // UNDO
    //************************************************************************//
    this.saveHistory = function(route) {
        if (this.routeHistory.length > 3) {
            this.routeHistory.shift();
        }
        this.routeHistory.push(route);
    };
    
    this.undo = function() {
        if (this.routeHistory.length > 0) {
            this.renderRoute(this.routeHistory.pop());
        };
    }
    
    $(document).keydown(function(e){
        if (e.ctrlKey === true && e.shiftKey !== true && e.which == '90') {
            self.undo();
        }
    });
    
    //************************************************************************//
    // TITLES, LABELS, ETC.
    //************************************************************************//
    // Label is the little box under the label
    this.getMarkerLabelContent = function(marker) {
        return marker.index;
    };
    
    this.getMarkerTitle = function(marker) {
        return '{}. incr: {}, dist: {}, instructions: {}'.format(
                marker.index,
                marker.increment || '',
                marker.distance || '',
                marker.instructions || ''
        );
    };
    
    //************************************************************************//
    // TOOLTIPS (not being set for now)
    //************************************************************************//
    this.addTooltip = function(item) {
        var content, verticalOffset;
        
        switch(this.getItemType(item)) {
        case 'marker': 
            content = this.getMarkerTooltip(item);
            verticalOffset = 35;
            break;
        case 'track': 
            content = this.getTrackTooltip(item); 
            break;
        }
        
        var tooltip = new Tooltip({
            map: this.map,
            cssClass: 'tooltip',
            marker: item,
            content: content,
            verticalOffset: verticalOffset
        });
        item.tooltip = tooltip;
    };
    
    this.getMarkerTooltip = function(marker) {
        var arr = ['Waypoint ' + marker.index + ':'];
        arr.push(marker.id);
        if (marker.distance) {
            arr.push(marker.distance.toFixed(2) + ' mi');
        }
        if (marker.instructions) {
            arr.push(marker.instructions);
        }
        return arr.join(' ');
    }
    
    this.getTrackTooltip = function(track) {
        var arr = ['Track ' + track.index + ':'];
        if (track.name) {
            arr.push(track.name);
        }
        if (track.distance) {
            arr.push(track.distance.toFixed(2) + ' mi');
        }
        if (track.startPointId) {
            var marker = this.markerMap[track.startPointId];
            if (marker) {
                arr.push('from mkr ' + marker.index);
            }
        }
        if (track.endPointId) {
            var marker = this.markerMap[track.endPointId];
            if (marker) {
                arr.push('to mkr ' + marker.index);
            }
        }
        return arr.join(' ');
    };
    
    this.updateTooltips = function() {
        var self = this;
        $.each(this.markers, function(i, marker) {
            if (marker.tooltip) {
                marker.tooltip.setContent(self.getMarkerTooltip(marker));
            }
        });
    };

    //************************************************************************//
    // UPDATE ROUTESHEET
    //************************************************************************//
    this.updateRoutesheet = function() {
        // debug
        var markerCountBefore = this.markers.length;
        var trackCountBefore = this.tracks.length;
        
        var route = {
            markers: this.markers,
            markerMap: this.markerMap,
            tracks: this.tracks
        };
        this.saveHistory(route);
        var results = this.routesheetService.calculate(route);
        
        this.markers = results.markers; // have to reset since the order may change
        this.totalDistance = results.totalDistance;
        
        // debug
        var markerCountAfter = this.markers.length; // debug
        var trackCountAfter = this.tracks.length;; // debug
        console.debug('markerCountBefore:', markerCountBefore, 'markerCountAfter:', markerCountAfter);
        console.debug('trackCountBefore:', trackCountBefore, 'trackCountAfter:', trackCountAfter);
        if (markerCountAfter != markerCountBefore) {
            alert('Marker count changed!');
        }
        
        var self = this;
        $.each(this.markers, function(i, marker) {
            //console.debug('updated marker:', marker);
            marker.index = i;
//            marker.setTitle(self.getMarkerTitle(marker));
//            marker.label.setContent('' + i);
            marker.styleIcon.set('text', '' + i);  
        });
        
        this.updateTooltips();
        this.ctrl.refresh();
    };
    
};
