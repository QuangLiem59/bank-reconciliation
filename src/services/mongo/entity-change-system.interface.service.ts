export interface ChangeResult {
  added: Record<string, any>;
  removed: Record<string, any>;
  modified: Record<string, { oldValue: any; newValue: any }>;
}

export interface ArrayChangeResult {
  added: any[];
  removed: any[];
}

export interface ArrayObjectChangeResult {
  added: Record<string, any>[];
  removed: Record<string, any>[];
  modified: Record<string, any>[];
}

// Types for entity-specific events
export interface EntityChangeEvent {
  entityType: string;
  entityId: string;
  changes: ChangeResult;
  oldDocument: Record<string, any>;
  newDocument: Record<string, any>;
}

export interface FieldChangeEvent {
  entityType: string;
  entityId: string;
  field: string;
  oldValue: any;
  newValue: any;
}

export interface ArrayFieldChangeEvent {
  entityType: string;
  entityId: string;
  field: string;
  changes: ArrayChangeResult;
}
