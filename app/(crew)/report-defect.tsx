import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { defectTypeLabel } from '../../src/constants/defect-types';
import { CrewTaskBoundary, type CrewTask } from './tasks';
import { CrewContentTransition } from '../../src/components/crew/CrewMotion';

export default function CrewReportDefectScreen() {
  return <CrewTaskBoundary operational={false}>{task => <CrewReportDefectScreenContent task={task} />}</CrewTaskBoundary>;
}
function CrewReportDefectScreenContent({ task }: { task: CrewTask }) {
  return <SafeAreaScreen scroll header={<AppHeader subtitle="Khuyết tật nhiệm vụ" showBack onBack={()=>router.back()} />}>
    <CrewContentTransition ready>
    <View style={styles.banner}>
      <MaterialIcons name="info-outline" size={20} color={colors.secondary}/>
      <Text style={[typography.bodyMd,styles.bannerText]}>Thông tin giao việc ban đầu. Ảnh và số đo Crew đã gửi được lưu riêng trong hồ sơ hiện trường.</Text>
    </View>
    <View style={styles.fieldGroup}>
      <Card style={[styles.infoCard,styles.taskCard]}>
        <Text style={styles.fieldLabel}>Nhiệm vụ & vị trí</Text>
        <View style={styles.identity}><Text style={styles.code}>{task.wo_code || `ID nhiệm vụ: ${task.id.slice(0,8)}`}</Text></View>
        <Text style={styles.taskTitle}>{task.title || 'Nhiệm vụ hiện trường'}</Text>
        <View style={styles.gpsField}><Text style={[typography.bodyMd,styles.gpsText,{flex:1}]}>{[task.route_code,task.section_name,task.chainage].filter(Boolean).join(' • ') || 'Chưa có thông tin tuyến đường'}</Text></View>
        <Text style={typography.caption}>{task.coordinates ? `Tọa độ nhiệm vụ từ máy chủ: ${task.coordinates.latitude.toFixed(6)}, ${task.coordinates.longitude.toFixed(6)}` : 'Chưa có tọa độ nhiệm vụ. Không phải GPS quan sát mới.'}</Text>
      </Card>
    </View>
    <View style={styles.fieldGroup}>
      <Card style={styles.infoCard}>
        <Text style={styles.fieldLabel}>Phân loại lỗi</Text>
        <Text style={typography.bodyMd}>{task.defect_type_code ? defectTypeLabel(task.defect_type_code) : 'Chưa có phân loại lỗi từ nhiệm vụ'}</Text>
        <View style={styles.notes}>
          <Text style={styles.fieldLabel}>Ghi chú nhiệm vụ</Text>
          <Text style={typography.bodyMd}>{task.detail?.instructions || task.description || 'Chưa có ghi chú từ nhiệm vụ'}</Text>
        </View>
      </Card>
    </View>
    <View style={styles.fieldGroup}>
      <Card style={styles.infoCard}>
        <Text style={styles.fieldLabel}>Hình ảnh hiện trường</Text>
        <Text style={typography.bodyMd}>{task.detail?.latestSubmissionId ? 'Nhiệm vụ đã có hồ sơ được máy chủ tiếp nhận. Mở hồ sơ để xem ảnh, số đo và kết quả kiểm tra.' : 'Ảnh và số đo được quản lý trong hồ sơ hiện trường của nhiệm vụ.'}</Text>
        {task.detail?.latestSubmissionId || task.detail?.firstStartOriginId ? <Button style={styles.compactAction} variant="secondary" title={task.detail?.latestSubmissionId ? 'Xem hồ sơ đã nộp' : 'Mở hồ sơ hiện trường'} onPress={()=>router.push({pathname:'/(crew)/field-review',params:{id:task.id,projectId:task.projectId}})}/> : null}
      </Card>
    </View>
    <View style={styles.ctaWrap}><Button variant="secondary" title="Về chi tiết nhiệm vụ" onPress={()=>router.replace({pathname:'/(crew)/wo-detail',params:{id:task.id,projectId:task.projectId}})}/></View>
    </CrewContentTransition>
  </SafeAreaScreen>;
}

const styles = StyleSheet.create({
  infoCard: { padding:spacing.md, gap: spacing.sm, borderWidth: 1, borderColor:'#DCE2E7', borderRadius: radius.lg },
  taskCard: { backgroundColor:'#F3F5F6' },
  identity: { alignSelf:'flex-start',maxWidth:'100%',paddingHorizontal:8,paddingVertical:4,backgroundColor:'#E4E9ED',borderRadius:radius.sm },
  code: { ...typography.labelSm,lineHeight:18,color:'#192D40',flexShrink:1 },
  taskTitle: { ...typography.labelLg,fontSize:16,lineHeight:24,color:'#192D40' },
  notes: { gap:spacing.sm,borderTopWidth:1,borderTopColor:'#DCE2E7',paddingTop:spacing.md,marginTop:spacing.xs },
  compactAction: { alignSelf:'flex-start',maxWidth:'100%',backgroundColor:'#FBF8EE' },
  classificationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  topBarTitle: {
    flex: 1,
    color: colors.neutral,
  },
  badgeNew: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: '#FDECEC',
  },
  badgeNewText: {
    color: colors.error,
  },
  banner: {
    marginBottom: 12,
    padding:12,
    flexDirection:'row',alignItems:'flex-start',gap:8,
    backgroundColor:'#FBF8EE',borderLeftWidth:3,borderLeftColor:colors.primary,
    borderRadius:radius.md,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#EDF2F6',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  bannerText: {
    flex: 1,
    color: colors.neutral,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    ...typography.labelLg,
    lineHeight:20,
    color: colors.secondary,
  },
  gpsField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  gpsText: {
    color: colors.neutral,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: '#FEF3E2',
  },
  chipText: {
    color: colors.secondary,
  },
  chipTextActive: {
    color: colors.primaryDark,
  },
  severityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  severityChip: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 2,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  photoPlaceholder: {
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,

    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  photoText: {
    color: colors.secondary,
    textAlign: 'center',
  },
  photoHint: {
    color: colors.secondary,
    textAlign: 'center',
  },
  textarea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    ...typography.bodyMd,
    color: colors.onSurface,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  customTypeInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    ...typography.bodyMd,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  ctaWrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
});
