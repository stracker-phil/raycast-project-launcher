import { ProjectList } from "./list-projects";

export default function StarredProjectsCommand() {
  return <ProjectList initialFilter="starred" />;
}
