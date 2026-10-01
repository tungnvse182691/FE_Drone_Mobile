import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraCapturedPicture, CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { DEFECT_TYPE_OPTIONS, DefectTypeCode } from '../../src/constants/defect-types';
import { registerReporterEmail, submitReport, ReportCreate } from '../../src/api/mock/reporter';
import { openDatabase, initDatabase, upsertOffline } from '../../src/offline/database';
import { useReporterStore } from '../../src/store/reporter';
import { useAuthStore } from '../../src/store/auth';
import { AUTH_OTP_VERIFY, REPORTER_TRACK } from '../../src/constants/routes';

const MAX_PHOTOS = 3;
const MIN_DESCRIPTION = 10;
const SUBMIT_FALLBACK_ERROR = 'Không thể gửi phản ánh. Vui lòng thử lại sau.';

/** Mã lỗi từ `submitReport`/`registerReporterEmail` → thông báo tiếng Việt cho người dân. */
const errorMessages: Record<string, string> = {
  TOO_MANY_PHOTOS: 'Bạn chỉ được tải lên tối đa 3 hình ảnh hiện trường.',
  COORDINATES_INVALID: 'Tọa độ vị trí không hợp lệ. Vui lòng bật GPS và thử lại.',
  DEFECT_TYPE_INVALID: 'Loại khuyết tật không thuộc danh mục quy chuẩn.',
  DESCRIPTION_REQUIRED: 'Vui lòng nhập mô tả hiện trạng hư hại.',
  EMAIL_INVALID: 'Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại.',
};

interface Coords {
  latitude: number;
  longitude: number;
}

