import {
  activeSessions,
  agentsList,
  projectsList,
  sessionRows,
} from '@repo/mocks/app';

export const sessionsListProps = {
  projects: projectsList,
  agents: agentsList,
  sessions: activeSessions.sessions,
  query: '',
  archived: false,
};
const project = projectsList[0];
if (!project) throw new Error('Missing Project mock');
export const multipleProjects = [
  ...projectsList,
  { ...project, id: 'project-empty', name: 'Empty Project' },
];
const largeSessionCount = 2000;
export const largeSessions = Array.from({ length: largeSessionCount }, (_, index) => ({
  ...sessionRows.idle,
  sessionId: `large-${index}`,
  title: `Large Session ${index}`,
  activityAt: largeSessionCount - index,
}));
