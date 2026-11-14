import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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
  return <Card style={{gap:spacing.sm,marginBottom:spacing.md,borderWidth:1,borderColor:'#E8D9A8'}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:spacing.sm}}>
      <Text style={[typography.titleMd,{flex:1}]}>Hồ sơ trên thiết bị</Text>
      {loading?<ActivityIndicator size="small" color={colors.secondary}/>:null}
    </View>
    {error?<Text accessibilityLiveRegion="polite" style={{color:colors.error}}>{error}</Text>:null}
    {!loading&&!error&&!rows.length?<Text style={{color:colors.secondary}}>Chưa có hồ sơ lưu trên thiết bị.</Text>:null}
    {visible.map(({latest:row,versions,hasCommand})=><View key={JSON.stringify([row.projectId,row.taskId])} style={{gap:spacing.xs,borderTopWidth:1,borderColor:colors.border,paddingTop:spacing.sm}}>
      <Text style={typography.labelLg}>Nhiệm vụ · {row.taskId.slice(0,8)}</Text>
      <Text style={{color:colors.secondary}}>Bản lưu gần nhất: {row.measurements} số đo · {row.photos} ảnh</Text>
      {row.updatedAt?<Text style={typography.caption}>{new Date(row.updatedAt).toLocaleString('vi-VN')}</Text>:null}
      <Text style={{color:colors.secondary}}>{hasCommand?'Có lịch sử gửi · mở hồ sơ để xem kết quả':row.currentSession?'Nháp chưa gửi':'Nháp từ lần đăng nhập trước'}</Text>
      {versions>1?<Text style={typography.caption}>{versions} bản lưu được giữ trên máy</Text>:null}
      <Button variant="text" title="Mở hồ sơ" onPress={()=>{if(sameQueueIdentity(identity))router.push({pathname:'/(crew)/field-review',params:{id:row.taskId,projectId:row.projectId}});}}/>
    </View>)}
    {groups.length>3?<Pressable
      accessibilityRole="button"
      accessibilityLabel={expanded?'Thu gọn':`Xem thêm ${groups.length-3} nhiệm vụ`}
      accessibilityState={{expanded}}
      onPress={()=>setExpanded(value=>!value)}
      style={({pressed})=>[styles.expandButton,pressed&&styles.expandButtonPressed]}
    >
      <Text style={styles.expandLabel}>{expanded?'Thu gọn':`Xem thêm ${groups.length-3} nhiệm vụ`}</Text>
      <MaterialIcons name={expanded?'expand-less':'expand-more'} size={22} color={colors.brandGold}/>
    </Pressable>:null}
  </Card>;
}

const styles=StyleSheet.create({
  expandButton:{
    minHeight:48,marginTop:spacing.sm,paddingVertical:12,paddingHorizontal:spacing.md,
    flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm,
    borderWidth:1,borderColor:'#D8C58A',borderRadius:radius.full,backgroundColor:'#FFFBF0',
  },
  expandButtonPressed:{backgroundColor:'#F3E8C7'},
  expandLabel:{...typography.labelLg,color:colors.secondary,flexShrink:1,textAlign:'center'},
});
