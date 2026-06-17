export class GroupMutex {
  private locks = new Map<string, Promise<void>>();

  async acquire(groupId: string): Promise<() => void> {
    const current = this.locks.get(groupId) ?? Promise.resolve();
    let release: () => void = () => {};
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(groupId, current.then(() => next));
    await current;
    return () => {
      release();
      if (this.locks.get(groupId) === next) {
        this.locks.delete(groupId);
      }
    };
  }
}
