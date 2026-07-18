/**
 * Native map (iOS/Android) — an OpenStreetMap map rendered with Leaflet inside
 * a WebView. This is keyless, so it works in **Expo Go** on both platforms
 * (react-native-maps needs a Google Maps API key on Android, which Expo Go
 * can't provide → blank map). The web build uses PlacesMap.web.tsx instead.
 *
 * Data flows in via injected JS (`window.__setData`); marker taps flow back out
 * via `postMessage`. Pins are vector circles coloured by category; the view
 * auto-fits the current results.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { useTheme } from "@/theme/ThemeProvider";

import { categoryColorRole, countyCenter } from "../places";
import { type PlacesMapProps } from "./types";

function buildHtml(lat: number, lng: number, bg: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;padding:0;background:${bg};}</style>
</head>
<body>
<div id="map"></div>
<script>
  function post(m){ if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } }
  try {
    var map = L.map('map', { zoomControl: true }).setView([${lat}, ${lng}], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    var layer = L.layerGroup().addTo(map);
    window.__setData = function(json){
      var d = (typeof json === 'string') ? JSON.parse(json) : json;
      layer.clearLayers();
      var bounds = [];
      (d.places || []).forEach(function(p){
        var sel = p.id === d.selectedId;
        var mk = L.circleMarker([p.lat, p.lng], {
          radius: sel ? 11 : 7,
          color: sel ? '#ffffff' : p.color,
          fillColor: p.color, fillOpacity: 1, weight: sel ? 3 : 2
        });
        mk.on('click', function(){ post({ type: 'select', id: p.id }); });
        mk.addTo(layer);
        bounds.push([p.lat, p.lng]);
      });
      if (bounds.length === 1) { map.setView(bounds[0], 14); }
      else if (bounds.length > 1) { map.fitBounds(bounds, { padding: [48,48], maxZoom: 15 }); }
    };
    post({ type: 'ready' });
  } catch (e) { post({ type: 'error', message: String(e) }); }
</script>
</body>
</html>`;
}

export function PlacesMap({ county, places, selectedId, onSelect }: PlacesMapProps) {
  const theme = useTheme();
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const center = countyCenter(county);

  // The HTML shell is stable per county centre + theme; data is pushed in.
  const html = useMemo(
    () => buildHtml(center.lat, center.lng, theme.colors.chipBg),
    [center.lat, center.lng, theme.colors.chipBg],
  );

  const payload = useMemo(
    () =>
      JSON.stringify({
        places: places.map((p) => ({
          id: p.id,
          lat: p.lat,
          lng: p.lng,
          color: theme.colors[categoryColorRole(p.category)],
        })),
        selectedId,
      }),
    [places, selectedId, theme.colors],
  );

  const push = useCallback(() => {
    webRef.current?.injectJavaScript(
      `window.__setData(${JSON.stringify(payload)}); true;`,
    );
  }, [payload]);

  // Push new data whenever it changes (once the map has signalled ready).
  useEffect(() => {
    if (readyRef.current) push();
  }, [push]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "ready") {
        readyRef.current = true;
        push();
      } else if (msg.type === "select") {
        onSelect(msg.id);
      }
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.chipBg }]}>
      <WebView
        ref={webRef}
        source={{ html }}
        onMessage={onMessage}
        originWhitelist={["*"]}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: "transparent" },
});
