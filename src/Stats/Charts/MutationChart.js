const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class MutationChart extends ChartController {
    constructor() {
        super("Mutation Rate");
    }

    setData() {
        this.clear();
        this.data.push({
            type: "line",
            markerType: "none",
            color: "black",
            showInLegend: true,
            name: "pop1",
            legendText: "Average Mutation Rate",
            dataPoints: [],
        });
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        const t = FossilRecord.tick_record[i];
        const p = FossilRecord.av_mut_rates[i];
        this.data[0].dataPoints.push({ x: t, y: p });
    }
}

module.exports = MutationChart;
