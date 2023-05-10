const CellStates = require("../Organism/Cell/CellStates");
let FossilRecord = undefined; // workaround to a circular dependency problem
const getFossilRecord = () => {
    if (!FossilRecord) FossilRecord = require("./FossilRecord");
    return FossilRecord;
};

const repr = new Map([
    [CellStates.producer, "p"],
    [CellStates.mouth, "o"],
    [CellStates.mover, "m"],
    [CellStates.eye, "e"],
    [CellStates.killer, "k"],
    [CellStates.armor, "a"],
]);

class Species {
    constructor(anatomy, ancestor, start_tick) {
        this.anatomy = anatomy;
        this.ancestor = ancestor; // eventually need to garbage collect ancestors to avoid memory problems
        this.population = 1;
        this.cumulative_pop = 1;
        this.start_tick = start_tick;
        this.end_tick = -1;
        this.name = Object.keys(this.anatomy.grid)
            .sort()
            .map((xy) => `${repr.get(this.anatomy.grid[xy].state)}[${xy}]`)
            .join("");
        this.extinct = false;
        this.calcAnatomyDetails();
    }

    calcAnatomyDetails() {
        if (!this.anatomy) return;
        const cell_counts = {};
        for (const c of CellStates.living) {
            cell_counts[c.name] = 0;
        }
        for (const cell of this.anatomy.cells) {
            cell_counts[cell.state.name] += 1;
        }
        this.cell_counts = cell_counts;
    }

    addPop() {
        this.population++;
        this.cumulative_pop++;
    }

    decreasePop() {
        this.population--;
        if (this.population <= 0) {
            this.extinct = true;
            getFossilRecord().fossilize(this);
        }
    }

    lifespan() {
        return this.end_tick - this.start_tick;
    }
}

module.exports = Species;
