import { ProjectList } from "./list-projects";

export default function ArchivedProjectsCommand() {
  return <ProjectList initialFilter="archived" />;
}
