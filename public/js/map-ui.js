app.factory('mapUI', function($window, $log, $document, markerService, trackService) {

    var currentPoint;
    var mapMenu = $('#mapMenu');
    var selectionQueue = [];
    setKeyHandlers();

    return {
        setCurrentPoint: setCurrentPoint,
        openMapMenu: openMapMenu,
        addSelection: addSelection,
        highlightItem: highlightItem,
        unhighlightItem: unhighlightItem
    };

    function setKeyHandlers() {
        
        $document.keydown(function(e){
            if (e.ctrlKey === true && e.shiftKey !== true && e.which == '90') {
                undo();
            }
        });

        $('body').keyup(function(e) {
            //$log.debug(event);
            switch(e.which) {
                case 27: escapeClicked(); break;
                case 46: deleteSelections(); break;
            }
        });

    }

    function setCurrentPoint(e) {
        $log.debug('v click:', e);
        currentPoint = e;
    }

    function openMapMenu(e) {
        setCurrentPoint(e);
        mapMenu.position({
            my: 'left top',
            at: 'left+{} top+{}'.format(e.pixel.x + 53, e.pixel.y),
            of: '#mapCanvas'
        });
        mapMenu.contextMenu();
    }

    //************************************************************************//
    // SELECTION
    //************************************************************************//
    function getItemType(item) {
        $log.debug('getItemType:', item);
        if (!item) {
            return '';
        } else if (item.getDraggable && item.getDraggable() === true) {
            return 'marker';
        } else if (item.strokeColor) {
            return 'track';
        }
        $log.error('unsupported item:', item);
    }

    function addSelection(item) {
        //$log.debug('addSelection:', item);
        if (!item) {return;}
        if (item.selected !== true) {
            selectionQueue.push(item);
            highlightItem(item);
            item.selected = true;
        } else {
            for (var i = selectionQueue.length; i--;) {
                if (selectionQueue[i].id === item.id) {
                    selectionQueue.splice(i, 1);
                    break;
                }
            }
            unhighlightItem(item);
            item.selected = false;
        }
        $log.debug('addSelection, selectionQueue:', selectionQueue);
    }

    function highlightItem(item) {
        switch (getItemType(item)) {
            case 'marker': MapUtils.highlightMarker(item); break;
//            case 'marker': item.setAnimation(google.maps.Animation.BOUNCE); break;
            case 'track':  item.setOptions(HIGHLIGHT_OPTIONS); break;
        }
    }

    function unhighlightItem(item) {
        switch (getItemType(item)) {
            case 'marker': MapUtils.unhighlightMarker(item); break;
//            case 'marker': item.setAnimation(null); break;
            case 'track':  item.setOptions(ROAD_OPTIONS); break;
        }
    }

    function clearSelections() {
        $.each(selectionQueue, function(i, item) {
            unhighlightItem(item);
        });

    }

    function escapeClicked() {
        $log.debug('esc clicked');
        clearSelections();
        //this.snapToRoute.clear();
    }


    function deleteSelections() {
        if ($window.confirm('Delete the selected items?')) {
            $.each(selectionQueue, function(i, item) {
                switch (getItemType(item)) {
                    case 'marker': markerService.deleteMarker(item); break;
                    case 'track':  trackService.deleteTrack(item); break;
                }
            });
        }
        clearSelections();
    }

    //************************************************************************//
    // UNDO
    //************************************************************************//
    //function saveHistory(route) {
    //    if (routeHistory.length > 3) {
    //        routeHistory.shift();
    //    }
    //    routeHistory.push(route);
    //}
    //
    //function undo() {
    //    if (routeHistory.length > 0) {
    //        renderRoute(routeHistory.pop());
    //    }
    //}

});
