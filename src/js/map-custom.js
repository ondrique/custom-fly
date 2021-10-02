"use strict";

function createListingsMap(options) {
    var defaults = {
        markerPath: "img/marker-plane.svg",
        markerPathHighlight: "img/marker-plane-hover.svg",
        imgBasePath: "img/photo/",
        pointPopupType: "venue",
        linePopupType: "flight",
        useTextIcon: false,
        interactivity: true,
        tileLayer: {
            tiles: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
        },
    };

    var settings = Object.assign({}, defaults, options);

    var dragging = false,
        tap = false;

    if (window.outerWidth > 700) {
        dragging = true;
        tap = true;
    }

    /* 
    ====================================================
      Create and center the base map
    ====================================================
    */

    var map = L.map(settings.mapId, {
        zoom: settings.zoomLevel,
        maxZoom: settings.maxZoom,
        dragging: dragging,
        tap: tap,
        scrollWheelZoom: false,
    });

    map.addEventListener(
        "focus",
        function () {
            map.scrollWheelZoom.enable();
        },
        { once: true }
    );

    L.tileLayer(settings.tileLayer.tiles, {
        attribution: settings.tileLayer.attribution,
        minZoom: 1,
        maxZoom: 19,
    }).addTo(map);

    /* 
    ====================================================
      Load GeoJSON file with the data 
      about the listings
    ====================================================
    */

    var xhr = new XMLHttpRequest();
    xhr.open("GET", settings.jsonFile, true);

    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 400) {
            // Success!
            var data = JSON.parse(xhr.responseText);

            L.geoJSON(data, {
                pointToLayer: pointToLayer,
                onEachFeature: onEachFeature,
            }).addTo(map);

            if (markersGroup) {
                var featureGroup = new L.featureGroup(markersGroup);
                map.fitBounds(featureGroup.getBounds(), { padding: [20, 20] });
            }
        } else {
            // We reached our target server, but it returned an error
        }
    };

    xhr.onerror = function () {
        console.log(error);
    };

    xhr.send();

    /* 
    ====================================================
      Bind popup and highlighting features 
      to each marker
    ====================================================
    */

    var markersGroup = [];

    function onEachFeature(feature, layer) {
        // Define default & highlight markers if geometry type is Point & switch between them on hover
        if (feature.geometry.type == "Point") {
            var defaultIcon = {
                iconUrl: feature.properties.marker,
                iconSize: [25, 37.5],
                popupAnchor: [0, -35],
                iconAnchor: [13, 38],
                tooltipAnchor: [0, 19],
                ...(settings.interactivity && {
                    className: "marker-hover-effect",
                }),
            };
            var highlightIcon = Object.assign({}, defaultIcon);
            highlightIcon.iconSize = [28, 42];
            highlightIcon.iconAnchor = [13, 43];

            if (settings.interactivity) {
                layer.on({
                    mouseover: highlight,
                    mouseout: reset,
                });
            }
        }

        // Set Line style, change it on hover
        if (feature.properties && feature.geometry.type == "LineString") {
            // Route default style
            var defaultRouteStyle = {
                ...(feature.properties["fill"] !== null && {
                    fillColor: feature.properties["fill"],
                }),
                ...(feature.properties["fill-opacity"] !== null && {
                    fillOpacity: feature.properties["fill-opacity"],
                }),
                ...(feature.properties["stroke-opacity"] !== null && {
                    opacity: feature.properties["stroke-opacity"],
                }),
                ...(feature.properties["stroke-width"] !== null && {
                    weight: feature.properties["stroke-width"],
                }),
                ...(feature.properties["stroke"] !== null && {
                    color: feature.properties["stroke"],
                }),
            };

            layer.setStyle(defaultRouteStyle);

            if (settings.interactivity) {
                layer.addEventListener("mouseover", function () {
                    this.setStyle({
                        fillOpacity: 0.08,
                        fillColor: "#D21209",
                        weight: 3.5,
                        color: "#A50700",
                    });
                });
                layer.addEventListener("mouseout", function () {
                    this.setStyle(defaultRouteStyle);
                });
            }
        }

        if (
            feature.properties &&
            feature.properties.about &&
            settings.interactivity === true
        ) {
            if (
                feature.geometry.type === "Point" &&
                feature.properties.isActive
            ) {
                layer.bindPopup(
                    getPopupContent(
                        feature.properties,
                        settings.pointPopupType
                    ),
                    {
                        minwidth: 200,
                        maxWidth: 600,
                        className: "map-custom-popup",
                    }
                );
            } else if (feature.geometry.type === "LineString") {
                layer.bindPopup(
                    getPopupContent(feature.properties, settings.linePopupType),
                    {
                        minwidth: 200,
                        maxWidth: 600,
                        className: "map-custom-popup",
                    }
                );
            }

            if (settings.useTextIcon) {
                layer.bindTooltip(
                    '<div id="customTooltip-' +
                        feature.properties.id +
                        '">$' +
                        feature.properties.price +
                        "</div>",
                    {
                        direction: "top",
                        permanent: true,
                        opacity: 1,
                        interactive: true,
                        className: "map-custom-tooltip",
                    }
                );
            }
        }
        markersGroup.push(layer);

        // change marker on hover
        function highlight(e) {
            e.target.setIcon(L.icon(highlightIcon));
            if (settings.useTextIcon) {
                findTooltip(e.target).addClass("active");
            }
        }

        // reset marker on unhover
        function reset(e) {
            e.target.setIcon(L.icon(defaultIcon));
            if (settings.useTextIcon) {
                findTooltip(e.target).removeClass("active");
            }
        }
    }

    function pointToLayer(feature, latlng) {
        if (settings.useTextIcon) {
            var markerOpacity = 0;
        } else {
            var markerOpacity = 1;
        }

        return L.marker(latlng, {
            icon: L.icon({
                iconUrl: feature.properties.marker,
                iconSize: [25, 37.5],
                popupAnchor: [0, -35],
                iconAnchor: [13, 38],
                tooltipAnchor: [0, 19],
                ...(settings.interactivity && {
                    className: "marker-hover-effect",
                }),
            }),
            id: feature.properties.id,
            opacity: markerOpacity,
        });
    }

    function findTooltip(marker) {
        var tooltip = marker.getTooltip();

        var ids = document.querySelectorAll(`div .${tooltip._content}`);
        for (var id of ids) {
            return id.closest(".leaflet-tooltip");
        }
    }

    /* 
    ====================================================
      Construct popup content based on the JSON data
      for each marker
    ====================================================
    */

    function getPopupContent(properties, layerType) {
        if (properties.name) {
            var title =
                '<h6><a class="text-reset text-decoration-none text-hover-primary stretched-link" href="' +
                properties.link +
                '" target="_blank">' +
                properties.name +
                "</a></h6>";
        } else {
            title = "";
        }

        if (properties.about) {
            var about = '<p class="">' + properties.about + "</p>";
        } else {
            about = "";
        }

        if (properties.image) {
            var imageClass = "image";
            if (layerType == "venue") {
                imageClass += " d-none d-md-block";
            }

            var image =
                '<div class="' +
                imageClass +
                '" style="background-image: url(\'' +
                settings.imgBasePath +
                properties.image +
                "')\"></div>";
        } else {
            image = '<div class="image"></div>';
        }

        if (properties.address) {
            var address =
                '<p class="text-muted mb-1"><i class="fas fa-map-marker-alt fa-fw text-dark mr-2"></i>' +
                properties.address +
                "</p>";
        } else {
            address = "";
        }
        if (properties.email) {
            var email =
                '<p class="text-muted mb-1"><i class="fas fa-envelope-open fa-fw text-dark mr-2"></i><a href="mailto:' +
                properties.email +
                '" class="text-muted">' +
                properties.email +
                "</a></p>";
        } else {
            email = "";
        }
        if (properties.phone) {
            var phone =
                '<p class="text-muted mb-1"><i class="fa fa-phone fa-fw text-dark mr-2"></i>' +
                properties.phone +
                "</p>";
        } else {
            phone = "";
        }

        if (properties.stars) {
            var stars = '<div class="text-xs">';
            for (var step = 1; step <= 5; step++) {
                if (step <= properties.stars) {
                    stars += "<i class='fa fa-star text-warning'></i>";
                } else {
                    stars += "<i class='fa fa-star text-gray-300'></i>";
                }
            }
            stars += "</div>";
        } else {
            stars = "";
        }

        if (properties.url) {
            var url =
                '<a href="' +
                properties.url +
                '">' +
                properties.url +
                "</a><br>";
        } else {
            url = "";
        }

        if (properties.price) {
            var price =
                '<p class="text-sm mb-0">from <strong class="fw-bold">' +
                properties.price +
                "</strong></p>";
        } else {
            price = "";
        }

        var popupContent = "";

        if (layerType == "venue") {
            popupContent =
                '<div class="popup-venue">' +
                image +
                '<div class="text">' +
                title +
                about +
                address +
                email +
                phone +
                "</div>" +
                "</div>";
        } else if (layerType == "rental") {
            popupContent =
                '<div class="popup-rental">' +
                image +
                '<div class="text">' +
                title +
                address +
                "</div>" +
                "</div>";
        } else if (layerType == "flight") {
            popupContent =
                '<div class="popup-rental">' +
                image +
                '<div class="text">' +
                title +
                price +
                "</div>" +
                "</div>";
        }

        return popupContent;
    }

    /* 
    ====================================================
      Highlight marker when users hovers above
      corresponding .card in the listing
    ====================================================
    */

    L.Map.include({
        getMarkerById: function (id) {
            var marker = null;
            this.eachLayer(function (layer) {
                if (layer instanceof L.Marker) {
                    if (layer.options.id === id) {
                        marker = layer;
                    }
                }
            });
            return marker;
        },
    });

    const markerIds = document.querySelectorAll(
        '[data-marker-id]:not([data-marker-id=""]'
    );
    markerIds.forEach(function (el) {
        if (el) {
            el.addEventListener("mouseenter", function () {
                var markerId = el.getAttribute("data-marker-id");
                var marker = map.getMarkerById(markerId);
                if (marker) {
                    highlight(marker);
                }
            });
            el.addEventListener("mouseleave", function () {
                var markerId = el.getAttribute("data-marker-id");
                var marker = map.getMarkerById(markerId);
                if (marker) {
                    reset(marker);
                }
            });
        }
    });
}
