/**
 * 简化版 SM-2 间隔复习算法
 *
 * @param {number} quality        - 0: 不认识, 1: 模糊, 2: 认识
 * @param {number} currentInterval - 当前间隔天数，默认为 1
 * @param {number} currentEase     - 当前容易度因子，默认 2.5
 * @param {number} repetitions     - 已连续正确次数
 * @returns {{ interval: number, ease: number, repetitions: number }}
 */
export function calculateSM2(quality, currentInterval = 1, currentEase = 2.5, repetitions = 0) {
  let ease = currentEase
  let interval = currentInterval
  let rep = repetitions

  if (quality === 0) {
    // 不认识 → 重置间隔
    rep = 0
    interval = 1
  } else if (quality === 1) {
    // 模糊 → 间隔减半，重置连续正确次数
    rep = 0
    interval = Math.max(1, Math.round(interval * 0.5))
  } else if (quality === 2) {
    // 认识 → 按算法延长间隔
    rep += 1
    if (rep === 1) {
      interval = 1
    } else if (rep === 2) {
      interval = 3
    } else {
      interval = Math.round(interval * ease)
    }
    ease = ease + (0.1 - (2 - quality) * (0.08 + (2 - quality) * 0.02))
    if (ease < 1.3) ease = 1.3 // 最低容易度
  }

  return {
    interval: Math.max(1, interval),
    ease: parseFloat(ease.toFixed(2)),
    repetitions: rep
  }
}
