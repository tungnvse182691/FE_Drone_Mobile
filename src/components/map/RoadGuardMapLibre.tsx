import React, { useState, useMemo } from 'react';
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
}

export function RoadGuardMapLibre({
  center = [107.0125, 10.9634], // QL.1A Km1842+150 Trảng Bom, Đồng Nai
  zoom = 15,
  markers = [],
  routeCoordinates = [],
  onMarkerPress,
  style,
  interactive = true,
  offlineBannerText = 'Ngoại tuyến: Đang dùng bản đồ đệm QL.1A',
}: RoadGuardMapProps) {
  const [layerType, setLayerType] = useState<'streets' | 'satellite'>('streets');
  const [loadError, setLoadError] = useState(false);

  // Generate HTML for MapLibre GL JS / Leaflet vector viewer
  const mapHtml = useMemo(() => {
    const markersJson = JSON.stringify(markers);
    const routeJson = JSON.stringify(routeCoordinates);
    const centerLng = center[0];
    const centerLat = center[1];

    const tileUrl =
      layerType === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileAttribution =
      layerType === 'satellite'
        ? '&copy; Esri &mdash; Cát Tường GIS'
        : '&copy; OpenStreetMap contributors &mdash; Cát Tường GIS';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #F8F9FA; font-family: -apple-system, Roboto, sans-serif; }
    .custom-defect-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: #E5484D;
      border: 2.5px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      color: #fff;
      font-weight: bold;
      font-size: 11px;
    }
    .custom-vehicle-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: #3B82F6;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.25);
    }
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      padding: 4px;
      border: 1px solid #E2E5E9;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
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
      padding: 4px 10px;
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
      var map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        dragging: ${interactive},
        touchZoom: ${interactive},
        scrollWheelZoom: ${interactive}
      }).setView([${centerLat}, ${centerLng}], ${zoom});

      L.tileLayer('${tileUrl}', {
        maxZoom: 19,
        attribution: '${tileAttribution}'
      }).addTo(map);

      var markers = ${markersJson};
      var route = ${routeJson};

      // Draw route if provided
      if (route && route.length > 1) {
        var latLngs = route.map(function(pt) { return [pt[1], pt[0]]; });
        var routePolyline = L.polyline(latLngs, {
          color: '#C9A227',
          weight: 5,
          opacity: 0.9,
          dashArray: '1, 8',
          lineCap: 'round'
        }).addTo(map);

        // Solid under-route line
        L.polyline(latLngs, {
          color: '#8C6D1F',
          weight: 7,
          opacity: 0.35
        }).addTo(map);
      }

      // Add markers
      markers.forEach(function(m) {
        var iconHtml = '';
        var className = 'custom-defect-marker';
        if (m.type === 'vehicle') {
          className = 'custom-vehicle-marker';
          iconHtml = '<div style="width:8px; height:8px; background:#fff; border-radius:50%;"></div>';
        } else {
          iconHtml = '⚠️';
        }

        var customIcon = L.divIcon({
          className: className,
          html: iconHtml,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        var marker = L.marker([m.coordinate[1], m.coordinate[0]], { icon: customIcon }).addTo(map);
        
        var popupContent = '<div style="padding:4px;">' +
          '<div class="popup-title">' + (m.title || '') + '</div>' +
          (m.subtitle ? '<div class="popup-sub">' + m.subtitle + '</div>' : '') +
          '<a class="popup-btn" href="javascript:void(0);" onclick="window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: \\'MARKER_CLICK\\', id: \\'' + m.id + '\\' }))">Xem chi tiết</a>' +
          '</div>';

        marker.bindPopup(popupContent);
      });

      window.zoomIn = function() { map.zoomIn(); };
      window.zoomOut = function() { map.zoomOut(); };
      window.recenter = function() { map.setView([${centerLat}, ${centerLng}], ${zoom}); };
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

      {/* Overlay Map Controls */}
      {interactive && (
        <View style={styles.controlsOverlay}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setLayerType(prev => (prev === 'streets' ? 'satellite' : 'streets'))}
            style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
          >
            <Ionicons
              name={layerType === 'satellite' ? 'map' : 'earth'}
              size={18}
              color={colors.neutral}
            />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            accessibilityRole="button"
            onPress={() => setLoadError(prev => !prev)}
            style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
          >
            <Ionicons name={loadError ? 'wifi' : 'cloud-offline-outline'} size={18} color={colors.neutral} />
          </Pressable>
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
  controlsOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 10,
  },
  controlBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
