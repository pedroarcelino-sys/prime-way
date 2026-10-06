(function () {
    "use strict";

    function distanceMeters(latitude, longitude, school) {
        const radians = degrees => degrees * Math.PI / 180;
        const a = Math.sin(radians(school.latitude - latitude) / 2) ** 2
            + Math.cos(radians(latitude)) * Math.cos(radians(school.latitude))
            * Math.sin(radians(school.longitude - longitude) / 2) ** 2;
        return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
    }

    function proximity(distance, radius) {
        if (distance <= radius) return { key: "inside", text: `Dentro do raio de ${radius} m` };
        if (distance <= radius * 3) return { key: "approaching", text: "Aproximando-se" };
        return { key: "outside", text: "Fora do raio" };
    }

    let leafletReady;
    function loadLeaflet() {
        if (!leafletReady) {
            // Carregamento restrito a esta tela, sem bloquear o restante do portal.
            const asset = (tag, url, integrity) => new Promise((resolve, reject) => {
                const element = document.createElement(tag);
                const timeout = setTimeout(() => finish(false), 10000);
                function finish(ok) {
                    clearTimeout(timeout);
                    element.onload = element.onerror = null;
                    if (ok) resolve();
                    else { element.remove(); reject(new Error("Mapa indisponível")); }
                }
                element.integrity = integrity;
                element.crossOrigin = "anonymous";
                element.onload = () => finish(true);
                element.onerror = () => finish(false);
                if (tag === "link") { element.rel = "stylesheet"; element.href = url; }
                else { element.src = url; element.async = true; }
                document.head.append(element);
            });
            leafletReady = Promise.all([
                asset("link", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
                    "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="),
                asset("script", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
                    "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=")
            ]).then(() => window.L);
        }
        return leafletReady;
    }

    function create(element, notice) {
        let map, schoolMarker, radiusCircle, guardianMarker, school, configKey;
        let currentPosition = null; // Somente a posição mais recente; nunca uma trilha.
        let fitted = false;

        function showPosition() {
            if (!map || !currentPosition) return;
            const point = [currentPosition.latitude, currentPosition.longitude];
            if (!guardianMarker) {
                guardianMarker = window.L.circleMarker(point, {
                    radius: 9, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1
                }).addTo(map).bindTooltip("Sua posição");
            } else guardianMarker.setLatLng(point);
            const inside = distanceMeters(...point, school) <= school.radiusMeters;
            radiusCircle.setStyle({ color: inside ? "#059669" : "#2563eb" });
            if (!fitted) {
                map.fitBounds(radiusCircle.getBounds().extend(point), { padding: [30, 30], maxZoom: 16 });
                fitted = true;
            }
        }

        async function configure(location) {
            const key = JSON.stringify(location);
            if (!location || key === configKey) return;
            configKey = key;
            school = location;
            try {
                const L = await loadLeaflet();
                if (configKey !== key) return;
                if (!map) {
                    map = L.map(element, {
                        scrollWheelZoom: false, center: [school.latitude, school.longitude], zoom: 16
                    });
                    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                        maxZoom: 19,
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }).on("tileerror", () => {
                        notice.textContent = "Não foi possível carregar parte do mapa. O GPS e a solicitação continuam disponíveis.";
                    }).addTo(map);
                    if (window.ResizeObserver) {
                        new ResizeObserver(() => map.invalidateSize({ pan: false })).observe(element);
                    }
                }
                const point = [school.latitude, school.longitude];
                const label = document.createElement("span");
                label.textContent = school.name;
                if (!schoolMarker) {
                    schoolMarker = L.marker(point, {
                        title: "Escola", icon: L.divIcon({ className: "pickup-school-marker", html: "🏫", iconSize: [36, 36], iconAnchor: [18, 18] })
                    }).addTo(map).bindTooltip(label);
                    radiusCircle = L.circle(point, { radius: school.radiusMeters, color: "#2563eb", weight: 2, fillOpacity: 0.12 }).addTo(map);
                } else {
                    schoolMarker.setLatLng(point).setTooltipContent(label);
                    radiusCircle.setLatLng(point).setRadius(school.radiusMeters);
                }
                map.fitBounds(radiusCircle.getBounds(), { padding: [30, 30], maxZoom: 16 });
                fitted = false;
                notice.textContent = "Escola e raio de retirada. O ponto azul indica sua posição enquanto o GPS está ativo.";
                showPosition();
            } catch {
                notice.textContent = "Mapa indisponível. Você ainda pode usar o GPS, acompanhar a distância e cancelar a solicitação. Recarregue a página para tentar o mapa novamente.";
            }
        }

        return {
            configure,
            update(latitude, longitude) {
                currentPosition = { latitude, longitude };
                showPosition();
            },
            clearPosition() {
                currentPosition = null;
                fitted = false;
                if (guardianMarker) guardianMarker.remove();
                guardianMarker = null;
                if (map && radiusCircle) {
                    radiusCircle.setStyle({ color: "#2563eb" });
                    map.fitBounds(radiusCircle.getBounds(), { padding: [30, 30], maxZoom: 16, animate: false });
                }
            }
        };
    }

    window.PrimeWayPickupMap = Object.freeze({ distanceMeters, proximity, create });
})();
