import React from 'react';
import { CrewTaskBoundary } from './tasks';
import { CrewTaskMap } from '../../src/components/crew/CrewTaskMap';

export default function CrewTaskMapScreen() {
  return <CrewTaskBoundary operational={false}>{task => <CrewTaskMap key={`${task.projectId}:${task.id}`} projectId={task.projectId} taskId={task.id} />}</CrewTaskBoundary>;
}
