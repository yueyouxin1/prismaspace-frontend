import {
  CircleHelp,
  Cpu,
  GitBranch,
  PauseCircle,
  Play,
  Split,
  SquareTerminal,
  StopCircle,
  Wrench,
  type LucideIcon,
} from 'lucide-vue-next'

const workflowIconMap: Record<string, LucideIcon> = {
  play: Play,
  stop: StopCircle,
  cpu: Cpu,
  tool: Wrench,
  'git-branch': GitBranch,
  'pause-circle': PauseCircle,
  branch: Split,
  interrupt: PauseCircle,
  output: SquareTerminal,
  Start: Play,
  End: StopCircle,
  Output: SquareTerminal,
  LLMNode: Cpu,
  AgentNode: Cpu,
  ToolNode: Wrench,
  WorkflowNode: GitBranch,
  Branch: Split,
  Loop: Play,
  Interrupt: PauseCircle,
}

export const resolveWorkflowIcon = (icon?: string | null): LucideIcon => {
  if (!icon) {
    return CircleHelp
  }
  return workflowIconMap[icon] ?? CircleHelp
}
