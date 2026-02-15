import * as Phaser from 'phaser';

export interface DialogueTrigger {
  type: 'startQuest' | 'giveItem' | 'setFlag';
  data: Record<string, unknown>;
}

export interface DialogueChoice {
  text: string;
  nextNodeId: string;
  condition?: string;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string | string[];
  choices?: DialogueChoice[];
  nextNodeId?: string;
  condition?: string;
  triggers?: DialogueTrigger[];
}

export interface DialogueTreeData {
  id: string;
  startNodeId: string;
  nodes: DialogueNode[];
}

/**
 * Parses and traverses a JSON-based dialogue tree.
 * Supports branching choices, conditions, and trigger events.
 */
export class DialogueTree {
  public readonly id: string;
  public readonly startNodeId: string;
  private nodes: Map<string, DialogueNode> = new Map();

  constructor(data: DialogueTreeData) {
    this.id = data.id;
    this.startNodeId = data.startNodeId;

    for (const node of data.nodes) {
      this.nodes.set(node.id, node);
    }
  }

  /** Get the root/start node. */
  getStartNode(): DialogueNode | undefined {
    return this.nodes.get(this.startNodeId);
  }

  /** Get a specific node by ID. */
  getNode(nodeId: string): DialogueNode | undefined {
    return this.nodes.get(nodeId);
  }

  /** Get choices available for a node, filtering by conditions. */
  getAvailableChoices(node: DialogueNode, gameState: Record<string, unknown> = {}): DialogueChoice[] {
    if (!node.choices) return [];
    return node.choices.filter(choice => {
      if (!choice.condition) return true;
      return this.evaluateCondition(choice.condition, gameState);
    });
  }

  /** Simple condition evaluator. Supports: flag checks like "hasItem:key". */
  private evaluateCondition(condition: string, gameState: Record<string, unknown>): boolean {
    // Format: "flagName" (truthy check) or "!flagName" (falsy check)
    if (condition.startsWith('!')) {
      const flag = condition.substring(1);
      return !gameState[flag];
    }
    return !!gameState[condition];
  }

  /** Load dialogue tree data from a JSON object. */
  static fromJSON(json: DialogueTreeData): DialogueTree {
    return new DialogueTree(json);
  }
}
