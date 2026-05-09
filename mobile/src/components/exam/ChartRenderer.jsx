import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G, Polyline, Circle } from 'react-native-svg';

/**
 * chart_data shape:
 * {
 *   type: 'bar' | 'line' | 'pie',
 *   title: string,
 *   x_label: string,
 *   y_label: string,
 *   y_min: number,
 *   y_max: number,
 *   y_unit: string,          // e.g. '%', 'km', '$'
 *   series: [
 *     { label: string, color: string, values: number[] }
 *   ],
 *   x_axis: string[]         // category labels
 * }
 */

const CHART_COLORS = ['#6C47FF', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981'];

const BAR_CHART_W = 320;
const CHART_H = 200;
const PAD_LEFT = 40;
const PAD_BOTTOM = 36;
const PAD_TOP = 16;
const PAD_RIGHT = 12;

const plotW = BAR_CHART_W - PAD_LEFT - PAD_RIGHT;
const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;

const BarChart = ({ data, theme }) => {
  const { series, x_axis, y_min = 0, y_max = 100, y_unit = '' } = data;
  const numGroups = x_axis.length;
  const numSeries = series.length;
  const groupW = plotW / numGroups;
  const barW = Math.max(6, (groupW * 0.7) / numSeries);
  const gap = (groupW - barW * numSeries) / 2;

  const toY = (val) => PAD_TOP + plotH - ((val - y_min) / (y_max - y_min)) * plotH;

  const yTicks = 5;
  const yStep = (y_max - y_min) / yTicks;

  return (
    <Svg width={BAR_CHART_W} height={CHART_H}>
      {/* Y-axis ticks & gridlines */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = y_min + i * yStep;
        const y = toY(val);
        return (
          <G key={i}>
            <Line x1={PAD_LEFT} y1={y} x2={BAR_CHART_W - PAD_RIGHT} y2={y}
              stroke={theme.border} strokeWidth={0.5} strokeDasharray="3,3" />
            <SvgText x={PAD_LEFT - 4} y={y + 4} fontSize={9} textAnchor="end"
              fill={theme.textSecondary}>
              {Math.round(val)}{y_unit}
            </SvgText>
          </G>
        );
      })}

      {/* Bars */}
      {series.map((s, si) =>
        x_axis.map((_, gi) => {
          const val = s.values[gi] ?? 0;
          const barH = ((val - y_min) / (y_max - y_min)) * plotH;
          const x = PAD_LEFT + gi * groupW + gap + si * barW;
          const y = toY(val);
          return (
            <G key={`${si}-${gi}`}>
              <Rect x={x} y={y} width={barW - 1} height={barH}
                fill={s.color || CHART_COLORS[si]} rx={2} />
              <SvgText x={x + barW / 2 - 0.5} y={y - 3} fontSize={7}
                textAnchor="middle" fill={s.color || CHART_COLORS[si]}>
                {val}{y_unit}
              </SvgText>
            </G>
          );
        })
      )}

      {/* X-axis labels */}
      {x_axis.map((label, i) => (
        <SvgText
          key={i}
          x={PAD_LEFT + i * groupW + groupW / 2}
          y={CHART_H - PAD_BOTTOM + 14}
          fontSize={9} textAnchor="middle" fill={theme.textSecondary}>
          {label}
        </SvgText>
      ))}

      {/* Axes */}
      <Line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={CHART_H - PAD_BOTTOM}
        stroke={theme.border} strokeWidth={1} />
      <Line x1={PAD_LEFT} y1={CHART_H - PAD_BOTTOM} x2={BAR_CHART_W - PAD_RIGHT}
        y2={CHART_H - PAD_BOTTOM} stroke={theme.border} strokeWidth={1} />
    </Svg>
  );
};

const LineChart = ({ data, theme }) => {
  const { series, x_axis, y_min = 0, y_max = 100, y_unit = '' } = data;
  const numPoints = x_axis.length;

  const toX = (i) => PAD_LEFT + (i / (numPoints - 1)) * plotW;
  const toY = (val) => PAD_TOP + plotH - ((val - y_min) / (y_max - y_min)) * plotH;

  const yTicks = 5;
  const yStep = (y_max - y_min) / yTicks;

  return (
    <Svg width={BAR_CHART_W} height={CHART_H}>
      {/* Gridlines */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = y_min + i * yStep;
        const y = toY(val);
        return (
          <G key={i}>
            <Line x1={PAD_LEFT} y1={y} x2={BAR_CHART_W - PAD_RIGHT} y2={y}
              stroke={theme.border} strokeWidth={0.5} strokeDasharray="3,3" />
            <SvgText x={PAD_LEFT - 4} y={y + 4} fontSize={9} textAnchor="end"
              fill={theme.textSecondary}>
              {Math.round(val)}{y_unit}
            </SvgText>
          </G>
        );
      })}

      {/* Lines + dots */}
      {series.map((s, si) => {
        const color = s.color || CHART_COLORS[si];
        const points = s.values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
        return (
          <G key={si}>
            <Polyline points={points} fill="none" stroke={color} strokeWidth={2} />
            {s.values.map((v, i) => (
              <Circle key={i} cx={toX(i)} cy={toY(v)} r={3} fill={color} />
            ))}
          </G>
        );
      })}

      {/* X labels */}
      {x_axis.map((label, i) => (
        <SvgText key={i} x={toX(i)} y={CHART_H - PAD_BOTTOM + 14}
          fontSize={9} textAnchor="middle" fill={theme.textSecondary}>
          {label}
        </SvgText>
      ))}

      {/* Axes */}
      <Line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={CHART_H - PAD_BOTTOM}
        stroke={theme.border} strokeWidth={1} />
      <Line x1={PAD_LEFT} y1={CHART_H - PAD_BOTTOM} x2={BAR_CHART_W - PAD_RIGHT}
        y2={CHART_H - PAD_BOTTOM} stroke={theme.border} strokeWidth={1} />
    </Svg>
  );
};

const Legend = ({ series }) => (
  <View style={styles.legend}>
    {series.map((s, i) => (
      <View key={i} style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: s.color || CHART_COLORS[i] }]} />
        <Text style={styles.legendLabel}>{s.label}</Text>
      </View>
    ))}
  </View>
);

const ChartRenderer = ({ chartData, theme }) => {
  if (!chartData) return null;

  const { type = 'bar', title, y_label, x_label, series = [] } = chartData;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundAlt, borderColor: theme.border }]}>
      {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : null}

      {y_label ? (
        <Text style={[styles.axisLabel, { color: theme.textSecondary }]}>{y_label}</Text>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {type === 'bar' && <BarChart data={chartData} theme={theme} />}
        {type === 'line' && <LineChart data={chartData} theme={theme} />}
      </ScrollView>

      {x_label ? (
        <Text style={[styles.xLabel, { color: theme.textSecondary }]}>{x_label}</Text>
      ) : null}

      <Legend series={series} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16,
  },
  title: { fontSize: 12, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  axisLabel: { fontSize: 10, marginBottom: 4, textAlign: 'left' },
  xLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: '#888' },
});

export default ChartRenderer;
