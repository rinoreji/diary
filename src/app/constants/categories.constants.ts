import { Category } from '../interfaces/diary-entry.interface';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'daily',
    name: 'Daily Notes',
    description: 'Daily thoughts, reflections, and experiences',
    color: '#4CAF50',
    icon: 'today',
    createdAt: new Date().toISOString(),
    isDefault: true
  },
  {
    id: 'tasks',
    name: 'Tasks',
    description: 'To-do items and task management',
    color: '#FF9800',
    icon: 'assignment',
    createdAt: new Date().toISOString(),
    isDefault: true
  },
  {
    id: 'shopping',
    name: 'Shopping',
    description: 'Shopping lists and purchase items',
    color: '#2196F3',
    icon: 'shopping_cart',
    createdAt: new Date().toISOString(),
    isDefault: true
  },
  {
    id: 'ideas',
    name: 'Ideas',
    description: 'Creative ideas and inspiration',
    color: '#9C27B0',
    icon: 'lightbulb',
    createdAt: new Date().toISOString(),
    isDefault: true
  },
  {
    id: 'work',
    name: 'Work',
    description: 'Work-related notes and updates',
    color: '#607D8B',
    icon: 'work',
    createdAt: new Date().toISOString(),
    isDefault: true
  },
  {
    id: 'personal',
    name: 'Personal',
    description: 'Personal thoughts and private notes',
    color: '#E91E63',
    icon: 'person',
    createdAt: new Date().toISOString(),
    isDefault: true
  }
];

export const UNCATEGORIZED_CATEGORY: Category = {
  id: 'uncategorized',
  name: 'Uncategorized',
  description: 'Entries without a specific category',
  color: '#9E9E9E',
  icon: 'folder',
  createdAt: new Date().toISOString(),
  isDefault: true
};

export const ALL_CATEGORIES = [...DEFAULT_CATEGORIES, UNCATEGORIZED_CATEGORY];