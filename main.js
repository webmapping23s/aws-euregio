/* Wetterstationen Euregio Beispiel */

// Innsbruck
let ibk = {
    lat: 47.267222,
    lng: 11.392778
};

// Karte initialisieren
let map = L.map("map", {
    fullscreenControl: true,
}).setView([ibk.lat, ibk.lng], 11);

// thematische Layer
let themaLayer = {
    stations: L.featureGroup(),
    temperature: L.featureGroup(),
    windspeed: L.featureGroup(),
    snow: L.featureGroup(),
}

// Hintergrundlayer
let layerControl = L.control.layers({
    "Relief avalanche.report": L.tileLayer(
        "https://static.avalanche.report/tms/{z}/{x}/{y}.webp", {
        attribution: `© <a href="https://lawinen.report">CC BY avalanche.report</a>`,
        maxZoom: 12,
    }).addTo(map),
    "Openstreetmap": L.tileLayer.provider("OpenStreetMap.Mapnik"),
    "Esri WorldTopoMap": L.tileLayer.provider("Esri.WorldTopoMap"),
    "Esri WorldImagery": L.tileLayer.provider("Esri.WorldImagery")
}, {
    "Wetterstationen": themaLayer.stations,
    "Temperatur": themaLayer.temperature,
    "Windgeschwindigkeit": themaLayer.windspeed,
    "Schneehöhe (cm)": themaLayer.snow.addTo(map), 
}).addTo(map);

layerControl.expand();

// Maßstab
L.control.scale({
    imperial: false,
}).addTo(map);

function getColor(value, ramp) {
    for (let rule of ramp) {
        if (value >= rule.min && value < rule.max) {
            return rule.color;
        }
    }
}

function writeStationLayer(jsondata) {
    // Wetterstationen mit Icons und Popups implementieren
    L.geoJSON(jsondata, {
        pointToLayer: function (feature, latlng) {
            //console.log(feature.properties)
            return L.marker(latlng, {
                icon: L.icon({
                    iconUrl: `icons/wifi.png`,
                    iconAnchor: [16, 37],
                    popupAnchor: [0, -37],
                })
            });
        },
        onEachFeature: function (feature, layer) {
            let prop = feature.properties;
            let pointInTime = new Date(prop.date);
            layer.bindPopup(`
                    <h4>${prop.name} (${feature.geometry.coordinates[2]}m)</h4>
                    <ul>
                        <li>Lufttemperatur (°C): ${prop.LT || "-"}</li>
                        <li>Relative Luftfeuchte (%): ${prop.RH || "-"}</li>
                        <li>Windgeschwindigkeit (km/h): ${prop.WG ? prop.WG.toFixed(1) : "-"}</li>
                        <li>Schneehöhe (cm): ${prop.HS || "-"}</li>
                    </ul>
                    <span>${pointInTime.toLocaleString()}</span>
                `);
        }
    }).addTo(themaLayer.stations);
}

function writeTemperatureLayer(jsondata) {
    L.geoJSON(jsondata, {
        filter: function(feature) {
            if (feature.properties.LT > -50 && feature.properties.LT < 50) {
                return true;
            }
        },
        pointToLayer: function (feature, latlng) {
            let color = getColor(feature.properties.LT, COLORS.temperature);
            console.log("Color: ", color);
            return L.marker(latlng, {
                icon: L.divIcon({
                    className: "aws-div-icon",
                    html: `<span style="background-color:${color}">${feature.properties.LT.toFixed(1)}</span>`
                })
            });
        },
    }).addTo(themaLayer.temperature);
}

function writeWindspeedLayer(jsondata) {
    L.geoJSON(jsondata, {
        filter: function(feature) {
            if (feature.properties.WG >= 0 && feature.properties.WG < 70) {
                return true;
            }
        },
        pointToLayer: function (feature, latlng) {
            let wg_kmh = feature.properties.WG;
            let color = getColor(wg_kmh, COLORS.wind);
            return L.marker(latlng, {
                icon: L.divIcon({
                    className: "aws-div-icon",
                    html: `<span style="background-color:${color}">${wg_kmh.toFixed(1)}</span>`
                })
            });
        },
    }).addTo(themaLayer.windspeed);
}

function writeSnowLayer(jsondata) {
    L.geoJSON(jsondata, {
        filter: function(feature) {
            if (feature.properties.HS > 0 && feature.properties.HS < 9999) {
                return true;
            }
        },
        pointToLayer: function (feature, latlng) {
            let color = getColor(feature.properties.HS, COLORS.snow);
            return L.marker(latlng, {
                icon: L.divIcon({
                    className: "aws-div-icon",
                    html: `<span style="background-color:${color}">${feature.properties.HS.toFixed(1)}</span>`
                })
            });
        },
    }).addTo(themaLayer.snow);
}

async function loadStations(url) {
    let response = await fetch(url);
    let jsondata = await response.json();
    writeStationLayer(jsondata);
    writeTemperatureLayer(jsondata);
    writeWindspeedLayer(jsondata);
    writeSnowLayer(jsondata);

}
loadStations("https://static.avalanche.report/weather_stations/stations.geojson");
