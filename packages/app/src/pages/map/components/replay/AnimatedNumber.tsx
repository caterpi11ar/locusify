import { useMotionValue, useSpring } from 'motion/react'
import { useEffect, useRef } from 'react'

interface AnimatedNumberProps {
  value: number
  precision?: number
  suffix?: string
  className?: string
}

const SPRING_CONFIG = { stiffness: 100, damping: 30 }

/**
 * Displays a number with a spring-based counting animation.
 * Integers (precision=0) are rounded; decimals use toFixed(precision).
 */
export function AnimatedNumber({ value, precision = 0, suffix, className }: AnimatedNumberProps) {
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, SPRING_CONFIG)
  const spanRef = useRef<HTMLSpanElement>(null)

  // Drive the spring target whenever value changes
  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  // Render the spring output into the DOM
  useEffect(() => {
    const unsubscribe = springValue.on('change', (v) => {
      if (spanRef.current) {
        const display = precision > 0 ? v.toFixed(precision) : Math.round(v).toString()
        spanRef.current.textContent = suffix ? `${display}${suffix}` : display
      }
    })
    return unsubscribe
  }, [springValue, precision, suffix])

  const initial = precision > 0 ? (0).toFixed(precision) : '0'

  return (
    <span ref={spanRef} className={className}>
      {suffix ? `${initial}${suffix}` : initial}
    </span>
  )
}
