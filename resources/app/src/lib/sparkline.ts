const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 100;
const TOP_INSET = 4;

interface SparklineGeometry {
    line: string;
    area: string;
}

const round = (value: number): number => Math.round(value * 1000) / 1000;

const monotoneSlopes = (values: number[]): number[] => {
    if (values.length < 2) {
        return values.map(() => 0);
    }

    const deltas: number[] = [];
    for (let index = 0; index < values.length - 1; index += 1) {
        deltas.push((values[index + 1] ?? 0) - (values[index] ?? 0));
    }

    return values.map((_, index) => {
        const previous = deltas[index - 1];
        const next = deltas[index];

        if (previous === undefined) {
            return next ?? 0;
        }

        if (next === undefined) {
            return previous;
        }

        if (previous * next <= 0) {
            return 0;
        }

        const average = (previous + next) / 2;
        const limit = 3 * Math.min(Math.abs(previous), Math.abs(next));

        return Math.sign(average) * Math.min(Math.abs(average), limit);
    });
};

const buildSparkline = (values: number[], max: number): SparklineGeometry => {
    if (values.length === 0) {
        return { line: '', area: '' };
    }

    const span = Math.max(values.length - 1, 1);
    const step = VIEWBOX_WIDTH / span;
    const control = step / 3;
    const scale = max <= 0 ? 0 : (VIEWBOX_HEIGHT - TOP_INSET) / max;
    const points = values.map((value) => VIEWBOX_HEIGHT - value * scale);
    const slopes = monotoneSlopes(points);

    const pointAt = (index: number): number => points[index] ?? VIEWBOX_HEIGHT;
    const slopeAt = (index: number): number => slopes[index] ?? 0;

    let line = `M 0 ${round(pointAt(0))}`;
    for (let index = 1; index < points.length; index += 1) {
        const from = (index - 1) * step;
        const to = index * step;
        const fromControl = round(pointAt(index - 1) + slopeAt(index - 1) / 3);
        const toControl = round(pointAt(index) - slopeAt(index) / 3);

        const start = `${round(from + control)} ${fromControl}`;
        const end = `${round(to - control)} ${toControl}`;

        line += ` C ${start} ${end} ${round(to)} ${round(pointAt(index))}`;
    }

    const area = `${line} L ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT} L 0 ${VIEWBOX_HEIGHT} Z`;

    return { line, area };
};

export { buildSparkline, TOP_INSET, VIEWBOX_HEIGHT, VIEWBOX_WIDTH };
export type { SparklineGeometry };
