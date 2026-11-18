import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CrewPressable as Pressable } from './CrewMotion';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Card } from '../Card';
import { Button } from '../Button';
import { groupCrewLocalDrafts, readCrewLocalDrafts, type CrewLocalDraftSummary } from '../../api/crewLocalDrafts';
import { sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';
import { colors, radius, spacing, typography } from '../../design-tokens';

export function CrewLocalDraftPanel({identity,refreshSignal=0}:{identity:QueueIdentity;refreshSignal?:number}) {
  const [rows,setRows]=useState<CrewLocalDraftSummary[]>([]),[error,setError]=useState('');
  const [loading,setLoading]=useState(false),[expanded,setExpanded]=useState(false);
  const sequence=useRef(0);
  useEffect(()=>()=>{sequence.current++;},[]);
  const refresh=useCallback(async()=>{
    const n=++sequence.current;
    setLoading(true);
    try {const result=await readCrewLocalDrafts(identity);if(n===sequence.current&&sameQueueIdentity(identity)){setRows(result);setError('');}}
    catch {if(n===sequence.current&&sameQueueIdentity(identity))setError('Không đọc được danh sách nháp. Dữ liệu vẫn được giữ trên máy.');}
    finally {if(n===sequence.current&&sameQueueIdentity(identity))setLoading(false);}
  },[identity]);
  useFocusEffect(useCallback(()=>{void refresh();return()=>{sequence.current++;};},[refresh]));
  useEffect(()=>{if(refreshSignal>0)void refresh();},[refresh,refreshSignal]);
  if(!sameQueueIdentity(identity))return null;
  const groups=groupCrewLocalDrafts(rows),visible=expanded?groups:groups.slice(0,3);
  return <Card style={{gap:spacing.sm,marginBottom:spacing.md,borderWidth:1,borderColor:colors.border}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:spacing.sm}}>
      <Text style={[typography.titleMd,{flex:1,color:colors.neutral}]}>Hồ sơ trên thiết bị</Text>
    </View>
    {loading?<View style={styles.loadingNotice} accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={colors.brandGold}/>
      <Text style={[typography.caption,styles.loadingText]}>Đang đọc hồ sơ trên thiết bị…</Text>
    </View>:null}
    {error?<Text accessibilityLiveRegion="polite" style={{color:colors.error}}>{error}</Text>:null}
    {!loading&&!error&&!rows.length?<Text style={[typography.bodyMd,{color:colors.secondary}]}>Chưa có hồ sơ lưu trên thiết bị.</Text>:null}
    {visible.map(({latest:row,versions,hasCommand})=><View key={JSON.stringify([row.projectId,row.taskId])} style={styles.draftRow}>
      <Text style={[typography.labelLg,styles.taskId]}>Nhiệm vụ · {row.taskId.slice(0,8)}</Text>
      <View style={styles.snapshot}>
        <Text style={[typography.caption,styles.secondaryText]}>Bản lưu gần nhất</Text>
        <View style={styles.evidenceRow}>
          <View style={styles.evidenceGroup}>
            <MaterialIcons name="straighten" size={20} color={colors.secondary}/>
            <Text style={[typography.bodyMd,styles.evidenceText]}>{row.measurements} số đo</Text>
          </View>
          <View style={styles.evidenceGroup}>
            <MaterialIcons name="photo-library" size={20} color={colors.secondary}/>
            <Text style={[typography.bodyMd,styles.evidenceText]}>{row.photos} ảnh</Text>
          </View>
        </View>
      </View>
      {row.updatedAt?<View style={styles.timestamp}>
        <MaterialIcons name="schedule" size={16} color={colors.secondary}/>
        <Text style={[typography.caption,styles.timestampText]}>{new Date(row.updatedAt).toLocaleString('vi-VN')}</Text>
      </View>:null}
      <View style={styles.draftState}>
        <MaterialIcons name="info-outline" size={18} color={colors.secondary}/>
        <Text style={[typography.bodyMd,styles.stateText]}>{hasCommand?'Có lịch sử gửi · mở hồ sơ để xem kết quả':row.currentSession?'Nháp chưa gửi':'Nháp từ lần đăng nhập trước'}</Text>
      </View>
      {versions>1?<Text style={typography.caption}>{versions} bản lưu được giữ trên máy</Text>:null}
      <Button style={styles.openButton} variant="text" title="Mở hồ sơ" onPress={()=>{if(sameQueueIdentity(identity))router.push({pathname:'/(crew)/field-review',params:{id:row.taskId,projectId:row.projectId}});}}/>
    </View>)}
    {groups.length>3?<Pressable
      accessibilityRole="button"
      accessibilityLabel={expanded?'Thu gọn':`Xem thêm ${groups.length-3} nhiệm vụ`}
      accessibilityState={{expanded}}
      onPress={()=>setExpanded(value=>!value)}
      style={({pressed})=>[styles.expandButton,pressed&&styles.expandButtonPressed]}
    >
      <Text style={styles.expandLabel}>{expanded?'Thu gọn':`Xem thêm ${groups.length-3} nhiệm vụ`}</Text>
      <MaterialIcons name={expanded?'expand-less':'expand-more'} size={22} color={colors.secondary}/>
    </Pressable>:null}
  </Card>;
}

const styles=StyleSheet.create({
  loadingNotice:{flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:12,borderRadius:radius.md,backgroundColor:'#FBF8EE',borderWidth:1,borderColor:'#E9E1CC'},
  loadingText:{color:colors.secondary,flex:1,lineHeight:18},
  draftRow:{gap:12,borderTopWidth:1,borderColor:colors.border,paddingTop:spacing.md,paddingBottom:spacing.sm},
  snapshot:{gap:spacing.sm},
  secondaryText:{color:colors.secondary,lineHeight:18},
  evidenceRow:{flexDirection:'row',flexWrap:'wrap',columnGap:spacing.lg,rowGap:spacing.sm},
  evidenceGroup:{flexDirection:'row',alignItems:'center',gap:spacing.sm,maxWidth:'100%'},
  evidenceText:{color:colors.neutral,flexShrink:1},
  timestamp:{flexDirection:'row',alignItems:'center',gap:spacing.sm},
  timestampText:{color:colors.secondary,flex:1,lineHeight:18},
  draftState:{flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:12,borderRadius:radius.md,backgroundColor:'#F1F3F5'},
  stateText:{color:colors.secondary,flex:1},
  expandButton:{
    alignSelf:'center',minHeight:48,marginTop:spacing.sm,paddingVertical:12,paddingHorizontal:spacing.md,
    flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm,
    borderWidth:1,borderColor:'#89939F',borderRadius:radius.lg,backgroundColor:'#FBF8EE',
  },
  expandButtonPressed:{backgroundColor:'#F3ECD6'},
  taskId:{color:colors.neutral,fontSize:14,lineHeight:20,backgroundColor:'#F1F3F5',alignSelf:'flex-start',paddingVertical:6,paddingHorizontal:8,borderRadius:radius.sm},
  openButton:{alignSelf:'flex-end',minHeight:48,maxWidth:'100%',paddingHorizontal:spacing.md,borderWidth:1,borderColor:'#89939F',borderRadius:radius.lg,backgroundColor:'#FBF8EE'},
  expandLabel:{...typography.labelLg,color:colors.secondary,flexShrink:1,textAlign:'center'},
});
