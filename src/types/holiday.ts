export interface Holiday {
  date: string;
  name: string;
  type: 'national' | 'judicial' | 'recess';
  abrangencia?: string;
  importance?: number;
} 