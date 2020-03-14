export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function hrDiffToMs(hrDiff: [number, number]) {
  return hrDiff[0] * 1e3 + hrDiff[1] / 1e6
}

export class Timer {
  private start: [number, number]
  private elapsedMs: number
  private paused: boolean

  /** Start the timer. */
  constructor() {
    this.start = process.hrtime()
    this.elapsedMs = 0
    this.paused = false
  }

  pause() {
    const diff = process.hrtime(this.start)
    this.elapsedMs += hrDiffToMs(diff)
    this.paused = true
  }

  continue() {
    this.paused = false
    this.start = process.hrtime()
  }

  /** Stop the timer and print the elapsed time. */
  stop() {
    if (!this.paused) {
      this.pause()
    }
    console.log(`Execution time: ${this.elapsedMs} ms`)
  }
}