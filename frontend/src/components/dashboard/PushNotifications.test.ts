import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROMPT_SNOOZE_MS, isPromptSnoozed } from './PushNotifications';

describe('push soft prompt snooze', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
  });

  it('is not snoozed without a « Plus tard » timestamp', () => {
    expect(isPromptSnoozed()).toBe(false);
  });

  it('stays hidden for 15 days after « Plus tard », then comes back', () => {
    const at = 1_000_000_000_000;
    localStorage.setItem('juula-push-prompt-dismissed', String(at));
    expect(PROMPT_SNOOZE_MS).toBe(15 * 86_400_000);
    expect(isPromptSnoozed(at + 14 * 86_400_000)).toBe(true);
    expect(isPromptSnoozed(at + 15 * 86_400_000 + 1)).toBe(false);
  });
});
