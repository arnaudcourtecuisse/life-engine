const CellStates = require("../Organism/Cell/CellStates");

class Species {
    constructor(name, anatomy, ancestor, start_tick) {
        this.name = name;
        this.anatomy = anatomy;
        this.ancestor = ancestor; // eventually need to garbage collect ancestors to avoid memory problems
        this.population = 1;
        this.cumulative_pop = 1;
        this.start_tick = start_tick;
        this.end_tick = -1;
        this.calcAnatomyDetails();
    }

    get extinct() {
        return this.population === 0;
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
    }

    lifespan() {
        return this.end_tick - this.start_tick;
    }
}

module.exports = Species;
