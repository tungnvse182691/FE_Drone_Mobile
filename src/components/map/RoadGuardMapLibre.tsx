import React, { useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Text, Pressable, Platform, StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../design-tokens';

export interface MapMarker {
  id: string;
  title: string;
  subtitle?: string;
  coordinate: [number, number]; // [lng, lat]
  type?: 'defect' | 'vehicle' | 'survey';
  severity?: 'high' | 'medium' | 'low';
  active?: boolean;
}

export interface RoadGuardMapProps {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  markers?: MapMarker[];
  routeCoordinates?: [number, number][]; // [lng, lat][]
  onMarkerPress?: (markerId: string) => void;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  offlineBannerText?: string;
  controlsTopOffset?: number;
}

export function RoadGuardMapLibre({
  center = [107.0125, 10.9634], // QL.1A Km1842+150 Trảng Bom, Đồng Nai
  zoom = 15,
  markers = [],
  routeCoordinates = [],
  onMarkerPress,
  style,
  interactive = true,
  offlineBannerText = 'Ngoại tuyến: Sơ đồ tim đường vector (Offline Schematic)',
  controlsTopOffset = spacing.sm,
}: RoadGuardMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [layerType, setLayerType] = useState<'streets' | 'satellite'>('streets');
  const [loadError, setLoadError] = useState(false);

  // Generate HTML for MapLibre GL JS (Official WebGL Engine)
  const mapHtml = useMemo(() => {
    const markersJson = JSON.stringify(markers);
    const routeJson = JSON.stringify(routeCoordinates);
    const centerLng = center[0];
    const centerLat = center[1];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #F8F9FA; font-family: -apple-system, Roboto, sans-serif; }
    .custom-defect-container {
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .custom-defect-pin {
      width: 36px;
      height: 36px;
      background: #E5484D;
      border: 2.5px solid #FFFFFF;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .custom-defect-icon {
      transform: rotate(45deg);
      font-size: 16px;
      line-height: 1;
    }
    .custom-defect-label {
      margin-top: 4px;
      background: rgba(26, 29, 32, 0.9);
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      white-space: nowrap;
    }
    .custom-vehicle-container {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      width: 40px;
      height: 40px;
    }
    .vehicle-puck {
      width: 22px;
      height: 22px;
      background: #1A73E8;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      z-index: 2;
    }
    .vehicle-pulse {
      position: absolute;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(26, 115, 232, 0.35);
      animation: pulse 1.8s infinite ease-out;
      z-index: 1;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    .maplibregl-popup-content {
      border-radius: 12px;
      padding: 10px;
      border: 1px solid #E2E5E9;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .popup-title {
      font-weight: 700;
      color: #1A1D20;
      font-size: 13px;
      margin-bottom: 2px;
    }
    .popup-sub {
      color: #555F71;
      font-size: 11px;
    }
    .popup-btn {
      display: inline-block;
      margin-top: 6px;
      padding: 5px 12px;
      background: #C9A227;
      color: #fff;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    try {
      // Modern Google Maps style raster tiles
      var styleStreet = {
        version: 8,
        sources: {
          'google-streets': {
            type: 'raster',
            tiles: ['https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'],
            tileSize: 256,
            attribution: '&copy; Google Maps &mdash; Cát Tường GIS'
          }
        },
        layers: [
          {
            id: 'google-streets-layer',
            type: 'raster',
            source: 'google-streets',
            minzoom: 0,
            maxzoom: 20
          }
        ]
      };

      // Modern Google Hybrid Satellite style raster tiles
      var styleSatellite = {
        version: 8,
        sources: {
          'google-satellite': {
            type: 'raster',
            tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
            tileSize: 256,
            attribution: '&copy; Google Satellite &mdash; Cát Tường GIS'
          }
        },
        layers: [
          {
            id: 'google-satellite-layer',
            type: 'raster',
            source: 'google-satellite',
            minzoom: 0,
            maxzoom: 20
          }
        ]
      };

      var map = new maplibregl.Map({
        container: 'map',
        style: '${layerType}' === 'satellite' ? styleSatellite : styleStreet,
        center: [${centerLng}, ${centerLat}],
        zoom: ${zoom},
        interactive: ${interactive},
        attributionControl: false,
        pitch: 35
      });

      var markers = ${markersJson};
      var route = ${routeJson};

      map.on('load', function() {
        // Draw Navigation Route Line
        if (route && route.length > 1) {
          map.addSource('route-source', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: route
              }
            }
          });

          // Route casing (dark gold outline)
          map.addLayer({
            id: 'route-casing',
            type: 'line',
            source: 'route-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#8C6D1F', 'line-width': 8, 'line-opacity': 0.6 }
          });

          // Route core (vibrant primary gold)
          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#C9A227', 'line-width': 5, 'line-opacity': 1.0 }
          });
        }

        // Add Google-style 3D Markers
        markers.forEach(function(m) {
          var container = document.createElement('div');
          
          if (m.type === 'vehicle') {
            container.className = 'custom-vehicle-container';
            container.innerHTML = '<div class="vehicle-pulse"></div><div class="vehicle-puck"></div>';
          } else {
            container.className = 'custom-defect-container';
            container.innerHTML = 
              '<div class="custom-defect-pin"><div class="custom-defect-icon">⚠️</div></div>' +
              '<div class="custom-defect-label">' + (m.id || 'Lỗi') + '</div>';
          }

          var popupContent = '<div style="padding:4px;">' +
            '<div class="popup-title">' + (m.title || '') + '</div>' +
            (m.subtitle ? '<div class="popup-sub">' + m.subtitle + '</div>' : '') +
            '<a class="popup-btn" href="javascript:void(0);" onclick="window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: \\'MARKER_CLICK\\', id: \\'' + m.id + '\\' }))">Xem chi tiết</a>' +
            '</div>';

          var popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(popupContent);

          new maplibregl.Marker({ element: container, anchor: m.type === 'vehicle' ? 'center' : 'bottom' })
            .setLngLat(m.coordinate)
            .setPopup(popup)
            .addTo(map);
        });

        // Auto-fit bounds so BOTH vehicle and destination are in full view!
        if (markers && markers.length > 0) {
          var bounds = new maplibregl.LngLatBounds();
          markers.forEach(function(m) { bounds.extend(m.coordinate); });
          if (route && route.length > 0) {
            route.forEach(function(c) { bounds.extend(c); });
          }
          map.fitBounds(bounds, {
            padding: { top: 70, bottom: 70, left: 60, right: 60 },
            maxZoom: 16.5,
            duration: 800
          });
        }
      });

      window.mapInstance = map;
      window.zoomIn = function() {
        if (window.mapInstance) window.mapInstance.zoomIn({ duration: 250 });
      };
      window.zoomOut = function() {
        if (window.mapInstance) window.mapInstance.zoomOut({ duration: 250 });
      };
      window.resetNorth = function() {
        if (window.mapInstance) window.mapInstance.resetNorthPitch({ duration: 350 });
      };
      window.recenter = function() {
        if (!window.mapInstance) return;
        var markers = ${markersJson};
        var route = ${routeJson};
        if (markers && markers.length > 0) {
          var bounds = new maplibregl.LngLatBounds();
          markers.forEach(function(m) { bounds.extend(m.coordinate); });
          if (route && route.length > 0) {
            route.forEach(function(c) { bounds.extend(c); });
          }
          window.mapInstance.fitBounds(bounds, {
            padding: { top: 70, bottom: 70, left: 60, right: 60 },
            maxZoom: 16.5,
            duration: 700
          });
        } else {
          window.mapInstance.flyTo({ center: [${centerLng}, ${centerLat}], zoom: ${zoom}, pitch: 35, duration: 700 });
        }
      };
    } catch (e) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: e.message }));
      }
    }
  </script>
