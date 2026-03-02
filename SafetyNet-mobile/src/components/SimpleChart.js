import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import theme from '../utils/theme'

/**
 * Simple Bar Chart Component
 * Creates a visual bar chart using View components
 */
export function BarChart({ data, maxValue, height = 120, color = theme.colors.primary }) {
  const max = maxValue || Math.max(...data.map((item) => item.value), 1)

  return (
    <View style={styles.chartContainer}>
      <View style={[styles.barChart, { height }]}>
        {data.map((item, index) => {
          const barHeight = (item.value / max) * height
          return (
            <View key={index} style={styles.barColumn}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: item.color || color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

/**
 * Simple Pie Chart Component (Donut Chart)
 * Creates a visual donut chart using SVG for proper circular segments
 */
export function PieChart({ data, size = 180 }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) {
    return (
      <View style={[styles.pieChart, { width: size, height: size }]}>
        <Text style={styles.emptyChartText}>No data</Text>
      </View>
    )
  }

  // Calculate angles for each segment
  let currentAngle = -90 // Start from top (-90 degrees)
  const segments = data.map((item, index) => {
    const percentage = item.value / total
    const angle = percentage * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle += angle

    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
      angle,
    }
  })

  // Donut chart: outer radius and inner radius (hole size)
  const outerRadius = size / 2
  const innerRadius = outerRadius * 0.55 // 55% creates visible donut ring
  const center = size / 2

  // Helper function to create arc path for donut segment
  const createArcPath = (startAngle, endAngle, outerR, innerR) => {
    const startAngleRad = (startAngle * Math.PI) / 180
    const endAngleRad = (endAngle * Math.PI) / 180

    const x1 = center + outerR * Math.cos(startAngleRad)
    const y1 = center + outerR * Math.sin(startAngleRad)
    const x2 = center + outerR * Math.cos(endAngleRad)
    const y2 = center + outerR * Math.sin(endAngleRad)
    const x3 = center + innerR * Math.cos(endAngleRad)
    const y3 = center + innerR * Math.sin(endAngleRad)
    const x4 = center + innerR * Math.cos(startAngleRad)
    const y4 = center + innerR * Math.sin(startAngleRad)

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`
  }

  return (
    <View style={styles.chartContainer}>
      <View style={[styles.pieChartContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {segments.map((segment, index) => (
            <Path
              key={index}
              d={createArcPath(segment.startAngle, segment.endAngle, outerRadius, innerRadius)}
              fill={segment.color || theme.colors.primary}
            />
          ))}
        </Svg>

        {/* Center hole (white circle) to create donut effect */}
        <View
          style={[
            styles.pieCenter,
            {
              width: innerRadius * 2,
              height: innerRadius * 2,
              borderRadius: innerRadius,
              backgroundColor: theme.colors.background,
              zIndex: 10,
            },
          ]}
        >
          <Text style={styles.pieCenterText}>{total}</Text>
          <Text style={styles.pieCenterLabel}>Total</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {data.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(1)
          return (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color || theme.colors.primary }]} />
              <View style={styles.legendContent}>
                <Text style={styles.legendText}>{item.label}</Text>
                <Text style={styles.legendValue}>
                  {item.value} ({percentage}%)
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

/**
 * Simple Line Chart Component
 * Creates a visual line chart using View components
 */
export function LineChart({ data, maxValue, height = 120, color = theme.colors.primary }) {
  const max = maxValue || Math.max(...data.map((item) => item.value), 1)

  return (
    <View style={styles.chartContainer}>
      <View style={[styles.lineChart, { height }]}>
        {data.map((item, index) => {
          const pointHeight = (item.value / max) * height
          const nextItem = data[index + 1]
          const nextPointHeight = nextItem ? (nextItem.value / max) * height : null

          return (
            <View key={index} style={styles.linePoint}>
              <View style={styles.linePointContainer}>
                {nextPointHeight !== null && (
                  <View
                    style={[
                      styles.lineConnector,
                      {
                        height: Math.abs(pointHeight - nextPointHeight),
                        top: Math.min(pointHeight, nextPointHeight),
                        backgroundColor: color + '40',
                      },
                    ]}
                  />
                )}
                <View
                  style={[
                    styles.lineDot,
                    {
                      top: pointHeight,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.lineLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  chartContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: theme.spacing.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  barWrapper: {
    height: '100%',
    justifyContent: 'flex-end',
    width: '100%',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 2,
  },
  barLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  pieChartContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 1000, // Large value to make it circular
    overflow: 'hidden',
  },
  donutBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  donutSegmentWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  donutSegment: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  pieChart: {
    borderRadius: 95,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieSegment: {
    position: 'absolute',
    borderRadius: 75,
  },
  pieCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    zIndex: 10,
  },
  pieCenterText: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  pieCenterLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
  },
  legend: {
    marginTop: theme.spacing.lg,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  legendValue: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textMuted,
  },
  lineChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: theme.spacing.sm,
    position: 'relative',
  },
  linePoint: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  linePointContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  lineConnector: {
    position: 'absolute',
    width: 2,
    left: '50%',
    marginLeft: -1,
  },
  lineDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    left: '50%',
    marginLeft: -4,
  },
  lineLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  emptyChartText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
})

