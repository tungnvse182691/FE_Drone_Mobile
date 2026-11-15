import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { openLocalDroneFiles, type DroneLocalFile } from '../../api/droneLocalFiles';
import { useAuthStore } from '../../store/auth';
import { Button } from '../Button';
import { colors, spacing, typography } from '../../design-tokens';

/** Local bytes only. Selecting a file never dispatches an upload. */
export function OperatorLocalFiles({taskId,onSelect}:{taskId:string;onSelect:(file:DroneLocalFile)=>void}) {
  const runtime=useRef<Awaited<ReturnType<typeof openLocalDroneFiles>>|null>(null);
  const active=useRef(false),lock=useRef(false);
  const [files,setFiles]=useState<Awaited<ReturnType<NonNullable<typeof runtime.current>['list']>>>([]);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState<string|null>(null);
  useEffect(()=>{
    active.current=true;let opened:typeof runtime.current=null;
    const unsubscribe=useAuthStore.subscribe(()=>{active.current=false;runtime.current=null;setFiles([]);});
    void(async()=>{
      try{opened=await openLocalDroneFiles(taskId);if(!active.current){opened.close();return;}runtime.current=opened;
        const rows=await opened.list();if(active.current)setFiles(rows);
      }catch{if(active.current)setMessage('Chưa đọc được tệp đã lưu. Dữ liệu vẫn được giữ trên máy.');}
      finally{if(active.current)setLoading(false);}
    })();
    return()=>{active.current=false;runtime.current=null;unsubscribe();opened?.close();};
  },[taskId]);
  const select=async(key?:string,kind:'VIDEO'|'TELEMETRY'='VIDEO')=>{
    const store=runtime.current;if(!active.current||!store||lock.current)return;
    lock.current=true;setBusy(true);setMessage(null);
    try{
      let file:DroneLocalFile;
      if(key)file=await store.rehash(key);
      else{
        // Match the online picker: preserve() immediately copies the granted URI
        // into our durable private directory before returning a selectable file.
        const result=await DocumentPicker.getDocumentAsync({type:kind==='VIDEO'?'video/mp4':'*/*',copyToCacheDirectory:false,multiple:false});
        if(!active.current||result.canceled)return;
        file=await store.preserve(kind,result.assets[0]);
      }
      if(!active.current)return;
      const rows=await store.list();if(!active.current)return;
      setFiles(rows);onSelect(file);setMessage('Đã chọn tệp. Lưu nháp để giữ lựa chọn.');
    }catch(error){if(active.current){
      const code=error instanceof Error?error.message:'';
      setMessage(['drone_file_cached_task_missing','drone_file_cached_task_invalid','drone_file_task_invalid'].includes(code)
        ? 'Chưa có đủ thông tin nhiệm vụ trên máy. Kết nối lại và mở nhiệm vụ trước khi thêm tệp. Tệp gốc vẫn được giữ.'
        : code==='drone_file_size_invalid'?'Không đọc được kích thước tệp hoặc tệp vượt giới hạn. Chọn lại tệp MP4/SRT trên thiết bị.'
        : code==='drone_file_invalid'?'Chọn tệp video có đuôi .mp4 hoặc phụ đề có đuôi .srt.'
        : code==='drone_file_copy_incomplete'?'Bản sao tệp chưa đầy đủ. Tệp gốc vẫn được giữ, hãy thử chọn lại.'
        : 'Chưa chọn được tệp. Kiểm tra tệp MP4/SRT còn đọc được trên máy rồi thử lại.');
    }}
    finally{lock.current=false;if(active.current)setBusy(false);}
  };
  return <View style={{gap:spacing.sm}}>
    <Text style={typography.labelLg}>Tệp trên thiết bị</Text>
    {loading||busy?<ActivityIndicator color={colors.primary}/>:null}
    {files.map(file=><View key={file.key} style={{gap:spacing.xs}}>
      <Button variant="secondary" title={`Dùng ${file.kind==='VIDEO'?'video':'SRT'}: ${file.name}`} disabled={busy||!['LOCAL_READY','LOCAL_UNHASHED'].includes(file.availability)} onPress={()=>void select(file.key)}/>
      {!['LOCAL_READY','LOCAL_UNHASHED'].includes(file.availability)?<Text style={typography.caption}>Tệp chưa đầy đủ hoặc không còn đọc được. Chọn lại tệp để tiếp tục.</Text>:null}
    </View>)}
    <Button variant="secondary" title="Thêm video MP4" disabled={loading||busy||!runtime.current} onPress={()=>void select(undefined,'VIDEO')}/>
    <Button variant="secondary" title="Thêm tệp SRT" disabled={loading||busy||!runtime.current} onPress={()=>void select(undefined,'TELEMETRY')}/>
    {message?<Text accessibilityLiveRegion="polite" style={typography.bodyMd}>{message}</Text>:null}
  </View>;
}