</body>
</html>
    `;
  }, [center, zoom, markers, routeCoordinates, layerType, interactive]);

  // Handle message from WebView (e.g. marker click)
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MARKER_CLICK' && onMarkerPress) {
        onMarkerPress(data.id);
      } else if (data.type === 'ERROR') {
        setLoadError(true);
      }
    } catch {
      // ignore
    }
  };

  // Render Fallback Offline Schematic when WebView fails or offline
  const renderOfflineFallback = () => (
    <View style={styles.offlineContainer}>
      <View style={styles.offlineBanner}>
        <Ionicons name="cloud-offline" size={14} color={colors.warning} />
        <Text style={[typography.labelSm, styles.offlineBannerText]}>{offlineBannerText}</Text>
      </View>

      {/* Schematic vector road map */}
      <View style={styles.schematicCanvas}>
        <View style={styles.schematicRoadBg} />
        <View style={styles.schematicRoadLine} />
        <View style={styles.schematicRoadDashed} />

        {/* Start / Vehicle Pin */}
        <View style={styles.schematicVehicle}>
          <View style={styles.vehicleHalo} />
          <View style={styles.vehicleDot} />
          <Text style={[typography.caption, styles.pinLabel]}>Xe thi công</Text>
        </View>

        {/* Route Line */}
        <View style={styles.schematicRouteTrack} />

        {/* Destination / Defect Pin */}
        <View style={styles.schematicDefect}>
          <Ionicons name="warning" size={16} color={colors.surface} />
          <View style={styles.defectPulse} />
          <Text style={[typography.caption, styles.defectLabel]}>Km1842+150</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {!loadError ? (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={styles.webview}
          onMessage={handleMessage}
          onError={() => setLoadError(true)}
          renderError={() => renderOfflineFallback()}
          scrollEnabled={false}
        />
      ) : (
        renderOfflineFallback()
      )}

      {/* Overlay Map Controls Toolbar */}
      {interactive && (
        <View style={[styles.controlsStack, { top: controlsTopOffset }]}>
          {/* Group 1: Map Layers & Offline Mode */}
          <View style={styles.controlGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chuyển lớp bản đồ vệ tinh"
              onPress={() => setLayerType(prev => (prev === 'streets' ? 'satellite' : 'streets'))}
              style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
            >
              <Ionicons
                name={layerType === 'satellite' ? 'map' : 'earth'}
                size={18}
                color={layerType === 'satellite' ? colors.primary : colors.neutral}
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mô phỏng chế độ ngoại tuyến"
              onPress={() => setLoadError(prev => !prev)}
              style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
            >
              <Ionicons
                name={loadError ? 'wifi' : 'cloud-offline-outline'}
                size={18}
                color={loadError ? colors.warning : colors.neutral}
              />
            </Pressable>
          </View>

          {/* Group 2: Navigation & Orientation */}
          <View style={styles.controlGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Định vị tâm lộ trình"
              onPress={() => webViewRef.current?.injectJavaScript('window.recenter && window.recenter(); true;')}
              style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
            >
              <Ionicons name="locate" size={18} color={colors.primary} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đặt lại hướng Bắc"
              onPress={() => webViewRef.current?.injectJavaScript('window.resetNorth && window.resetNorth(); true;')}
              style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
            >
              <Ionicons name="compass-outline" size={18} color={colors.neutral} />
            </Pressable>
          </View>

          {/* Group 3: Zoom In & Zoom Out */}
          <View style={styles.controlGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Phóng to"
              onPress={() => webViewRef.current?.injectJavaScript('window.zoomIn && window.zoomIn(); true;')}
              style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
            >
              <Ionicons name="add" size={20} color={colors.neutral} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Thu nhỏ"
              onPress={() => webViewRef.current?.injectJavaScript('window.zoomOut && window.zoomOut(); true;')}
              style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
            >
              <Ionicons name="remove" size={20} color={colors.neutral} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Brand Badge */}
      <View style={styles.brandBadge}>
        <Ionicons name="navigate" size={12} color={colors.primary} />
        <Text style={[typography.labelSm, styles.brandBadgeText]}>MapLibre &bull; Cát Tường GIS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    minHeight: 220,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  controlsStack: {
    position: 'absolute',
    right: spacing.sm,
    flexDirection: 'column',
    gap: spacing.xs,
    zIndex: 15,
  },
  controlGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  controlBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  brandBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  brandBadgeText: {
    color: colors.neutral,
    fontSize: 10,
    fontWeight: '600',
  },
  // Offline Schematic Fallback Styles
  offlineContainer: {
    flex: 1,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  offlineBanner: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 5,
  },
  offlineBannerText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '600',
  },
  schematicCanvas: {
    width: '100%',
    height: 160,
    marginTop: spacing.md,
    position: 'relative',
    justifyContent: 'center',
  },
  schematicRoadBg: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 50,
    backgroundColor: '#D1D5DB',
    borderRadius: radius.md,
  },
  schematicRoadLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 46,
    backgroundColor: '#9CA3AF',
    borderRadius: radius.md,
  },
  schematicRoadDashed: {
    position: 'absolute',
    left: 25,
    right: 25,
    height: 2,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderStyle: 'dashed',
  },
  schematicRouteTrack: {
    position: 'absolute',
    left: 60,
    width: 170,
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    zIndex: 2,
  },
  schematicVehicle: {
    position: 'absolute',
    left: 45,
    alignItems: 'center',
    zIndex: 4,
  },
  vehicleHalo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    position: 'absolute',
    top: -4,
  },
  vehicleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.info,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pinLabel: {
    marginTop: 4,
    color: colors.neutral,
    fontSize: 10,
    fontWeight: '600',
  },
  schematicDefect: {
    position: 'absolute',
    right: 45,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  defectPulse: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: colors.error,
    opacity: 0.5,
  },
  defectLabel: {
    position: 'absolute',
    top: 36,
    color: colors.error,
    fontSize: 10,
    fontWeight: '700',
    width: 70,
    textAlign: 'center',
  },
});
