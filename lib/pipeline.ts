import { PipelineStep, PipelineStepKey } from './types';

export const orderedStepDefinitions: { key: PipelineStepKey; title: string; description: string }[] = [
  { key: 'ingestion', title: 'Ingestion', description: 'Extract text, images, and layout from PDF.' },
  { key: 'ocr_text_cleaning', title: 'OCR and Text Cleaning', description: 'Normalize scanned content and clean text.' },
  { key: 'structure_detection', title: 'Structure Detection', description: 'Detect sections, headings, and tables.' },
  { key: 'chunking', title: 'Chunking', description: 'Split content into semantic chunks.' },
  { key: 'deduplication', title: 'Deduplication', description: 'Remove duplicate and near-duplicate content.' },
  { key: 'quality_scoring', title: 'Quality Scoring', description: 'Score content quality and usefulness.' },
  { key: 'schema_validation', title: 'Schema Validation', description: 'Validate output shape and constraints.' },
  { key: 'output_generation', title: 'Output Generation', description: 'Generate final output artifacts.' },
];

export const createIdleSteps = (): PipelineStep[] => orderedStepDefinitions.map((step) => ({ ...step, status: 'idle' }));
