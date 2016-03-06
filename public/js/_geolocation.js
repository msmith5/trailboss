$(function () {
    $("#showMyLocation").click(function (event) {
        event.preventDefault();
        $(this).html('Determining address...');
        navigator.geolocation.getCurrentPosition(function (position) {
            var geocoder = new google.maps.Geocoder();
            var latLng   = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            geocoder.geocode({'latLng': latLng}, function (results, status) {
                for (var i = 0; i < results[0].address_components.length; i++) {
                    var address = results[0].address_components[i];
                    if (address.types[0] == "postal_code") {
                        $('#zipcode').html(address.long_name);
                        $('#location').html(results[0].formatted_address);
                        $('#showMyLocation').hide();
                    }
                }
            });
        });
        return false;
    });
});
