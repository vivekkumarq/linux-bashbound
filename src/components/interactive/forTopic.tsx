import type { ReactNode } from "react";
import { PermissionBuilder } from "./PermissionBuilder";
import { FlowDiagram } from "./FlowDiagram";
import { FilesystemTree } from "./FilesystemTree";
import { FdDiagram, ProcessDiagram, UnixCompare } from "../Diagrams";

/**
 * Which interactive explainer belongs on which lesson.
 *
 * Kept as one table rather than a chain of conditionals inside TopicPage, so
 * adding a visual to a lesson is a single line here.
 */
const BY_SLUG: Record<string, () => ReactNode> = {
  "mode-bits": () => <PermissionBuilder />,
  "special-bits-acl": () => <PermissionBuilder />,
  "directory-map": () => <FilesystemTree />,
  "fhs-deep-dive": () => <FilesystemTree />,
  "terminal-shell": () => <FlowDiagram id="ls-execution" />,
  architecture: () => <FlowDiagram id="ls-execution" />,
  "pipes-redirection": () => (
    <>
      <FdDiagram />
      <FlowDiagram id="pipe-flow" />
    </>
  ),
  "process-model": () => (
    <>
      <ProcessDiagram />
      <FlowDiagram id="process-lifecycle" />
    </>
  ),
  "jobs-signals": () => <FlowDiagram id="process-lifecycle" />,
  "process-control": () => <FlowDiagram id="process-lifecycle" />,
  "name-resolution": () => <FlowDiagram id="dns-request" />,
  "net-fundamentals": () => <FlowDiagram id="dns-request" />,
  "tcp-and-sockets": () => <FlowDiagram id="dns-request" />,
  "linux-vs-unix": () => <UnixCompare />,
  "unix-posix": () => <UnixCompare />,
};

export function visualsForTopic(slug: string): ReactNode {
  return BY_SLUG[slug]?.() ?? null;
}

export const topicsWithVisuals = Object.keys(BY_SLUG);
