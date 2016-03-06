function MapManager(id, ctrl) {
    this.ctrl = ctrl;
    var self = this;

    this.map = new google.maps.Map($('#' + id)[0], {
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        rotateControl: false,
        overviewMapControl: true,
        zoomControl: false,
        mapTypeControl: true
    });

    this.setCenter = function(lat, lng) {
        this.map.setCenter(new google.maps.LatLng(lat, lng));
    };

    this.setCenterBrowser = function() {
        navigator.geolocation.getCurrentPosition(function (position) {
            var lat  = position.coords.latitude;
            var lng = position.coords.longitude;
            self.map.setCenter(new google.maps.LatLng(lat, lng));

        });
    };

    this.getMap = function() {
        return this.map;
    };

    this.setZoom = function(zoom) {
        this.map.setZoom(zoom);
    };

    this.getZoom = function() {
        return this.map.getZoom();
    }


}
