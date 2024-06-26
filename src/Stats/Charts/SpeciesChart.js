const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class SpeciesChart extends ChartController {
    constructor() {
        super("Species");
    }

    setData() {
        this.clear();
        this.data.push({
            type: "area",
            color: "grey",
            markerType: "none",
            showInLegend: true,
            name: "spec",
            legendText: "Number of extant species",
            dataPoints: [],
        });
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        const t = FossilRecord.tick_record[i];
        const p = FossilRecord.species_counts[i];
        this.data[0].dataPoints.push({ x: t, y: p });
    }
}

module.exports = SpeciesChart;
