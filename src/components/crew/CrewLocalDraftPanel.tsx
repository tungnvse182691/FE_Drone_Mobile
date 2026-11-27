import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CrewPressable as Pressable } from './CrewMotion';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Card } from '../Card';
import { Button } from '../Button';
import { groupCrewLocalDrafts, readCrewLocalDrafts, readCrewLocalTaskCode, type CrewLocalDraftSummary } from '../../api/crewLocalDrafts';
import { sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';
import { colors, radius, spacing, typography } from '../../design-tokens';

export function CrewLocalDraftPanel({identity,refreshSignal=0}:{identity:QueueIdentity;refreshSignal?:number}) {
  const router = useRouter();
  const [rows,setRows]=useState<CrewLocalDraftSummary[]>([]),[error,setError]=useState('');
  const [loading,setLoading]=useState(false),[expanded,setExpanded]=useState(false);
  const sequence=useRef(0);
  const lookup=useRef<AbortController|null>(null);
  useEffect(()=>()=>{sequence.current++;lookup.current?.abort();},[]);
  const refresh=useCallback(async()=>{
    const n=++sequence.current;
    lookup.current?.abort();
    const controller=new AbortController();lookup.current=controller;
    setLoading(true);
    try {
      const result=await readCrewLocalDrafts(identity);
      if(n!==sequence.current||!sameQueueIdentity(identity))return;
      setRows(result);setError('');setLoading(false);
      const codes=new Map<string,string|null>();
      // Sequential reads avoid a request burst when many historical drafts exist.
      for(const {latest:row} of groupCrewLocalDrafts(result)) {
        if(n!==sequence.current||!sameQueueIdentity(identity)||controller.signal.aborted)return;
        codes.set(JSON.stringify([row.projectId,row.taskId]),row.taskCode || await readCrewLocalTaskCode(identity,row,controller.signal));
      }
      if(n===sequence.current&&sameQueueIdentity(identity))setRows(result.map(row=>({...row,taskCode:codes.get(JSON.stringify([row.projectId,row.taskId]))??null})));
    }
    catch {if(n===sequence.current&&sameQueueIdentity(identity))setError('Không đọc được danh sách nháp. Dữ liệu vẫn được giữ trên máy.');}
    finally {if(n===sequence.current&&sameQueueIdentity(identity))setLoading(false);}
  },[identity]);
  useFocusEffect(useCallback(()=>{void refresh();return()=>{sequence.current++;lookup.current?.abort();};},[refresh]));
  useEffect(()=>{if(refreshSignal>0)void refresh();},[refresh,refreshSignal]);
  if(!sameQueueIdentity(identity))return null;
  const groups=groupCrewLocalDrafts(rows),visible=expanded?groups:groups.slice(0,3);
  return <Card style={{gap:spacing.sm,marginBottom:spacing.md,borderWidth:1,borderColor:'#DCE2E7'}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:spacing.sm}}>
      <Text style={[typography.titleMd,{flex:1,color:'#192D40',fontSize:16,lineHeight:24}]}>Hồ sơ trên thiết bị</Text>
    </View>
    {loading?<View style={styles.loadingNotice} accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={colors.brandGold}/>
      <Text style={[typography.caption,styles.loadingText]}>Đang đọc hồ sơ trên thiết bị…</Text>
    </View>:null}
    {error?<Text accessibilityLiveRegion="polite" style={{color:colors.error}}>{error}</Text>:null}
    {!loading&&!error&&!rows.length?<Text style={[typography.bodyMd,{color:colors.secondary}]}>Chưa có hồ sơ lưu trên thiết bị.</Text>:null}
    {visible.map(({latest:row,versions,hasCommand})=><View key={JSON.stringify([row.projectId,row.taskId])} style={styles.draftRow}>
      <Text selectable numberOfLines={1} ellipsizeMode="middle" accessibilityLabel={row.taskCode ? `Mã nhiệm vụ: ${row.taskCode}` : undefined} style={styles.taskTitle}>{row.taskCode || 'Hồ sơ nhiệm vụ'}</Text>
      <Text style={[typography.caption,styles.secondaryText]}>
        {row.measurements} số đo · {row.photos} ảnh{row.verifiedPhotos > 0 ? ` · ${row.verifiedPhotos} ảnh đã xác minh` : ''}
      </Text>
      {row.updatedAt ? <Text style={[typography.caption,styles.secondaryText]}>Lưu lúc {new Date(row.updatedAt).toLocaleString('vi-VN')}</Text> : null}
      <Text style={[typography.bodyMd,styles.stateText]}>{row.assessmentConfirmed?'Đánh giá trước sửa đã xác nhận':row.hasCommand?'Có lịch sử gửi · mở hồ sơ để xem kết quả':row.currentSession?'Nháp chưa gửi':'Nháp từ lần đăng nhập trước'}</Text>
      {hasCommand&&!row.hasCommand?<Text style={typography.caption}>Bản lưu cũ có lịch sử gửi</Text>:null}
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
  draftRow:{gap:spacing.xs,borderTopWidth:1,borderColor:colors.border,paddingTop:spacing.sm},
  secondaryText:{color:colors.secondary,lineHeight:18},
  stateText:{color:colors.secondary},
  expandButton:{
    alignSelf:'center',minHeight:48,marginTop:spacing.sm,paddingVertical:12,paddingHorizontal:spacing.md,
    flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm,
    borderWidth:1,borderColor:'#89939F',borderRadius:radius.lg,backgroundColor:'#FBF8EE',
  },
  expandButtonPressed:{backgroundColor:'#F3ECD6'},
  taskTitle:{...typography.labelLg,color:colors.neutral},
  openButton:{alignSelf:'flex-end',minHeight:48,maxWidth:'100%',paddingHorizontal:spacing.md,borderWidth:1,borderColor:'#89939F',borderRadius:radius.lg,backgroundColor:'#FBF8EE'},
  expandLabel:{...typography.labelLg,color:colors.secondary,flexShrink:1,textAlign:'center'},
});
