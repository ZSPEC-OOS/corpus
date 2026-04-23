import { describe, it, expect } from 'vitest';
import { createIdleSteps, orderedStepDefinitions } from '../lib/pipeline';

describe('createIdleSteps', () => {
  it('creates one step per definition', () => {
    const steps = createIdleSteps();
    expect(steps).toHaveLength(orderedStepDefinitions.length);
  });

  it('all steps start with status idle', () => {
    const steps = createIdleSteps();
    for (const step of steps) {
      expect(step.status).toBe('idle');
    }
  });

  it('step keys match the ordered definitions', () => {
    const steps = createIdleSteps();
    steps.forEach((step, i) => {
      expect(step.key).toBe(orderedStepDefinitions[i].key);
    });
  });

  it('first step is ingestion', () => {
    const steps = createIdleSteps();
    expect(steps[0].key).toBe('ingestion');
  });

  it('last step is output_generation', () => {
    const steps = createIdleSteps();
    expect(steps[steps.length - 1].key).toBe('output_generation');
  });
});

describe('orderedStepDefinitions', () => {
  it('has 8 steps', () => {
    expect(orderedStepDefinitions).toHaveLength(8);
  });

  it('all definitions have key, title, and description', () => {
    for (const def of orderedStepDefinitions) {
      expect(def.key).toBeTruthy();
      expect(def.title).toBeTruthy();
      expect(def.description).toBeTruthy();
    }
  });
});