export default function ReporterReportScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const [defectType, setDefectType] = useState<DefectTypeCode | null>(null);
  const [routeHint, setRouteHint] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [gpsStatus, setGpsStatus] = useState('Đang lấy vị trí...');
  const [gpsLoading, setGpsLoading] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const emailPrefill = useReporterStore((state) => state.email);
  const verifiedEmail = useReporterStore((state) => state.verifiedEmail);
  const setEmailPrefill = useReporterStore((state) => state.setEmail);
  const setPendingReport = useReporterStore((state) => state.setPendingReport);
  const addTrackingCode = useReporterStore((state) => state.addTrackingCode);
  const clearPendingReport = useReporterStore((state) => state.clearPendingReport);

  useEffect(() => {
    const initialEmail = user?.phone_or_email || verifiedEmail || emailPrefill;
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [user?.phone_or_email, verifiedEmail, emailPrefill]);

  const requestLocation = async () => {
    setGpsLoading(true);
    setGpsStatus('Đang lấy vị trí...');
    try {
      const permissionStatus = await Location.getForegroundPermissionsAsync();
      let granted = permissionStatus.status === 'granted';
      if (!granted) {
        const requested = await Location.requestForegroundPermissionsAsync();
        granted = requested.status === 'granted';
      }
      if (!granted) {
        setCoords(null);
        setGpsStatus('Chưa có tọa độ');
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      setGpsStatus(
        `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`,
      );
      setErrors((current) => ({ ...current, coords: '' }));
    } catch {
      setCoords(null);
      setGpsStatus('Chưa có tọa độ');
    } finally {
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    void requestLocation();
  }, []);

  const handleCapture = async () => {
    if (!cameraReady || photos.length >= MAX_PHOTOS) {
      return;
    }
    const photo: CameraCapturedPicture | undefined = await cameraRef.current?.takePictureAsync();
    if (photo?.uri) {
      setPhotos((current) => [...current, photo.uri].slice(0, MAX_PHOTOS));
      setCameraOpen(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setPhotos((current) => [...current, res.assets[0].uri].slice(0, MAX_PHOTOS));
      }
    } catch {
      // ignore
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!defectType) {
      next.defectType = 'Vui lòng chọn loại khuyết tật.';
    }
    if (description.trim().length < MIN_DESCRIPTION) {
      next.description = `Mô tả tối thiểu ${MIN_DESCRIPTION} ký tự để đội nghiệp vụ xác định vị trí.`;
    }
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      next.email = 'Vui lòng nhập địa chỉ email nhận mã xác thực.';
    } else if (!emailRegex.test(trimmedEmail)) {
      next.email = 'Vui lòng nhập địa chỉ email hợp lệ (ví dụ: ten@hoanghai.vn hoặc ten@gmail.com).';
    }
    if (!routeHint.trim()) {
      next.routeHint = 'Vui lòng nhập vị trí hoặc mốc giao thông gần nhất.';
    }
    if (!coords) {
      next.coords = 'Chưa lấy được tọa độ. Vui lòng bật GPS rồi thử lại.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveDraft = async (payload: ReportCreate) => {
    try {
      const db = openDatabase();
      await initDatabase(db);
      const now = new Date().toISOString();
      await upsertOffline(db, 'local_draft', `defect-report-${Date.now()}`, {
        kind: 'defect_report',
        payload: JSON.stringify(payload),
        created_at: now,
        updated_at: now,
      });
    } catch {
      return;
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!validate() || !defectType || !coords) {
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const payload: ReportCreate = {
      reporter_email: trimmedEmail,
      route_hint: routeHint.trim(),
      description: description.trim(),
      photo_uris: photos,
      coordinates: [coords.longitude, coords.latitude],
      defect_type: defectType,
    };

    const isAlreadyVerified =
      (!!verifiedEmail && verifiedEmail.toLowerCase() === trimmedEmail) ||
      (!!user?.phone_or_email && user.phone_or_email.toLowerCase() === trimmedEmail);

    setSubmitting(true);
    try {
      await saveDraft(payload);
      if (isAlreadyVerified) {
        const { report } = await submitReport(
          payload,
          `submit:${trimmedEmail}:${Date.now()}`,
        );
        addTrackingCode(report.tracking_code);
        clearPendingReport();
        router.push({
          pathname: REPORTER_TRACK,
          params: { code: report.tracking_code },
        });
        return;
      }

      setEmailPrefill(payload.reporter_email);
      setPendingReport(payload);
      const intent = await registerReporterEmail(
        payload.reporter_email,
        `register:${payload.reporter_email}:${Date.now()}`,
      );
      router.push({
        pathname: AUTH_OTP_VERIFY,
        params: { intentId: intent.intentId, email: intent.email },
      });
    } catch (err) {
      const code = (err as Error).message;
      setSubmitError(errorMessages[code] ?? SUBMIT_FALLBACK_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[typography.titleLg, styles.title]}>Gửi phản ánh khuyết tật</Text>
          <Text style={[typography.caption, styles.subtitle]}>
            Mô tả hiện trạng hư hại để Ban Quản lý dự án khảo sát và xử lý.
          </Text>

          <Text style={[typography.labelLg, styles.label]}>Loại khuyết tật</Text>
          <View style={styles.chipWrap}>
            {DEFECT_TYPE_OPTIONS.map((option) => {
              const selected = option.code === defectType;
              return (
                <Pressable
                  key={option.code}
                  onPress={() => {
                    setDefectType(option.code);
                    setErrors((current) => ({ ...current, defectType: '' }));
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  testID={`defect-${option.code}`}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text style={[typography.labelLg, selected ? styles.chipTextSelected : styles.chipText]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errors.defectType ? (
            <Text style={[typography.caption, styles.error]}>{errors.defectType}</Text>
          ) : null}

          <InputField
            label="Vị trí / mốc giao thông"
            value={routeHint}
            onChangeText={(text) => {
              setRouteHint(text);
              setErrors((current) => ({ ...current, routeHint: '' }));
            }}
            placeholder="Ví dụ: Km02+200 hướng Vĩnh Lộc B, gần cầu Bà Lát"
            error={errors.routeHint}
            testID="reporter-route-hint"
          />

          <View style={styles.gpsCard}>
            <View style={styles.gpsRow}>
              <MaterialIcons
                name={coords ? 'my-location' : 'location-off'}
                size={16}
                color={coords ? colors.success : colors.error}
              />
              <Text style={[typography.caption, styles.gpsText]}>{gpsStatus}</Text>
              <Pressable
                onPress={requestLocation}
                disabled={gpsLoading}
                style={({ pressed }) => [styles.gpsRetry, pressed && styles.photoAddPressed]}
                accessibilityRole="button"
                accessibilityLabel="Lấy lại vị trí"
                testID="retry-location"
              >
                <MaterialIcons name="refresh" size={16} color={colors.brandGold} />
                <Text style={[typography.caption, styles.gpsRetryText]}>
                  {gpsLoading ? 'Đang lấy' : 'Thử lại'}
                </Text>
              </Pressable>
            </View>
            {errors.coords ? (
              <Text style={[typography.caption, styles.error]}>{errors.coords}</Text>
            ) : null}
          </View>

          <Text style={[typography.labelLg, styles.label]}>
            Ảnh hiện trường ({photos.length}/{MAX_PHOTOS})
          </Text>
          <View style={styles.photoGrid}>
            {photos.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.photo} />
                <Pressable
                  onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                  style={styles.photoRemove}
                  accessibilityRole="button"
                  accessibilityLabel={`Xoá ảnh ${index + 1}`}
                  testID={`remove-photo-${index}`}
                >
                  <MaterialIcons name="close" size={16} color={colors.onPrimary} />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <Pressable
                onPress={() => {
                  setCameraReady(false);
                  setCameraOpen(true);
                }}
                disabled={!permission?.granted}
                style={({ pressed }) => [styles.photoAdd, pressed && styles.photoAddPressed]}
                accessibilityRole="button"
                accessibilityLabel="Chụp ảnh hiện trường"
                testID="add-photo"
              >
                <MaterialIcons name="photo-camera" size={24} color={colors.brandGold} />
                <Text style={[typography.caption, styles.photoAddText]}>Chụp ảnh</Text>
              </Pressable>
            ) : null}
            {photos.length < MAX_PHOTOS ? (
              <Pressable
                onPress={handlePickImage}
                style={({ pressed }) => [styles.photoAdd, pressed && styles.photoAddPressed]}
                accessibilityRole="button"
                accessibilityLabel="Chọn ảnh từ thư viện"
                testID="pick-photo"
              >
                <MaterialIcons name="photo-library" size={24} color={colors.primary} />
                <Text style={[typography.caption, styles.photoAddText]}>Thư viện</Text>
              </Pressable>
            ) : null}
          </View>
          {!permission?.granted ? (
            <View style={styles.permissionRow}>
              <Text style={[typography.caption, styles.gpsText]}>
                Cần cấp quyền camera để chụp ảnh hiện trường.
              </Text>
              <Button variant="secondary" title="Cấp quyền" onPress={requestPermission} />
            </View>
          ) : null}

          <InputField
            label="Mô tả hiện trạng"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setErrors((current) => ({ ...current, description: '' }));
            }}
            placeholder="Mô tả vị trí, mức độ hư hại, thời gian quan sát được..."
            error={errors.description}
            multiline
            testID="reporter-description"
          />

          <InputField
            label="Email nhận mã xác thực"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors((current) => ({ ...current, email: '' }));
            }}
            placeholder="vd: ten.email@hoanghai.vn"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            testID="reporter-email"
          />

          <Text style={[typography.caption, styles.emailHelpText]}>
            Mã OTP 6 số sẽ được gửi qua email để xác thực phản ánh của bạn.
          </Text>

          {((verifiedEmail && verifiedEmail === email.trim().toLowerCase()) ||
            (user?.phone_or_email && user.phone_or_email.toLowerCase() === email.trim().toLowerCase())) ? (
            <View style={styles.verifiedRow}>
              <MaterialIcons name="verified" size={16} color={colors.success} />
              <Text style={[typography.caption, styles.verifiedText]}>
                Email này đã được xác thực trước đó.
              </Text>
            </View>
          ) : null}

          {submitError ? (
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={16} color={colors.error} />
              <Text style={[typography.caption, styles.error]}>{submitError}</Text>
            </View>
          ) : null}

          <View style={styles.submitWrapper}>
            <Button
              variant="primary"
              title="Gửi phản ánh"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
            />
            <Text style={[typography.caption, styles.submitHint]}>
              {(verifiedEmail && verifiedEmail === email.trim().toLowerCase()) ||
              (user?.phone_or_email && user.phone_or_email.toLowerCase() === email.trim().toLowerCase())
                ? 'Phản ánh sẽ được gửi trực tiếp đến Ban Quản lý dự án để tiếp nhận và khảo sát.'
                : 'Hệ thống sẽ gửi mã xác thực 6 số tới email để xác nhận phản ánh.'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.cameraModal}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setCameraReady(true)} />
          <View style={styles.cameraTopBar}>
            <Pressable
              onPress={() => setCameraOpen(false)}
              style={styles.cameraClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng camera"
            >
              <MaterialIcons name="close" size={24} color={colors.onPrimary} />
            </Pressable>
            <Text style={[typography.titleMd, styles.cameraTitle]}>
              Ảnh {photos.length + 1}/{MAX_PHOTOS}
            </Text>
            <View style={styles.cameraClose} />
          </View>
          <View style={styles.cameraFooter}>
            <Pressable
              onPress={handleCapture}
              disabled={!cameraReady}
              style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
              accessibilityRole="button"
              accessibilityLabel="Chụp ảnh"
              testID="camera-shutter"
            >
              <MaterialIcons name="camera" size={28} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  content: { padding: spacing.screenMargin, paddingBottom: spacing.xl },
  title: { color: colors.brandGold },
  subtitle: { color: colors.secondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { color: colors.secondary, marginBottom: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipPressed: { opacity: 0.85 },
  chipText: { color: colors.secondary },
  chipTextSelected: { color: colors.onPrimary },
  gpsCard: { gap: spacing.xs, marginBottom: spacing.lg },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gpsText: { color: colors.secondary, flex: 1 },
  gpsRetry: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  gpsRetryText: { color: colors.brandGold },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  photoWrapper: { position: 'relative' },
  photo: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.brandGold,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  photoAddPressed: { backgroundColor: colors.surfaceAlt },
  photoAddText: { color: colors.brandGold },
  permissionRow: { gap: spacing.sm, marginBottom: spacing.md },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  verifiedText: { color: colors.success },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  error: { color: colors.error, flex: 1 },
  emailHelpText: { color: colors.secondary, marginTop: -spacing.xs, marginBottom: spacing.md },
  submitWrapper: { gap: spacing.sm, marginTop: spacing.sm },
  submitHint: { color: colors.secondary, textAlign: 'center' },
  cameraModal: { flex: 1, backgroundColor: colors.neutral },
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(26, 29, 32, 0.7)',
  },
  cameraClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  cameraTitle: { color: colors.onPrimary },
  cameraFooter: { alignItems: 'center', paddingBottom: spacing.xl, paddingTop: spacing.lg },
  shutter: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: { backgroundColor: colors.primaryDark },
});
