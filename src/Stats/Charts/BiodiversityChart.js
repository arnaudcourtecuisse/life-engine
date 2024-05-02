const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class SpeciesChart extends ChartController {
    constructor() {
        super("Biodiversity index", true);
    }

    setData() {
        this.clear();
        this.data.push({
            type: "line",
            color: "black",
            markerType: "none",
            showInLegend: true,
            name: "spec",
            legendText: "Biodiversity index",
            dataPoints: [],
        });
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        const t = FossilRecord.tick_record[i];
        const c = FossilRecord.species_counts[i] || 1;
        const p = FossilRecord.pop_counts[i] || 1;
        this.data[0].dataPoints.push({ x: t, y: c / p });
    }
}

module.exports = SpeciesChart;
