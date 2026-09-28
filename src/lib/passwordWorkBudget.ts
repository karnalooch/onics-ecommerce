export const PASSWORD_WORK_MAX_CONCURRENCY = 4

export class PasswordWorkCapacityError extends Error {
  constructor() {
    super("PASSWORD_WORK_CAPACITY")
    this.name = "PasswordWorkCapacityError"
  }
}

export class PasswordWorkBudget {
  private active = 0

  constructor(private readonly maxConcurrency = PASSWORD_WORK_MAX_CONCURRENCY) {
    if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1) {
      throw new Error("Password work concurrency must be a positive integer.")
    }
  }

  get activeCount() {
    return this.active
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= this.maxConcurrency) {
      throw new PasswordWorkCapacityError()
    }

    this.active += 1
    try {
      return await work()
    } finally {
      this.active -= 1
    }
  }
}

export const passwordWorkBudget = new PasswordWorkBudget()

export function runPasswordWork<T>(work: () => Promise<T>) {
  return passwordWorkBudget.run(work)
}
