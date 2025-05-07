const CellStates = require("../../Organism/Cell/CellStates");
const FossilRecord = require("../FossilRecord");
const ChartController = require("./ChartController");

class CellsChart extends ChartController {
    constructor() {
        super("Organism Size & composition");
    }

    setData() {
        this.clear();
        //this.mouth, this.producer, this.mover, this.killer, this.armor, this.eye
        for (const c of CellStates.living) {
            this.data.push({
                type: "stackedArea",
                showInLegend: true,
                markerType: "none",
                toolTipContent:
                    "<span style='\"'color: {color};'\"'><strong>{name}: </strong></span> {y}",
                color: c.color,
                name: c.name,
                dataPoints: [],
            });
        }
        this.addAllDataPoints();
    }

    addDataPoint(i) {
        const t = FossilRecord.tick_record[i];
        const data = FossilRecord.av_cell_counts[i];
        let j = 0;
        for (const name in data) {
            const count = data[name];
            this.data[j].dataPoints.push({ x: t, y: count });
            j++;
        }
    }
}

module.exports = CellsChart;
