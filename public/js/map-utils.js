aapp.factory('MapUtils', function($log) {

    return {
        isRoad: isRoad,
        isTrail: isTrail
    };


    function isRoad(track) {
        return getTrackType(track) == 'road';
    }

    function isTrail(track) {
        return getTrackType(track) == 'trail';
    }

    function getTrackType(track) {
        if (!track) {
            return '';
        } else if (track.source == 'DIR') {
            return 'road';
        } else {
            return 'trail';
        }
    }



});
